import { createClient }       from "@/lib/supabase/server";
import AnnouncementMarquee    from "./AnnouncementMarquee";

const STATIC_ITEMS = [
  "Bienvenue à l'ARC — venez tels que vous êtes",
  "600+ personnes touchées par l'Évangile",
];

export default async function AnnouncementBar() {
  const supabase = createClient();

  const items: string[] = [...STATIC_ITEMS];

  try {
    const [{ data: events }, { data: settings }] = await Promise.all([
      supabase
        .from("events")
        .select("title, date, time_start")
        .eq("is_published", true)
        .eq("is_public", true)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(2),
      supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["culte_1_label", "verset_reference"]),
    ]);

    const s: Record<string, string> = {};
    for (const row of settings ?? []) s[row.key] = row.value;

    if (s.culte_1_label) {
      items.unshift(`⛪ ${s.culte_1_label}`);
    }

    if (s.verset_reference) {
      items.push(`📖 Verset du jour : ${s.verset_reference}`);
    }

    for (const ev of events ?? []) {
      const date = new Date(ev.date).toLocaleDateString("fr-CH", { weekday: "short", day: "numeric", month: "short" });
      items.unshift(`📅 ${ev.title} · ${date} ${ev.time_start?.slice(0, 5) ?? ""}`);
    }
  } catch {
    items.unshift("⛪ Dimanche 09h30 — Culte principal");
    items.unshift("⛪ Dimanche 17h00 — Culte du soir");
  }

  return <AnnouncementMarquee items={items} />;
}
