import { createClient }       from "@/lib/supabase/server";
import { updateSiteSettings } from "@/lib/actions/cms";
import { redirect }           from "next/navigation";

async function handleUpdate(formData: FormData): Promise<void> {
  "use server";
  const result = await updateSiteSettings(formData);
  if (result?.error) redirect(`/admin/site?error=${encodeURIComponent(result.error)}`);
  else redirect("/admin/site?saved=1");
}

const KEYS = [
  "verset_du_jour", "verset_reference", "hero_subtitle",
  "culte_1_label", "culte_2_label", "culte_3_label",
  "contact_address", "contact_email", "contact_horaires", "contact_map_url",
  "social_facebook", "social_instagram", "social_youtube", "social_whatsapp",
  "histoire_p1", "histoire_p2", "histoire_citation",
  "votre_impact_intro",
  "decouvrir_1_text", "decouvrir_2_text", "decouvrir_3_text", "decouvrir_4_text",
  "stats_nations", "stats_touches",
  "announcement_enabled", "announcement_welcome",
  "announcement_show_schedules", "announcement_show_events", "announcement_show_verset",
  "verset_mode", "verset_auto_interval",
] as const;

export default async function AdminSitePage({
  searchParams,
}: {
  searchParams?: { saved?: string; error?: string };
}) {
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

      {searchParams?.saved && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
          ✅ Modifications enregistrées. Le site est mis à jour.
        </div>
      )}
      {searchParams?.error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          ⚠️ Erreur : {decodeURIComponent(searchParams.error)}
        </div>
      )}

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

        {/* ── Notre histoire ── */}
        <form action={handleUpdate} className="bg-white rounded-2xl border border-arc-border p-6">
          <h2 className="font-bold text-arc-navy mb-1 flex items-center gap-2">📖 Notre histoire</h2>
          <p className="text-xs text-arc-text3 mb-4">Textes de la section &ldquo;Notre histoire&rdquo; sur la page d&apos;accueil.</p>
          <div className="flex flex-col gap-4">
            <Field name="histoire_p1" label="Paragraphe 1 (fondation)" defaultValue={v("histoire_p1")} textarea />
            <Field name="histoire_p2" label="Paragraphe 2 (vision)" defaultValue={v("histoire_p2")} textarea />
            <Field name="histoire_citation" label="Citation / blockquote" defaultValue={v("histoire_citation")} textarea />
          </div>
          <SaveBtn />
        </form>

        {/* ── Découvrir ── */}
        <form action={handleUpdate} className="bg-white rounded-2xl border border-arc-border p-6">
          <h2 className="font-bold text-arc-navy mb-1 flex items-center gap-2">✦ Découvrir — textes des cartes</h2>
          <p className="text-xs text-arc-text3 mb-4">Descriptions des 4 cartes de la section &ldquo;Découvrir&rdquo;.</p>
          <div className="flex flex-col gap-4">
            <Field name="decouvrir_1_text" label="Carte 1 — Sermons & Replays"     defaultValue={v("decouvrir_1_text")} />
            <Field name="decouvrir_2_text" label="Carte 2 — Rejoindre la famille"  defaultValue={v("decouvrir_2_text")} />
            <Field name="decouvrir_3_text" label="Carte 3 — Événements & Cultes"   defaultValue={v("decouvrir_3_text")} />
            <Field name="decouvrir_4_text" label="Carte 4 — Soutenir l'Église"     defaultValue={v("decouvrir_4_text")} />
          </div>
          <SaveBtn />
        </form>

        {/* ── Votre impact ── */}
        <form action={handleUpdate} className="bg-white rounded-2xl border border-arc-border p-6">
          <h2 className="font-bold text-arc-navy mb-1 flex items-center gap-2">💛 Votre impact</h2>
          <p className="text-xs text-arc-text3 mb-4">Introduction de la section &ldquo;Votre impact&rdquo; (dons).</p>
          <Field name="votre_impact_intro" label="Texte d'introduction" defaultValue={v("votre_impact_intro")} textarea />
          <SaveBtn />
        </form>

        {/* ── Bannière d'annonce ── */}
        <form action={handleUpdate} className="bg-white rounded-2xl border border-arc-border p-6">
          <h2 className="font-bold text-arc-navy mb-1 flex items-center gap-2">📣 Bannière d&apos;annonce (défilante)</h2>
          <p className="text-xs text-arc-text3 mb-4">
            Bande défilante tout en haut du site vitrine. Le message de bienvenue et les éléments affichés sont entièrement personnalisables.
            Accessible également depuis l&apos;Espace Membres (Média · Communication · Support · Admin).
          </p>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-arc-bg border border-arc-border">
              <label className="text-sm font-semibold text-arc-navy" htmlFor="announcement_enabled">Afficher la bannière</label>
              <select name="announcement_enabled" id="announcement_enabled" defaultValue={v("announcement_enabled") || "true"} className="px-3 py-1.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy bg-white">
                <option value="true">Oui — bannière visible</option>
                <option value="false">Non — bannière masquée</option>
              </select>
            </div>
            <Field name="announcement_welcome" label="Message de bienvenue" placeholder="Bienvenue à l'ARC — venez tels que vous êtes" defaultValue={v("announcement_welcome")} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {([
                ["announcement_show_schedules","Horaires des cultes"],
                ["announcement_show_events",   "Prochains événements"],
                ["announcement_show_verset",   "Verset du jour"],
              ] as [string,string][]).map(([k,l]) => (
                <div key={k} className="flex items-center justify-between p-3 rounded-xl bg-arc-bg border border-arc-border">
                  <label className="text-xs font-semibold text-arc-navy" htmlFor={k}>{l}</label>
                  <select name={k} id={k} defaultValue={v(k) || "true"} className="px-2 py-1 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy bg-white">
                    <option value="true">Affiché</option>
                    <option value="false">Masqué</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
          <SaveBtn />
        </form>

        {/* ── Statistiques ── */}
        <form action={handleUpdate} className="bg-white rounded-2xl border border-arc-border p-6">
          <h2 className="font-bold text-arc-navy mb-1 flex items-center gap-2">📊 Statistiques héro</h2>
          <p className="text-xs text-arc-text3 mb-4">
            &ldquo;Membres&rdquo; est calculé automatiquement depuis la base (comptes validés).
            &ldquo;Ans d&apos;histoire&rdquo; se calcule depuis 2018. Renseignez les deux valeurs éditables ci-dessous.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field name="stats_nations" label="Nations représentées" placeholder="ex: 32" defaultValue={v("stats_nations")} />
            <Field name="stats_touches" label="Personnes touchées" placeholder="ex: 600+" defaultValue={v("stats_touches")} />
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
