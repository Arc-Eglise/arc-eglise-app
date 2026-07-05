import { createClient }       from "@/lib/supabase/server";
import { updateSiteSettings } from "@/lib/actions/cms";

async function handleUpdate(formData: FormData): Promise<void> {
  "use server";
  await updateSiteSettings(formData);
}

const KEYS = [
  "verset_du_jour", "verset_reference", "hero_subtitle",
  "culte_1_label", "culte_2_label", "culte_3_label",
  "contact_address", "contact_email", "contact_horaires", "contact_map_url",
  "social_facebook", "social_instagram", "social_youtube", "social_whatsapp",
] as const;

export default async function AdminSitePage() {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", [...KEYS]);

  const settings: Record<string, string> = {};
  for (const row of rows ?? []) settings[row.key] = row.value;

  const v = (k: string) => settings[k] ?? "";

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">Site vitrine</h1>
        <p className="text-sm text-arc-text2 mt-0.5">Modifiez les textes et coordonnées affichés sur le site public.</p>
      </div>

      <div className="flex flex-col gap-6">

        {/* ── Accueil ── */}
        <form action={handleUpdate} className="bg-white rounded-2xl border border-arc-border p-6">
          <h2 className="font-bold text-arc-navy mb-4 flex items-center gap-2">🏠 Accueil</h2>
          <div className="flex flex-col gap-4">
            <Field name="hero_subtitle" label="Sous-titre héro" defaultValue={v("hero_subtitle")} />
            <Field name="verset_du_jour" label="Verset du jour" defaultValue={v("verset_du_jour")} textarea />
            <Field name="verset_reference" label="Référence du verset" placeholder="Jean 3:16" defaultValue={v("verset_reference")} />
          </div>
          <SaveBtn />
        </form>

        {/* ── Cultes ── */}
        <form action={handleUpdate} className="bg-white rounded-2xl border border-arc-border p-6">
          <h2 className="font-bold text-arc-navy mb-4 flex items-center gap-2">⛪ Horaires des cultes</h2>
          <div className="flex flex-col gap-4">
            <Field name="culte_1_label" label="Culte 1" placeholder="Dimanche 09h30 — Culte principal" defaultValue={v("culte_1_label")} />
            <Field name="culte_2_label" label="Culte 2" placeholder="Dimanche 17h00 — Culte du soir"   defaultValue={v("culte_2_label")} />
            <Field name="culte_3_label" label="Culte 3" placeholder="Mercredi 19h00 — Prière & Parole" defaultValue={v("culte_3_label")} />
          </div>
          <SaveBtn />
        </form>

        {/* ── Contact ── */}
        <form action={handleUpdate} className="bg-white rounded-2xl border border-arc-border p-6">
          <h2 className="font-bold text-arc-navy mb-4 flex items-center gap-2">📍 Coordonnées &amp; Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field name="contact_address" label="Adresse (multiligne)" defaultValue={v("contact_address")} textarea />
            <div className="flex flex-col gap-4">
              <Field name="contact_email"    label="Email de contact"           placeholder="contact@arc-eglise.ch" defaultValue={v("contact_email")} />
              <Field name="contact_horaires" label="Horaires des cultes (carte)" placeholder="Dimanche 09h30 & 17h00…" defaultValue={v("contact_horaires")} textarea />
              <Field name="contact_map_url"  label="URL Google Maps"            placeholder="https://maps.google.com/…" defaultValue={v("contact_map_url")} />
            </div>
          </div>
          <SaveBtn />
        </form>

        {/* ── Réseaux sociaux ── */}
        <form action={handleUpdate} className="bg-white rounded-2xl border border-arc-border p-6">
          <h2 className="font-bold text-arc-navy mb-4 flex items-center gap-2">🌐 Réseaux sociaux</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field name="social_facebook"  label="📘 Facebook"  placeholder="https://www.facebook.com/…" defaultValue={v("social_facebook")} />
            <Field name="social_instagram" label="📸 Instagram" placeholder="https://www.instagram.com/…" defaultValue={v("social_instagram")} />
            <Field name="social_youtube"   label="▶️ YouTube"   placeholder="https://www.youtube.com/…"  defaultValue={v("social_youtube")} />
            <Field name="social_whatsapp"  label="📱 WhatsApp"  placeholder="https://wa.me/41…"          defaultValue={v("social_whatsapp")} />
          </div>
          <SaveBtn />
        </form>

      </div>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue = "",
  placeholder = "",
  textarea = false,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  textarea?: boolean;
}) {
  const cls = "w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors bg-arc-bg focus:bg-white";
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">{label}</label>
      {textarea ? (
        <textarea name={name} rows={3} defaultValue={defaultValue} placeholder={placeholder} className={cls} />
      ) : (
        <input name={name} type="text" defaultValue={defaultValue} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

function SaveBtn() {
  return (
    <div className="mt-4 flex justify-end">
      <button
        type="submit"
        className="px-5 py-2 rounded-lg bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors"
      >
        ✅ Enregistrer
      </button>
    </div>
  );
}
