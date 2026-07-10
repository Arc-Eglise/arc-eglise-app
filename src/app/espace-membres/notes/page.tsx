import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NotesClient from "./NotesClient";

export default async function NotesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: notes } = await supabase
    .from("biblical_notes")
    .select("id, title, content, reference, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <div>
      <Link href="/espace-membres" className="inline-flex items-center gap-1.5 text-sm text-arc-blue hover:text-arc-navy mb-5 transition-colors">
        ← Retour
      </Link>
      <div className="mb-4">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">Notes bibliques</h1>
        <p className="text-sm text-arc-text2 mt-0.5">{(notes ?? []).length} note(s) personnelle(s)</p>
      </div>
      <NotesClient initialNotes={notes ?? []} />
    </div>
  );
}
