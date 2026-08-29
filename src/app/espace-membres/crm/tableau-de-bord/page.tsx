import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import MemberSidebar from "@/components/espace-membres/MemberSidebar";
import MemberRightPanel from "@/components/espace-membres/MemberRightPanel";
import { getMemberShellData } from "@/components/espace-membres/shell-data";
import { computeEngagement, ENGAGEMENT_META, type EngagementStatus } from "@/lib/crm/engagement";
import { computeSla, isResolvedStatus } from "@/lib/crm/support";

export const dynamic = "force-dynamic";

const STAGE_META: Record<string, { label: string; dot: string }> = {
  visiteur:    { label: "Visiteur",    dot: "bg-gray-400"   },
  integration: { label: "Intégration", dot: "bg-amber-400"  },
  actif:       { label: "Membre actif",dot: "bg-green-500"  },
  formation:   { label: "Formation",   dot: "bg-blue-500"   },
  responsable: { label: "Responsable", dot: "bg-purple-500" },
};

function Bar({ label, value, max, dot }: { label: string; value: number; max: number; dot: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-arc-text3 w-24 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-4 bg-arc-bg rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${dot}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold text-arc-navy w-6 text-right flex-shrink-0">{value}</span>
    </div>
  );
}

export default async function CrmDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase.from("profiles").select("role, groups").eq("id", user.id).single();
  const meGroups = (me?.groups as string[] | null) ?? [];
  const isPastoralTeam = ["admin", "pasteur"].includes(me?.role ?? "") || meGroups.includes("suivi");
  if (!isPastoralTeam) redirect("/espace-membres");

  const admin = createAdminClient();
  const now = Date.now();
  const since30 = new Date(now - 30 * 24 * 3600 * 1000).toISOString();
  const since90 = now - 90 * 24 * 3600 * 1000;

  const [profRes, attRes, intRes, taskRes, grieRes] = await Promise.all([
    admin.from("profiles").select("id, role, validated, pastoral_stage"),
    admin.from("event_attendance").select("user_id, checked_in_at"),
    admin.from("member_interactions").select("type, occurred_at"),
    admin.from("pastoral_tasks").select("status, due_date, completed_at"),
    admin.from("grievances").select("status, priority, created_at, satisfaction"),
  ]);

  const profiles = profRes.data ?? [];
  const members = profiles.filter(p => p.validated);
  const roleCounts: Record<string, number> = {};
  const stageCounts: Record<string, number> = {};
  for (const p of profiles) roleCounts[p.role as string] = (roleCounts[p.role as string] ?? 0) + 1;
  for (const m of members) {
    const s = (m.pastoral_stage as string | null) ?? "visiteur";
    stageCounts[s] = (stageCounts[s] ?? 0) + 1;
  }

  // Engagement des membres
  const lastAtt = new Map<string, string>(); const count90 = new Map<string, number>();
  for (const a of attRes.data ?? []) {
    const uid = a.user_id as string; const at = a.checked_in_at as string | null;
    if (!at) continue;
    if (!lastAtt.has(uid) || new Date(at) > new Date(lastAtt.get(uid)!)) lastAtt.set(uid, at);
    if (new Date(at).getTime() >= since90) count90.set(uid, (count90.get(uid) ?? 0) + 1);
  }
  const engCounts: Record<EngagementStatus, number> = { engage: 0, a_surveiller: 0, decrochage: 0, inactif: 0 };
  for (const m of members) {
    const st = computeEngagement({
      lastAttendanceAt: lastAtt.get(m.id as string) ?? null,
      attendanceCount90d: count90.get(m.id as string) ?? 0,
    }).status;
    engCounts[st]++;
  }

  // Interactions (30 j) par type
  const interactions30 = (intRes.data ?? []).filter(i => (i.occurred_at as string) >= since30);
  const intByType: Record<string, number> = {};
  for (const i of interactions30) intByType[i.type as string] = (intByType[i.type as string] ?? 0) + 1;

  // Tâches
  const tasks = taskRes.data ?? [];
  const tasksTodo = tasks.filter(t => t.status === "todo");
  const tasksOverdue = tasksTodo.filter(t => t.due_date && new Date(t.due_date as string + "T00:00:00").getTime() < now);
  const tasksDone30 = tasks.filter(t => t.status === "done" && t.completed_at && (t.completed_at as string) >= since30);

  // Support
  const grievances = grieRes.data ?? [];
  const grieOpen = grievances.filter(g => !isResolvedStatus(g.status as string));
  const grieResolved = grievances.filter(g => isResolvedStatus(g.status as string));
  const grieBreached = grieOpen.filter(g => computeSla(g.created_at as string, g.priority as string, g.status as string).breached);
  const rated = grievances.filter(g => g.satisfaction != null);
  const csatAvg = rated.length ? (rated.reduce((s, g) => s + (g.satisfaction as number), 0) / rated.length) : null;

  const maxStage = Math.max(1, ...Object.values(stageCounts));
  const maxEng = Math.max(1, ...Object.values(engCounts));
  const maxInt = Math.max(1, ...Object.values(intByType));

  const INT_LABELS: Record<string, string> = { appel: "📞 Appels", visite: "🏠 Visites", email: "✉️ Emails", whatsapp: "💬 WhatsApp", sms: "📱 SMS", rencontre: "🤝 Rencontres", autre: "• Autres" };

  const shell = await getMemberShellData(user.id);

  return (
    <>
    <MemberSidebar perms={shell.sidebarPerms} user={shell.sidebarUser} membresValides={shell.rp.membresValides} />
    <MemberRightPanel {...shell.rp} />
    <div className="min-[821px]:ml-[220px] min-[1280px]:mr-[264px] max-w-[1200px] px-4 md:px-6 pt-6 pb-24">
      <h1 className="text-[36px] md:text-[44px] leading-tight font-bold text-[#000666] tracking-tight" style={{ fontFamily: '"Playfair Display", serif' }}>Tableau de bord pastoral</h1>
      <p className="text-[#454652] mt-1 mb-8">Vue d&apos;ensemble de la vie de la communauté.</p>

      {/* KPIs — charte Sacred Modernity (label + grand nombre + icône) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Membres validés", val: members.length, cls: "text-arc-navy", icon: "👥" },
          { label: "À recontacter", val: engCounts.decrochage + engCounts.inactif, cls: "text-red-600", icon: "📵" },
          { label: "Tâches en retard", val: tasksOverdue.length, cls: "text-orange-600", icon: "⏰" },
          { label: "Doléances ouvertes", val: grieOpen.length, cls: "text-amber-600", icon: "🛠️" },
        ].map(k => (
          <div key={k.label} className="bg-white border border-arc-border rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-arc-text3">{k.label}</span>
              <span className="text-base leading-none opacity-80" aria-hidden="true">{k.icon}</span>
            </div>
            <div className={`text-3xl font-bold font-serif mt-2 ${k.cls}`}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pipeline */}
        <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
          <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-3">🌱 Pipeline pastoral</h2>
          <div className="space-y-2">
            {Object.keys(STAGE_META).map(s => (
              <Bar key={s} label={STAGE_META[s].label} value={stageCounts[s] ?? 0} max={maxStage} dot={STAGE_META[s].dot} />
            ))}
          </div>
        </div>

        {/* Engagement */}
        <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
          <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-3">📊 Engagement</h2>
          <div className="space-y-2">
            {(Object.keys(ENGAGEMENT_META) as EngagementStatus[]).map(st => (
              <Bar key={st} label={ENGAGEMENT_META[st].label} value={engCounts[st]} max={maxEng} dot={ENGAGEMENT_META[st].dot} />
            ))}
          </div>
          <Link href="/espace-membres/crm/desengagement" className="text-[11px] font-semibold text-arc-blue hover:underline mt-3 inline-block">Voir les alertes →</Link>
        </div>

        {/* Interactions 30j */}
        <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
          <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-1">📇 Interactions (30 j)</h2>
          <p className="text-[11px] text-arc-text3 mb-3">{interactions30.length} contact{interactions30.length !== 1 ? "s" : ""} enregistré{interactions30.length !== 1 ? "s" : ""}</p>
          {Object.keys(intByType).length === 0 ? (
            <p className="text-sm text-arc-text3">Aucune interaction ce mois-ci.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(intByType).sort((a, b) => b[1] - a[1]).map(([t, v]) => (
                <Bar key={t} label={INT_LABELS[t] ?? t} value={v} max={maxInt} dot="bg-indigo-400" />
              ))}
            </div>
          )}
        </div>

        {/* Tâches + Support */}
        <div className="space-y-4">
          <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
            <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-3">🗓️ Tâches de suivi</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="text-2xl font-bold text-arc-navy">{tasksTodo.length}</div><div className="text-[10px] text-arc-text3">À faire</div></div>
              <div><div className="text-2xl font-bold text-orange-600">{tasksOverdue.length}</div><div className="text-[10px] text-arc-text3">En retard</div></div>
              <div><div className="text-2xl font-bold text-green-600">{tasksDone30.length}</div><div className="text-[10px] text-arc-text3">Faites (30j)</div></div>
            </div>
          </div>
          <div className="bg-white border border-[#c6c5d4]/40 rounded-xl shadow-[0_4px_12px_rgba(26,35,126,0.05)] p-5">
            <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-[19px] font-semibold text-[#000666] mb-3">🛠️ Support</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="text-2xl font-bold text-amber-600">{grieOpen.length}</div><div className="text-[10px] text-arc-text3">Ouvertes</div></div>
              <div><div className="text-2xl font-bold text-red-600">{grieBreached.length}</div><div className="text-[10px] text-arc-text3">SLA dépassé</div></div>
              <div><div className="text-2xl font-bold text-arc-navy">{csatAvg != null ? csatAvg.toFixed(1) : "—"}</div><div className="text-[10px] text-arc-text3">CSAT /5</div></div>
            </div>
            <p className="text-[11px] text-arc-text3 mt-2">{grieResolved.length} résolue{grieResolved.length !== 1 ? "s" : ""} au total{rated.length ? ` · ${rated.length} avis` : ""}.</p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
