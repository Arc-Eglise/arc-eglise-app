import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ArcIaChat from "@/components/messagerie/ArcIaChat";

export const dynamic = "force-dynamic";

export default async function ArcIaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: prof } = await supabase
    .from("profiles").select("first_name").eq("id", user.id).maybeSingle();

  return <ArcIaChat firstName={(prof?.first_name as string | null)?.trim() || ""} />;
}
