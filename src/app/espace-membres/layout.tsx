import { createClient }       from "@/lib/supabase/server";
import { redirect }            from "next/navigation";
import { ReadingPrefsProvider } from "@/contexts/ReadingPrefsContext";
import { ReadingPrefsButton }   from "@/components/reading/ReadingPrefsButton";

export default async function EspaceMembresLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Non authentifié → page de connexion
  if (!user) redirect("/connexion");

  // Vérifier le rôle et la validation — visiteurs et membres non validés sont refusés
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, validated")
    .eq("id", user.id)
    .single();

  const isAllowed =
    profile?.role === "admin" ||
    profile?.role === "pasteur" ||
    (profile?.role === "membre" && profile?.validated === true);

  // Visiteur ou membre non encore validé → retour à l'accueil
  if (!isAllowed) redirect("/");

  return (
    <ReadingPrefsProvider userId={user.id}>
      {children}
      <ReadingPrefsButton />
    </ReadingPrefsProvider>
  );
}
