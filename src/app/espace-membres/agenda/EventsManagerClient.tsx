"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createEvent, updateEvent, deleteEvent } from "@/lib/actions/cms";

interface EventRow {
  id: string;
  title: string;
  date: string;
  time_start: string | null;
  time_end: string | null;
  location: string | null;
  description: string | null;
  tags: string[];
  capacity: number | null;
  price_chf: number;
  is_published: boolean;
  is_public: boolean;
  image_url: string | null;
  recurrence_type: string | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
}

const REC_LABELS: Record<string, string> = {
  none:       "Aucune",
  daily:      "Quotidien",
  weekly:     "Hebdomadaire",
  monthly:    "Mensuel",
  yearly:     "Annuel",
  indefinite: "Indéfiniment",
};

const DEFAULT_LOCATION = "Av. Charles-Naine 39, La Chaux-de-Fonds";

interface FormState {
  title: string;
  date: string;
  time_start: string;
  time_end: string;
  location: string;
  description: string;
  tags: string;
  capacity: string;
  price_chf: string;
  is_published: boolean;
  is_public: boolean;
  image_url: string;
  recurrence_type: string;
  recurrence_interval: string;
  recurrence_end_date: string;
}

const emptyForm = (): FormState => ({
  title: "",
  date: "",
  time_start: "09:30",
  time_end: "",
  location: DEFAULT_LOCATION,
  description: "",
  tags: "",
  capacity: "",
  price_chf: "0",
  is_published: true,
  is_public: true,
  image_url: "",
  recurrence_type: "none",
  recurrence_interval: "1",
  recurrence_end_date: "",
});

function formStateToFormData(f: FormState): FormData {
  const fd = new FormData();
  fd.set("title", f.title);
  fd.set("date", f.date);
  fd.set("time_start", f.time_start);
  if (f.time_end) fd.set("time_end", f.time_end);
  fd.set("location", f.location);
  if (f.description) fd.set("description", f.description);
  if (f.tags) fd.set("tags", f.tags);
  if (f.capacity) fd.set("capacity", f.capacity);
  fd.set("price_chf", f.price_chf || "0");
  if (!f.is_published) fd.set("is_published", "off");
  if (!f.is_public) fd.set("is_public", "off");
  if (f.image_url) fd.set("image_url", f.image_url);
  fd.set("recurrence_type", f.recurrence_type || "none");
  if (f.recurrence_type !== "none") {
    fd.set("recurrence_interval", f.recurrence_interval || "1");
    if (f.recurrence_type !== "indefinite" && f.recurrence_end_date)
      fd.set("recurrence_end_date", f.recurrence_end_date);
  }
  return fd;
}

function eventToFormState(ev: EventRow): FormState {
  return {
    title: ev.title,
    date: ev.date,
    time_start: ev.time_start ?? "09:30",
    time_end: ev.time_end ?? "",
    location: ev.location ?? DEFAULT_LOCATION,
    description: ev.description ?? "",
    tags: (ev.tags ?? []).join(", "),
    capacity: ev.capacity != null ? String(ev.capacity) : "",
    price_chf: String(ev.price_chf ?? 0),
    is_published: ev.is_published,
    is_public: ev.is_public,
    image_url: ev.image_url ?? "",
    recurrence_type: ev.recurrence_type ?? "none",
    recurrence_interval: String(ev.recurrence_interval ?? 1),
    recurrence_end_date: ev.recurrence_end_date ?? "",
  };
}

interface Props {
  canManage: boolean;
}

export function EventsManagerClient({ canManage }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadEvents() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("events")
      .select("id, title, date, time_start, time_end, location, description, tags, capacity, price_chf, is_published, is_public, image_url, recurrence_type, recurrence_interval, recurrence_end_date")
      .order("date", { ascending: true });
    setEvents(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (canManage) loadEvents();
  }, [canManage]);

  if (!canManage) return null;

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setImageFile(null);
    setImagePreview(null);
    setError(null);
    setSuccess(null);
    setShowForm(true);
  }

  function openEdit(ev: EventRow) {
    setEditingId(ev.id);
    setForm(eventToFormState(ev));
    setImageFile(null);
    setImagePreview(ev.image_url ?? null);
    setError(null);
    setSuccess(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setImageFile(null);
    setImagePreview(null);
    setError(null);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
    e.target.value = "";
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    setForm(f => ({ ...f, image_url: "" }));
  }

  async function handleSubmit() {
    if (!form.title.trim()) { setError("Le titre est requis."); return; }
    if (!form.date) { setError("La date est requise."); return; }
    setSaving(true);
    setError(null);
    const fd = formStateToFormData(form);
    if (imageFile) fd.set("image_file", imageFile);
    let result: { error?: string; success?: boolean } | undefined;
    if (editingId) {
      result = await updateEvent(editingId, fd);
    } else {
      result = await createEvent(fd);
    }
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSuccess(editingId ? "Événement mis à jour." : "Événement créé.");
    closeForm();
    await loadEvents();
    startTransition(() => { router.refresh(); });
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    setError(null);
    const result = await deleteEvent(id);
    setDeleting(false);
    if (result?.error) {
      setError(result.error);
      setDeletingId(null);
      return;
    }
    setDeletingId(null);
    setSuccess("Événement supprimé.");
    await loadEvents();
    startTransition(() => { router.refresh(); });
  }

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="mb-3">
        <label className="block text-xs font-semibold text-arc-navy mb-1">{label}</label>
        {children}
      </div>
    );
  }

  const inputCls = "w-full border border-arc-border rounded-lg px-3 py-2 text-sm text-arc-navy bg-white focus:outline-none focus:ring-2 focus:ring-arc-blue/30 focus:border-arc-blue transition";

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-arc-blue">
          Gestion des événements
        </h2>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 bg-arc-blue text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-arc-navy transition"
        >
          <span>+</span> Ajouter un événement
        </button>
      </div>

      {/* Success message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-2 mb-4 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600 ml-3">✕</button>
        </div>
      )}

      {/* Error outside form */}
      {error && !showForm && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2 mb-4">
          {error}
        </div>
      )}

      {/* Slide-in form panel */}
      {showForm && (
        <div className="bg-white border border-arc-border rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="font-serif text-base font-bold text-arc-navy">
              {editingId ? "Modifier l'événement" : "Nouvel événement"}
            </span>
            <button onClick={closeForm} className="text-arc-text3 hover:text-arc-navy text-lg leading-none">✕</button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-3">
              {error}
            </div>
          )}

          <Field label="Titre *">
            <input
              className={inputCls}
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Nom de l'événement"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Date *">
              <input
                type="date"
                className={inputCls}
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </Field>
            <Field label="Heure début">
              <input
                type="time"
                className={inputCls}
                value={form.time_start}
                onChange={e => setForm(f => ({ ...f, time_start: e.target.value }))}
              />
            </Field>
            <Field label="Heure fin">
              <input
                type="time"
                className={inputCls}
                value={form.time_end}
                onChange={e => setForm(f => ({ ...f, time_end: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="Lieu">
            <input
              className={inputCls}
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder={DEFAULT_LOCATION}
            />
          </Field>

          <Field label="Description">
            <textarea
              className={inputCls + " resize-y min-h-[72px]"}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description de l'événement (optionnel)"
            />
          </Field>

          {/* ── Image ── */}
          <div className="border border-arc-border rounded-xl p-4 mb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-arc-blue mb-3">🖼 Image de l'événement</div>

            {imagePreview && (
              <div className="relative mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="w-full h-44 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white text-arc-text3 hover:text-red-500 rounded-full w-7 h-7 flex items-center justify-center text-sm shadow transition"
                >
                  ✕
                </button>
              </div>
            )}

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="px-3 py-1.5 text-xs font-semibold border border-arc-border rounded-lg hover:bg-gray-50 transition text-arc-navy">
                📁 {imagePreview ? "Changer l'image" : "Choisir une image"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </label>
            <p className="text-[10px] text-arc-text3 mt-1.5">JPG, PNG, WebP — max 5 Mo recommandé</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Tags (virgule-séparés)">
              <input
                className={inputCls}
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="culte, famille…"
              />
            </Field>
            <Field label="Capacité max">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                placeholder="illimitée"
              />
            </Field>
            <Field label="Prix (CHF)">
              <input
                type="number"
                min={0}
                step={0.5}
                className={inputCls}
                value={form.price_chf}
                onChange={e => setForm(f => ({ ...f, price_chf: e.target.value }))}
              />
            </Field>
          </div>

          {/* ── Récurrence ── */}
          <div className="border border-arc-border rounded-xl p-4 mb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-arc-blue mb-3">🔄 Récurrence</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Type">
                <select
                  className={inputCls}
                  value={form.recurrence_type}
                  onChange={e => setForm(f => ({ ...f, recurrence_type: e.target.value }))}
                >
                  <option value="none">Aucune (événement unique)</option>
                  <option value="daily">Quotidien</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuel</option>
                  <option value="yearly">Annuel</option>
                  <option value="indefinite">Indéfiniment</option>
                </select>
              </Field>
              {form.recurrence_type !== "none" && form.recurrence_type !== "indefinite" && (
                <Field label="Tous les N…">
                  <input
                    type="number"
                    min={1}
                    className={inputCls}
                    value={form.recurrence_interval}
                    onChange={e => setForm(f => ({ ...f, recurrence_interval: e.target.value }))}
                  />
                </Field>
              )}
            </div>
            {form.recurrence_type !== "none" && form.recurrence_type !== "indefinite" && (
              <Field label="Date de fin (laisser vide = indéfini)">
                <input
                  type="date"
                  className={inputCls}
                  value={form.recurrence_end_date}
                  onChange={e => setForm(f => ({ ...f, recurrence_end_date: e.target.value }))}
                />
              </Field>
            )}
          </div>

          <div className="flex items-center gap-6 mb-4">
            <label className="flex items-center gap-2 text-sm text-arc-navy cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
                className="rounded border-arc-border accent-arc-blue"
              />
              Publié
            </label>
            <label className="flex items-center gap-2 text-sm text-arc-navy cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_public}
                onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))}
                className="rounded border-arc-border accent-arc-blue"
              />
              Public (visible sur le site vitrine)
            </label>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={closeForm}
              className="px-4 py-2 text-sm text-arc-text2 border border-arc-border rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-arc-blue text-white rounded-lg hover:bg-arc-navy transition disabled:opacity-60"
            >
              {saving ? "Enregistrement…" : editingId ? "Mettre à jour" : "Publier l'événement"}
            </button>
          </div>
        </div>
      )}

      {/* Events list */}
      {loading ? (
        <div className="text-center text-arc-text3 text-sm py-8">Chargement…</div>
      ) : events.length === 0 ? (
        <div className="bg-white border border-arc-border rounded-2xl py-10 text-center text-arc-text3 text-sm">
          Aucun événement. Cliquez sur &ldquo;+ Ajouter&rdquo; pour créer le premier.
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(ev => (
            <div
              key={ev.id}
              className="bg-white border border-arc-border rounded-xl px-4 py-3 flex items-center gap-3"
            >
              {/* Thumbnail */}
              {ev.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ev.image_url}
                  alt=""
                  className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="flex-shrink-0 w-12 text-center">
                  <div className="text-xs font-bold text-arc-blue uppercase leading-tight">
                    {new Date(ev.date + "T00:00:00").toLocaleDateString("fr-CH", { month: "short" })}
                  </div>
                  <div className="text-lg font-bold text-arc-navy leading-tight">
                    {new Date(ev.date + "T00:00:00").getDate()}
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-arc-navy truncate">{ev.title}</span>
                  {!ev.is_published && (
                    <span className="text-xs bg-gray-100 text-arc-text3 px-2 py-0.5 rounded-full">brouillon</span>
                  )}
                  {!ev.is_public && (
                    <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">interne</span>
                  )}
                  {ev.recurrence_type && ev.recurrence_type !== "none" && (
                    <span className="text-xs bg-arc-blueBg text-arc-blue px-2 py-0.5 rounded-full">
                      🔄 {REC_LABELS[ev.recurrence_type] ?? ev.recurrence_type}
                      {ev.recurrence_type !== "indefinite" && (ev.recurrence_interval ?? 1) > 1
                        ? ` ×${ev.recurrence_interval}`
                        : ""}
                    </span>
                  )}
                </div>
                <div className="text-xs text-arc-text2 mt-0.5">
                  {ev.time_start && <span>{ev.time_start}{ev.time_end ? ` – ${ev.time_end}` : ""} · </span>}
                  {ev.location && <span>{ev.location}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex items-center gap-1">
                {deletingId === ev.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-red-600 font-medium mr-1">Supprimer ?</span>
                    <button
                      onClick={() => handleDelete(ev.id)}
                      disabled={deleting}
                      className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600 transition disabled:opacity-60"
                    >
                      {deleting ? "…" : "Oui"}
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="text-xs border border-arc-border text-arc-text2 px-2 py-1 rounded-lg hover:bg-gray-50 transition"
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => openEdit(ev)}
                      title="Modifier"
                      className="text-base text-arc-text2 hover:text-arc-blue px-2 py-1 rounded-lg hover:bg-blue-50 transition"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => { setDeletingId(ev.id); setError(null); }}
                      title="Supprimer"
                      className="text-base text-arc-text2 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                    >
                      🗑
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
