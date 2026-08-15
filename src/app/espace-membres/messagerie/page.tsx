import { createClient } from "@/lib/supabase/server";
import { redirect }      from "next/navigation";
import { Suspense }      from "react";
import MessagerieFidele  from "./MessagerieFidele";

// Vraie page messagerie — portage fidèle de la maquette Stitch v3.4_1
// (3 colonnes : Conversations · Chat · Détails), branchée sur les vraies données.
export default async function MessageriePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles").select("first_name, last_name").eq("id", user.id).single();
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Moi";

  return (
    <Suspense fallback={null}>
      <MessagerieFidele currentUserId={user.id} displayName={displayName} />
    </Suspense>
  );
}
