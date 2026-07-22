"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChurchInfo } from "@/hooks/useChurchInfo";

export default function AdminChurchInfoPage() {
  const [churchInfo, setChurchInfo] = useState<ChurchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchChurchInfo();
  }, []);

  const fetchChurchInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("church_info")
        .select("*")
        .single();

      if (error) throw error;
      setChurchInfo(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ChurchInfo, value: any) => {
    if (churchInfo) {
      setChurchInfo({ ...churchInfo, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!churchInfo) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("church_info")
        .update({
          ...churchInfo,
          updated_at: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", churchInfo.id);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Chargement...</div>;
  if (!churchInfo) return <div className="p-8">Données non trouvées</div>;

  return (
    <div className="min-h-screen bg-arc-bg p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-4xl font-bold text-arc-navy mb-8">
          Infos Église
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-red-700">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 text-green-700">
            ✅ Informations mises à jour avec succès
          </div>
        )}

        <div className="bg-white rounded-xl border border-arc-border p-8 space-y-6">
          {/* IDENTITÉ */}
          <section>
            <h2 className="font-serif text-2xl font-bold text-arc-navy mb-4">
              Identité
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Nom de l'église
                </label>
                <input
                  type="text"
                  value={churchInfo.church_name}
                  onChange={(e) => handleChange("church_name", e.target.value)}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Acronyme
                </label>
                <input
                  type="text"
                  value={churchInfo.church_acronym}
                  onChange={(e) => handleChange("church_acronym", e.target.value)}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Description
                </label>
                <textarea
                  value={churchInfo.church_description}
                  onChange={(e) => handleChange("church_description", e.target.value)}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                  rows={3}
                />
              </div>
            </div>
          </section>

          {/* ADRESSE */}
          <section>
            <h2 className="font-serif text-2xl font-bold text-arc-navy mb-4">
              Localisation
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  value={churchInfo.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-arc-blue mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={churchInfo.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className="w-full px-4 py-2 border border-arc-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-arc-blue mb-1">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={churchInfo.postal_code}
                    onChange={(e) => handleChange("postal_code", e.target.value)}
                    className="w-full px-4 py-2 border border-arc-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-arc-blue mb-1">
                    Pays
                  </label>
                  <input
                    type="text"
                    value={churchInfo.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                    className="w-full px-4 py-2 border border-arc-border rounded-lg"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* HORAIRES */}
          <section>
            <h2 className="font-serif text-2xl font-bold text-arc-navy mb-4">
              Horaires
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Dimanche - Heure du culte
                </label>
                <input
                  type="time"
                  value={churchInfo.sunday_service_time}
                  onChange={(e) => handleChange("sunday_service_time", e.target.value)}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Mercredi - Heure
                </label>
                <input
                  type="time"
                  value={churchInfo.wednesday_time || ""}
                  onChange={(e) => handleChange("wednesday_time", e.target.value || null)}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Vendredi - Heure
                </label>
                <input
                  type="time"
                  value={churchInfo.friday_time || ""}
                  onChange={(e) => handleChange("friday_time", e.target.value || null)}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                />
              </div>
            </div>
          </section>

          {/* CONTACT */}
          <section>
            <h2 className="font-serif text-2xl font-bold text-arc-navy mb-4">
              Contact
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Email principal
                </label>
                <input
                  type="email"
                  value={churchInfo.main_email || ""}
                  onChange={(e) => handleChange("main_email", e.target.value || null)}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={churchInfo.main_phone || ""}
                  onChange={(e) => handleChange("main_phone", e.target.value || null)}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                />
              </div>
            </div>
          </section>

          {/* RÉSEAUX SOCIAUX */}
          <section>
            <h2 className="font-serif text-2xl font-bold text-arc-navy mb-4">
              Réseaux sociaux
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  YouTube
                </label>
                <input
                  type="url"
                  value={churchInfo.youtube_url || ""}
                  onChange={(e) => handleChange("youtube_url", e.target.value || null)}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Facebook
                </label>
                <input
                  type="url"
                  value={churchInfo.facebook_url || ""}
                  onChange={(e) => handleChange("facebook_url", e.target.value || null)}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Instagram
                </label>
                <input
                  type="url"
                  value={churchInfo.instagram_url || ""}
                  onChange={(e) => handleChange("instagram_url", e.target.value || null)}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                />
              </div>
            </div>
          </section>

          {/* STATISTIQUES */}
          <section>
            <h2 className="font-serif text-2xl font-bold text-arc-navy mb-4">
              Statistiques
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Nombre total de membres
                </label>
                <input
                  type="number"
                  value={churchInfo.total_members}
                  onChange={(e) => handleChange("total_members", parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Nombre de nations
                </label>
                <input
                  type="number"
                  value={churchInfo.total_nations}
                  onChange={(e) => handleChange("total_nations", parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Année de fondation
                </label>
                <input
                  type="number"
                  value={churchInfo.founded_year}
                  onChange={(e) => handleChange("founded_year", parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                />
              </div>
            </div>
          </section>

          {/* LEADERSHIP */}
          <section>
            <h2 className="font-serif text-2xl font-bold text-arc-navy mb-4">
              Leadership
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Nom du pasteur
                </label>
                <input
                  type="text"
                  value={churchInfo.pastor_name || ""}
                  onChange={(e) => handleChange("pastor_name", e.target.value || null)}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-arc-blue mb-1">
                  Citation
                </label>
                <textarea
                  value={churchInfo.pastor_quote || ""}
                  onChange={(e) => handleChange("pastor_quote", e.target.value || null)}
                  className="w-full px-4 py-2 border border-arc-border rounded-lg"
                  rows={3}
                />
              </div>
            </div>
          </section>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-arc-navy text-white font-bold hover:bg-arc-navy2 disabled:opacity-60 transition-all"
          >
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </div>
    </div>
  );
}
