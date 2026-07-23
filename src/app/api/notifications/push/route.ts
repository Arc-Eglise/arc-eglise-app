import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser, broadcastNotify } from "@/lib/notify";

export const runtime = "nodejs";

/**
 * Point d'entrée HTTP des notifications applicatives.
 * Délègue au service unifié (src/lib/notify.ts) : chaque notif écrit la ligne
 * in-app ET envoie le Web Push, en respectant les préférences utilisateur.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: "action requis" }, { status: 400 });

  // ── broadcast : à tous les membres validés (stream, annonce globale) ──
  if (body.action === "broadcast") {
    const { type, title, body: notifBody, link } = body as {
      type: string; title: string; body?: string; link?: string;
    };
    if (!type || !title) return NextResponse.json({ error: "type et title requis" }, { status: 400 });

    // Contrôle des droits d'émission d'un broadcast.
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role, groups")
      .eq("id", user.id)
      .single();
    const role = (profile?.role ?? "") as string;
    const groups = (profile?.groups ?? []) as string[];
    const allowed =
      ["admin", "pasteur"].includes(role) ||
      groups.some((g) => ["media", "communication", "support"].includes(g));
    if (!allowed) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const res = await broadcastNotify({
      type,
      title,
      body: notifBody ?? null,
      link: link ?? null,
      exclude: user.id,
    });
    return NextResponse.json({ ok: true, ...res });
  }

  // ── self : notif pour l'utilisateur lui-même ──
  if (body.action === "self") {
    const { type, title, body: notifBody, link, dedup_hours = 20 } = body as {
      type: string; title: string; body?: string; link?: string; dedup_hours?: number;
    };
    if (!type || !title) return NextResponse.json({ error: "type et title requis" }, { status: 400 });

    const res = await notifyUser({
      userId: user.id,
      type,
      title,
      body: notifBody ?? null,
      link: link ?? null,
      dedupHours: dedup_hours,
    });
    return NextResponse.json({ ok: true, ...res });
  }

  return NextResponse.json({ error: "action inconnue" }, { status: 400 });
}
