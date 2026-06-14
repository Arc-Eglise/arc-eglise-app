import { createClient }   from "@/lib/supabase/server";
import { redirect }        from "next/navigation";
import EspaceMembresClient from "./EspaceMembresClient";
import type { EMClientProps } from "./EspaceMembresClient";

export default async function EspaceMembresPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const [{ data: profile }, { count: membresCount }, { data: events }] = await Promise.all([
    supabase.from("profiles")
      .select("id, first_name, last_name, email, role, validated, groups, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase.from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("validated", true),
    supabase.from("events")
      .select("id, title, date, time_start, location")
      .gte("date", new Date().toISOString().split("T")[0])
      .eq("is_published", true)
      .order("date")
      .limit(6),
  ]);

  const props: EMClientProps = {
    profile: profile as EMClientProps["profile"],
    userId: user.id,
    membresCount: membresCount ?? 0,
    events: (events ?? []) as EMClientProps["events"],
  };

  return <EspaceMembresClient {...props} />;
}
