import { NextRequest, NextResponse } from "next/server";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";

/**
 * Cible du webhook Supabase (trigger AFTER INSERT sur public.notifications).
 * Sécurisée par un secret partagé (header x-push-secret == PUSH_DISPATCH_SECRET).
 * Envoie la notification in-app correspondante en Web Push.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-push-secret");
  const expected = process.env.PUSH_DISPATCH_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.user_id || !body?.title) {
    return NextResponse.json({ error: "user_id et title requis" }, { status: 400 });
  }

  try {
    const res = await sendPushToUser(body.user_id as string, {
      title: body.title,
      body: body.body ?? null,
      link: body.link ?? null,
      type: body.type ?? null,
    });
    return NextResponse.json({ ok: true, ...res });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "erreur envoi push";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
