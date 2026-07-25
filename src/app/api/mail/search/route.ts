import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthorizedMailboxes, getMailboxLabel } from "@/lib/mail/mailbox-config";
import { searchMessages } from "@/lib/mail/graph-client";

export const dynamic = "force-dynamic";

// Recherche d'e-mails par mot-clé, STRICTEMENT limitée aux boîtes que le membre
// est déjà autorisé à consulter (mêmes droits que le panneau Mail). Le contenu
// n'est jamais transmis à un LLM — cette route est appelée directement par le client.
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role, groups").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });

  const authorized = getAuthorizedMailboxes(profile.role, profile.groups ?? []);
  if (authorized.length === 0)
    return NextResponse.json({ error: "Tu n'as accès à aucune boîte mail." }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ error: "Recherche trop courte." }, { status: 400 });

  if (!process.env.GRAPH_TENANT_ID || !process.env.GRAPH_CLIENT_ID || !process.env.GRAPH_CLIENT_SECRET) {
    return NextResponse.json({ error: "Messagerie Microsoft non configurée." }, { status: 503 });
  }

  // Recherche en parallèle sur les boîtes autorisées (cap de sécurité).
  const boxes = authorized.slice(0, 10);
  const settled = await Promise.allSettled(boxes.map((box) => searchMessages(box, q, 5)));

  type Hit = { id: string; mailbox: string; mailboxLabel: string; subject: string; from: string; date: string; _ts: number };
  const results: Hit[] = [];
  settled.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    const box = boxes[i];
    for (const m of r.value.value ?? []) {
      results.push({
        id: m.id,
        mailbox: box,
        mailboxLabel: getMailboxLabel(box),
        subject: m.subject ?? "",
        from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || "—",
        date: new Date(m.receivedDateTime).toLocaleDateString("fr-CH", { day: "2-digit", month: "short", year: "numeric" }),
        _ts: new Date(m.receivedDateTime).getTime(),
      });
    }
  });

  results.sort((a, b) => b._ts - a._ts);
  return NextResponse.json({ results: results.slice(0, 12).map(({ _ts, ...r }) => { void _ts; return r; }) });
}
