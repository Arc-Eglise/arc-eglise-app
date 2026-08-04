import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ADR-002 Phase 4 — dispatcher de rappels de tâches.
 * Déclenché par Vercel Cron (voir vercel.json). Idempotent : marque
 * `reminded_at` pour ne notifier qu'une fois. Chaque rappel passe par le
 * service unifié `notify.ts` (in-app + web push).
 *
 * Sécurité : si CRON_SECRET est défini, exige `Authorization: Bearer <secret>`.
 * Sinon, accepte l'en-tête `x-vercel-cron` (posé par Vercel Cron).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron") != null;
  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (!isVercelCron) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin
    .from("tasks")
    .select("id, owner_id, title, due_at")
    .not("remind_at", "is", null)
    .lte("remind_at", nowIso)
    .is("reminded_at", null)
    .neq("status", "termine")
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const t of due ?? []) {
    try {
      await notifyUser({
        userId: t.owner_id as string,
        type: "task",
        title: "⏰ Rappel de tâche",
        body: (t.title as string) || "Tu as une tâche à faire.",
        link: "/espace-membres/notes-taches?tab=taches",
      });
      await admin.from("tasks").update({ reminded_at: nowIso }).eq("id", t.id);
      sent++;
    } catch {
      // on continue : un échec isolé ne bloque pas les autres rappels
    }
  }

  return NextResponse.json({ ok: true, processed: (due ?? []).length, sent });
}
