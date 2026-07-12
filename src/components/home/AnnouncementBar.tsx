import { createClient }              from "@/lib/supabase/server";
import { getAutoVerset, getThemedVerset } from "@/lib/verses";
import AnnouncementMarquee           from "./AnnouncementMarquee";

export default async function AnnouncementBar() {
  const supabase = createClient();

  try {
    const [{ data: events }, { data: settings }] = await Promise.all([
      supabase
        .from("events")
        .select("title, date, time_start")
        .eq("is_published", true)
        .eq("is_public",    true)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(3),
      supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [
          "culte_1_label", "culte_2_label", "culte_3_label",
          "verset_reference", "verset_mode", "verset_auto_interval", "verset_manuel_expires_at", "verset_theme",
          "announcement_enabled",
          "announcement_welcome",
          "announcement_show_schedules",
          "announcement_show_events",
          "announcement_show_verset",
        ]),
    ]);

    const s: Record<string, string> = {};
    for (const row of settings ?? []) s[row.key] = row.value;

    if (s.announcement_enabled === "false") return null;

    const items: string[] = [];

    // Message de bienvenue personnalisable
    const welcome = s.announcement_welcome?.trim() || "Bienvenue à l'ARC";
    items.push(welcome);

    // Horaires des cultes depuis site_settings
    if (s.announcement_show_schedules !== "false") {
      if (s.culte_1_label) items.push(s.culte_1_label);
      if (s.culte_2_label) items.push(s.culte_2_label);
      if (s.culte_3_label) items.push(s.culte_3_label);
    }

    // Événements à venir depuis la table events
    if (s.announcement_show_events !== "false") {
      for (const ev of events ?? []) {
        const date = new Date(ev.date).toLocaleDateString("fr-CH", {
          weekday: "short", day: "numeric", month: "short",
        });
        items.push(`${ev.title} · ${date} ${ev.time_start?.slice(0, 5) ?? ""}`);
      }
    }

    // Verset du jour — mode auto ou manuel (avec expiration automatique)
    if (s.announcement_show_verset !== "false") {
      const interval = (s.verset_auto_interval === "48" ? "48" : "24") as "24" | "48";
      const mode = s.verset_mode ?? "auto";
      const isManuelExpired = s.verset_manuel_expires_at
        ? new Date(s.verset_manuel_expires_at) < new Date()
        : true;

      if (mode === "manuel" && !isManuelExpired && s.verset_reference) {
        items.push(`Verset du jour : ${s.verset_reference}`);
      } else if (mode === "thematique" && s.verset_theme) {
        const v = getThemedVerset(s.verset_theme, interval);
        items.push(`« ${v.text} » — ${v.ref}`);
      } else {
        // mode auto, ou fallback → rotation automatique globale
        const v = getAutoVerset(interval);
        items.push(`« ${v.text} » — ${v.ref}`);
      }
    }

    if (items.length === 0) return null;

    return <AnnouncementMarquee items={items} />;
  } catch {
    return null;
  }
}
