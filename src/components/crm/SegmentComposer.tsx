"use client";

import { useFormState, useFormStatus } from "react-dom";
import { sendSegmentEmail } from "@/lib/actions/crm-communication";
import type { SegmentFilters, SendSegmentResult } from "@/lib/crm/segment";

function SubmitButton({ recipientCount }: { recipientCount: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || recipientCount === 0}
      className="px-5 py-2.5 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "Envoi en cours…" : `Envoyer à ${recipientCount} destinataire${recipientCount !== 1 ? "s" : ""}`}
    </button>
  );
}

export default function SegmentComposer({
  filters, recipientCount, noEmail,
}: {
  filters: SegmentFilters;
  recipientCount: number;
  noEmail: number;
}) {
  const [state, formAction] = useFormState<SendSegmentResult | null, FormData>(sendSegmentEmail, null);

  return (
    <form action={formAction} className="space-y-3">
      {/* Filtres du segment (autorité serveur = re-résolus à l'envoi) */}
      {filters.q          && <input type="hidden" name="q"          value={filters.q} />}
      {filters.stage      && <input type="hidden" name="stage"      value={filters.stage} />}
      {filters.tag        && <input type="hidden" name="tag"        value={filters.tag} />}
      {filters.group      && <input type="hidden" name="group"      value={filters.group} />}
      {filters.engagement && <input type="hidden" name="engagement" value={filters.engagement} />}

      <div>
        <label className="text-[11px] font-bold text-arc-text3 uppercase tracking-wider">Objet</label>
        <input
          name="subject" required maxLength={200}
          placeholder="Ex : Invitation à la réunion de prière de mercredi"
          className="mt-1 w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors"
        />
      </div>

      <div>
        <label className="text-[11px] font-bold text-arc-text3 uppercase tracking-wider">Message</label>
        <textarea
          name="body" required maxLength={5000} rows={9}
          placeholder={"Bonjour {prenom},\n\nNous serions heureux de te voir…\n\nAvec amour,\nL'équipe de l'ARC Église"}
          className="mt-1 w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy resize-none transition-colors font-sans"
        />
        <p className="text-[11px] text-arc-text3 mt-1">
          Astuce : <code className="bg-arc-bg px-1 rounded">{"{prenom}"}</code> est remplacé par le prénom de chaque membre. Envoi individuel (aucun destinataire n&apos;est visible des autres).
        </p>
      </div>

      {noEmail > 0 && (
        <p className="text-[11px] text-amber-600">⚠️ {noEmail} membre{noEmail !== 1 ? "s" : ""} du segment sans email seront ignorés.</p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <SubmitButton recipientCount={recipientCount} />

        {state?.error && (
          <span className="text-sm font-semibold text-red-600">❌ {state.error}</span>
        )}
        {state?.success && (
          <span className="text-sm font-semibold text-green-600">
            ✅ {state.sent} email{state.sent !== 1 ? "s" : ""} envoyé{state.sent !== 1 ? "s" : ""}
            {state.failed ? ` · ${state.failed} échec${state.failed !== 1 ? "s" : ""}` : ""}.
          </span>
        )}
      </div>
    </form>
  );
}
