import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthorizedMailboxes, FUNCTION_MAILBOXES, CONTACT_MAILBOX } from "@/lib/mail/mailbox-config";
import { forwardMessage } from "@/lib/mail/graph-client";

// Toutes les boîtes de destination valides pour un transfert
const ALL_VALID_DESTINATIONS = new Set([
  CONTACT_MAILBOX,
  ...Object.values(FUNCTION_MAILBOXES),
]);

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role, groups").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });

  const body = await req.json().catch(() => null);
  // body: { box, id, toAddresses: string[], comment }
  if (!body?.box || !body?.id || !Array.isArray(body?.toAddresses) || body.toAddresses.length === 0)
    return NextResponse.json({ error: "Champs manquants: box, id, toAddresses" }, { status: 400 });

  const authorized = getAuthorizedMailboxes(profile.role, profile.groups ?? []);
  if (!authorized.includes(body.box))
    return NextResponse.json({ error: "Accès refusé à la boîte source" }, { status: 403 });

  // Valider que les destinations sont des boîtes ARC connues
  for (const addr of body.toAddresses as string[]) {
    if (!ALL_VALID_DESTINATIONS.has(addr))
      return NextResponse.json({ error: `Destination invalide: ${addr}` }, { status: 400 });
  }

  try {
    await forwardMessage(body.box, body.id, body.toAddresses, body.comment ?? "");
    return NextResponse.json({ success: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: "Erreur Graph API", detail }, { status: 502 });
  }
}
