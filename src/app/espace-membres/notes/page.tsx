import { redirect } from "next/navigation";

// ADR-002 (D8) — l'outil « Notes bibliques » est remplacé par le module unifié
// « Notes & Tâches ». Les notes existantes ont été migrées vers la table `notes`
// (migration 20260804000000_notes_tasks_socle). NotesClient.tsx est conservé
// comme référence historique mais n'est plus routé.
export default function NotesPage() {
  redirect("/espace-membres/notes-taches");
}
