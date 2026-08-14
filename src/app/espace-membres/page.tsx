import { createClient }   from "@/lib/supabase/server";
import { redirect }        from "next/navigation";
import { Suspense }        from "react";
import EspaceMembresClient from "./EspaceMembresClient";
import type { EMClientProps } from "./EspaceMembresClient";
import { getMyUpcomingFormationSessions, listMyFormations, listAvailableFormations } from "@/lib/actions/formations";
import { computeSessionDates, formationLocation, DAY_LABELS } from "@/lib/formations-constants";

export default async function EspaceMembresPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const [
    { data: profile },
    { count: totalUsers },
    { count: membresValides },
    { count: visiteurs },
    { count: prayerCount },
    { data: events },
    { data: ytChannel },
  ] = await Promise.all([
    supabase.from("profiles")
      .select("id, first_name, last_name, email, role, validated, groups, managed_groups, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase.from("profiles")
      .select("*", { count: "exact", head: true }),
    supabase.from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("validated", true),
    supabase.from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("validated", false),
    supabase.from("prayer_requests")
      .select("*", { count: "exact", head: true })
      .eq("is_answered", false),
    supabase.from("events")
      .select("id, title, date, time_start, location")
      .gte("date", new Date().toISOString().split("T")[0])
      .eq("is_published", true)
      .order("date")
      .limit(6),
    supabase.from("site_settings")
      .select("value")
      .eq("key", "youtube_channel_id")
      .maybeSingle(),
  ]);

  // Formations : séances à venir (fusion dans « Prochains événements » —
  // élève inscrit OU formateur) + progression pour le panneau « Activités ».
  const today = new Date().toISOString().slice(0, 10);
  const [formationSessions, myFormationsRes, catalogRes] = await Promise.all([
    getMyUpcomingFormationSessions(user.id, 6),
    listMyFormations(),
    listAvailableFormations(),
  ]);
  const baseEvents = (events ?? []) as EMClientProps["events"];
  const mergedEvents = [
    ...baseEvents,
    ...formationSessions.map((s) => ({ id: s.id, title: s.title, date: s.date, time_start: s.time_start, location: formationLocation(s.location) })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const myFormData = myFormationsRes && "data" in myFormationsRes ? myFormationsRes.data : null;
  const myFormations = (myFormData?.formations ?? [])
    // Les demandes en attente figurent dans « Formations disponibles » (badge En attente),
    // pas dans « Mes formations » (réservé aux inscriptions validées).
    .filter((f) => (myFormData?.myEnrollStatus?.[f.id] ?? "active") === "active")
    .map((f) => {
      const startFrom = myFormData?.myStartFrom?.[f.id] ?? null;
      const from = startFrom && startFrom > today ? startFrom : today;
      return {
        id: f.id,
        title: f.title,
        daysCompleted: myFormData?.myCompleted?.[f.id] ?? 0,
        totalDays: f.total_days,
        nextDate: computeSessionDates(f, { from })[0] ?? null,
      };
    });

  // Catalogue des formations (panneau Activités) — tout membre peut s'inscrire.
  const catalogData = catalogRes && "data" in catalogRes ? catalogRes.data : null;
  const availableFormations = (catalogData?.formations ?? []).map((f) => {
    const schedule = [
      (f.days ?? []).map((d) => DAY_LABELS[d] ?? d).join(", "),
      (f.time_start || f.time_end) ? `${(f.time_start ?? "").slice(0, 5) || "?"}–${(f.time_end ?? "").slice(0, 5) || "?"}` : "",
    ].filter(Boolean).join(" · ");
    return {
      id: f.id,
      title: f.title,
      location: formationLocation(f.location),
      schedule,
      recurring: f.recurring,
      myStatus: (catalogData?.myStatus?.[f.id] ?? null) as "pending" | "active" | null,
    };
  });

  const props: EMClientProps = {
    profile: profile as EMClientProps["profile"],
    userId: user.id,
    totalUsers:    totalUsers    ?? 0,
    membresValides: membresValides ?? 0,
    visiteurs:     visiteurs     ?? 0,
    prayerCount:   prayerCount   ?? 0,
    events: mergedEvents as EMClientProps["events"],
    myFormations,
    availableFormations,
    youtubeChannelId: (ytChannel?.value as string) ?? "",
  };

  return (
    <Suspense fallback={null}>
      <EspaceMembresClient {...props} />
    </Suspense>
  );
}
