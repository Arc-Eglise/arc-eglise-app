import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import MemberSidebar from "@/components/espace-membres/MemberSidebar";
import MemberRightPanel from "@/components/espace-membres/MemberRightPanel";
import { getMemberShellData } from "@/components/espace-membres/shell-data";

export const dynamic = "force-dynamic";

interface Donation {
  id: string;
  amount_cents: number;
  currency: string;
  donor_email: string | null;
  donor_name: string | null;
  status: string;
  created_at: string;
}

const money = (cents: number, currency = "chf") =>
  new Intl.NumberFormat("fr-CH", { style: "currency", currency: currency.toUpperCase() })
    .format(cents / 100);

export default async function DonsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase.from("profiles").select("role, groups").eq("id", user.id).single();
  const meGroups = (me?.groups as string[] | null) ?? [];
  // Finances = encadrement financier : admin | pasteur | fonction "finance"
  const canFinance = ["admin", "pasteur"].includes(me?.role ?? "") || meGroups.includes("finance");
  if (!canFinance) redirect("/espace-membres/crm");

  // Données réelles : la table donations est alimentée par le webhook Stripe.
  const admin = createAdminClient();
  const { data: donationsData } = await admin
    .from("donations")
    .select("id, amount_cents, currency, donor_email, donor_name, status, created_at")
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  const donations = (donationsData ?? []) as Donation[];
  const currency = donations[0]?.currency ?? "chf";

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const total = donations.reduce((s, d) => s + d.amount_cents, 0);
  const count = donations.length;
  const avg = count > 0 ? Math.round(total / count) : 0;
  const thisMonth = donations
    .filter(d => d.created_at >= startOfMonth)
    .reduce((s, d) => s + d.amount_cents, 0);

  // Évolution sur 8 mois (montants réels par mois)
  const months: { key: string; label: string; total: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("fr-CH", { month: "short" }),
      total: 0,
    });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  for (const d of donations) {
    const dt = new Date(d.created_at);
    const k = `${dt.getFullYear()}-${dt.getMonth()}`;
    const idx = monthIndex.get(k);
    if (idx !== undefined) months[idx]!.total += d.amount_cents;
  }
  const maxMonth = Math.max(1, ...months.map(m => m.total));

  const KPIS = [
    { label: "Total des dons", val: money(total, currency), icon: "💶" },
    { label: "Ce mois-ci", val: money(thisMonth, currency), icon: "📅" },
    { label: "Nombre de dons", val: String(count), icon: "🧾" },
    { label: "Don moyen", val: money(avg, currency), icon: "📊" },
  ];

  const shell = await getMemberShellData(user.id);

  return (
    <>
    <MemberSidebar perms={shell.sidebarPerms} user={shell.sidebarUser} membresValides={shell.rp.membresValides} />
    <MemberRightPanel {...shell.rp} />
    <div className="min-[821px]:ml-[220px] min-[1280px]:mr-[264px] max-w-[1200px] px-4 md:px-6 pt-6 pb-24">
      <div className="mb-8">
        <h1 className="text-[32px] md:text-[40px] leading-tight font-bold text-[#000666] tracking-tight" style={{ fontFamily: '"Playfair Display", serif' }}>Dons &amp; Finances</h1>
        <p className="text-[#454652] mt-1">Suivi des offrandes reçues (données Stripe).</p>
      </div>

      {/* KPIs — charte Sacred Modernity */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {KPIS.map(k => (
          <div key={k.label} className="bg-white border border-arc-border rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-arc-text3">{k.label}</span>
              <span className="text-base leading-none opacity-80" aria-hidden="true">{k.icon}</span>
            </div>
            <div className="text-2xl font-bold font-serif mt-2 text-arc-navy">{k.val}</div>
          </div>
        ))}
      </div>

      {/* Évolution mensuelle — vraies données */}
      <div className="bg-white border border-arc-border rounded-xl p-5 shadow-sm mb-6">
        <h2 className="font-serif text-lg text-arc-navy mb-4">Évolution des offrandes (8 mois)</h2>
        {total === 0 ? (
          <p className="text-sm text-arc-text3">Aucun don enregistré pour le moment.</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {months.map(m => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end justify-center" style={{ height: "128px" }}>
                  <div
                    className="w-full max-w-[36px] rounded-t-md bg-arc-blue/70"
                    style={{ height: `${Math.max(2, Math.round((m.total / maxMonth) * 128))}px` }}
                    title={money(m.total, currency)}
                  />
                </div>
                <span className="text-[10px] text-arc-text3 capitalize">{m.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Liste des dons — vraies données */}
      <div className="bg-white border border-arc-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-arc-border">
          <h2 className="font-serif text-lg text-arc-navy">Derniers dons</h2>
        </div>
        {donations.length === 0 ? (
          <div className="px-5 py-10 text-center text-arc-text3 text-sm">Aucun don enregistré.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 520 }}>
              <thead>
                <tr className="bg-arc-bg text-[11px] font-bold text-arc-text3 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Donateur</th>
                  <th className="px-5 py-3 text-left">Montant</th>
                  <th className="px-5 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {donations.slice(0, 100).map((d, i) => (
                  <tr key={d.id} className={i % 2 === 0 ? "bg-white" : "bg-arc-bg/40"}>
                    <td className="px-5 py-3 border-b border-arc-border/50">
                      <div className="text-sm font-semibold text-arc-navy">{d.donor_name || "Anonyme"}</div>
                      {d.donor_email && <div className="text-[11px] text-arc-text3">{d.donor_email}</div>}
                    </td>
                    <td className="px-5 py-3 border-b border-arc-border/50 text-sm font-bold text-green-700">
                      {money(d.amount_cents, d.currency)}
                    </td>
                    <td className="px-5 py-3 border-b border-arc-border/50 text-sm text-arc-text2">
                      {new Date(d.created_at).toLocaleDateString("fr-CH", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
