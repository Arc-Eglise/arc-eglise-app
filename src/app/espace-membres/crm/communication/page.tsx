import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveSegment, hasSegmentFilter, type SegmentFilters } from "@/lib/crm/segment";
import { ENGAGEMENT_META, type EngagementStatus } from "@/lib/crm/engagement";
import SegmentComposer from "@/components/crm/SegmentComposer";

export const dynamic = "force-dynamic";

const STAGE_LABELS: Record<string, string> = {
  visiteur: "Visiteur", integration: "Intégration", actif: "Membre actif",
  formation: "Formation", responsable: "Responsable",
};

export default async function CommunicationPage({
  searchParams,
}: {
  searchParams?: SegmentFilters;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase.from("profiles").select("role, groups").eq("id", user.id).single();
  const meGroups = (me?.groups as string[] | null) ?? [];
  const canSend = ["admin", "pasteur"].includes(me?.role ?? "") || meGroups.includes("communication");
  if (!canSend) redirect("/espace-membres");

  const filters: SegmentFilters = {
    q:          searchParams?.q || undefined,
    stage:      searchParams?.stage || undefined,
    tag:        searchParams?.tag || undefined,
    group:      searchParams?.group || undefined,
    engagement: searchParams?.engagement || undefined,
  };

  const admin = createAdminClient();
  const members = await resolveSegment(admin, filters);
  const withEmail = members.filter(m => m.email && m.email.includes("@"));
  const noEmail = members.length - withEmail.length;

  const chips: string[] = [];
  if (filters.stage)      chips.push(`Étape : ${STAGE_LABELS[filters.stage] ?? filters.stage}`);
  if (filters.engagement) chips.push(`Engagement : ${ENGAGEMENT_META[filters.engagement as EngagementStatus]?.label ?? filters.engagement}`);
  if (filters.group)      chips.push(`Fonction : ${filters.group}`);
  if (filters.tag)        chips.push(`Tag : ${filters.tag}`);
  if (filters.q)          chips.push(`Recherche : ${filters.q}`);

  const backToSegment = "/espace-membres/crm" + (hasSegmentFilter(filters)
    ? "?" + new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString()
    : "");

  return (
    <div className="max-w-2xl">
      <Link href={backToSegment} className="inline-flex items-center gap-1.5 text-sm text-arc-text3 hover:text-arc-navy mb-4 transition-colors">
        ← Retour au segment
      </Link>

      <h1 className="text-xl font-bold text-arc-navy mb-1">✉️ Communication ciblée</h1>
      <p className="text-sm text-arc-text3 mb-5">Envoi depuis <strong>communication@arc-eglise.ch</strong>, individuellement à chaque membre du segment.</p>

      {/* Récap du segment */}
      <div className="bg-arc-bg border border-arc-border rounded-2xl p-4 mb-5">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-arc-blue">Segment ciblé</span>
          <span className="text-sm font-bold text-arc-navy">{withEmail.length} destinataire{withEmail.length !== 1 ? "s" : ""}</span>
        </div>
        {chips.length === 0 ? (
          <p className="text-sm text-arc-text2">Tous les membres validés{noEmail > 0 ? ` (${noEmail} sans email)` : ""}.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {chips.map(c => (
              <span key={c} className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white border border-arc-border text-arc-navy">{c}</span>
            ))}
          </div>
        )}
        {withEmail.length > 0 && (
          <p className="text-[11px] text-arc-text3 mt-2 truncate">
            {withEmail.slice(0, 8).map(m => [m.first_name, m.last_name].filter(Boolean).join(" ")).join(", ")}
            {withEmail.length > 8 ? ` +${withEmail.length - 8} autres` : ""}
          </p>
        )}
      </div>

      <div className="bg-white border border-arc-border rounded-2xl p-5">
        <SegmentComposer filters={filters} recipientCount={withEmail.length} noEmail={noEmail} />
      </div>
    </div>
  );
}
