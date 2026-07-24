import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { computeEngagement, ENGAGEMENT_META, AT_RISK_STATUSES, type EngagementStatus } from "@/lib/crm/engagement";

export const dynamic = "force-dynamic";

export default async function DesengagementPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase.from("profiles").select("role, groups").eq("id", user.id).single();
  const meGroups = (me?.groups as string[] | null) ?? [];
  const isPastoralTeam = ["admin", "pasteur"].includes(me?.role ?? "") || meGroups.includes("suivi");
  if (!isPastoralTeam) redirect("/espace-membres");

  const admin = createAdminClient();
  const since90 = Date.now() - 90 * 24 * 3600 * 1000;

  // Membres suivis (congrégation validée) + toute l'activité, agrégée en JS
  const [membersRes, attendRes, interactRes] = await Promise.all([
    admin.from("profiles")
      .select("id, first_name, last_name, avatar_url, pastoral_stage, role")
      .eq("validated", true),
    admin.from("event_attendance").select("user_id, checked_in_at"),
    admin.from("member_interactions").select("member_id, occurred_at"),
  ]);

  const members = membersRes.data ?? [];

  // Agrégats par membre
  const lastAtt   = new Map<string, string>();
  const count90   = new Map<string, number>();
  for (const a of attendRes.data ?? []) {
    const uid = a.user_id as string;
    const at  = a.checked_in_at as string | null;
    if (!at) continue;
    if (!lastAtt.has(uid) || new Date(at) > new Date(lastAtt.get(uid)!)) lastAtt.set(uid, at);
    if (new Date(at).getTime() >= since90) count90.set(uid, (count90.get(uid) ?? 0) + 1);
  }
  const lastInt = new Map<string, string>();
  for (const it of interactRes.data ?? []) {
    const mid = it.member_id as string;
    const at  = it.occurred_at as string | null;
    if (!at) continue;
    if (!lastInt.has(mid) || new Date(at) > new Date(lastInt.get(mid)!)) lastInt.set(mid, at);
  }

  type ScoredMember = {
    id: string; name: string; initiale: string; avatar: string | null; stage: string | null;
    score: number; status: EngagementStatus; reason: string;
  };

  const scored: ScoredMember[] = members.map(m => {
    const eng = computeEngagement({
      lastAttendanceAt:   lastAtt.get(m.id as string) ?? null,
      attendanceCount90d: count90.get(m.id as string) ?? 0,
      lastInteractionAt:  lastInt.get(m.id as string) ?? null,
    });
    const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";
    return {
      id: m.id as string,
      name,
      initiale: (String(m.first_name ?? "?")[0] ?? "?").toUpperCase(),
      avatar: (m.avatar_url as string | null) ?? null,
      stage: (m.pastoral_stage as string | null) ?? null,
      score: eng.score, status: eng.status, reason: eng.reason,
    };
  });

  const atRisk = scored
    .filter(m => AT_RISK_STATUSES.includes(m.status))
    .sort((a, b) => a.score - b.score);

  const counts: Record<EngagementStatus, number> = { engage: 0, a_surveiller: 0, decrochage: 0, inactif: 0 };
  for (const m of scored) counts[m.status]++;

  return (
    <div className="max-w-3xl">
      <Link href="/espace-membres/crm" className="inline-flex items-center gap-1.5 text-sm text-arc-text3 hover:text-arc-navy mb-4 transition-colors">
        ← Retour CRM
      </Link>

      <h1 className="text-xl font-bold text-arc-navy mb-1">📊 Alertes de désengagement</h1>
      <p className="text-sm text-arc-text3 mb-5">Membres à recontacter en priorité, du plus à risque au moins à risque.</p>

      {/* Répartition */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {(Object.keys(ENGAGEMENT_META) as EngagementStatus[]).map(st => {
          const meta = ENGAGEMENT_META[st];
          return (
            <div key={st} className={`rounded-xl border p-3 text-center ${meta.cls}`}>
              <div className="text-lg font-bold">{counts[st]}</div>
              <div className="text-[10px] font-semibold">{meta.emoji} {meta.label}</div>
            </div>
          );
        })}
      </div>

      {atRisk.length === 0 ? (
        <p className="text-sm text-arc-text3 bg-green-50 border border-green-200 rounded-xl p-4">
          🎉 Aucun membre à risque détecté. Belle dynamique communautaire !
        </p>
      ) : (
        <div className="space-y-2">
          {atRisk.map(m => {
            const meta = ENGAGEMENT_META[m.status];
            return (
              <Link key={m.id} href={`/espace-membres/crm/${m.id}`}
                className="flex items-center gap-3 bg-white border border-arc-border rounded-xl p-3 hover:border-arc-navy transition-colors">
                <span className={`w-1.5 h-10 rounded-full flex-shrink-0 ${meta.dot}`} aria-hidden />
                {m.avatar ? (
                  <Image src={m.avatar} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-arc-bg flex items-center justify-center font-bold text-arc-navy flex-shrink-0">{m.initiale}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-arc-navy truncate">{m.name}</p>
                  <p className="text-[11px] text-arc-text3">{m.reason}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.cls}`}>{meta.label}</span>
                  <p className="text-[11px] font-bold text-arc-text3 mt-1">{m.score}/100</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
