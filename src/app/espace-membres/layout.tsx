import { createClient }       from "@/lib/supabase/server";
import { redirect }            from "next/navigation";
import { ReadingPrefsProvider } from "@/contexts/ReadingPrefsContext";
import { ReadingPrefsButton }   from "@/components/reading/ReadingPrefsButton";

export default async function EspaceMembresLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  return (
    <ReadingPrefsProvider userId={user.id}>
      {children}
      <ReadingPrefsButton />
    </ReadingPrefsProvider>
  );
}
