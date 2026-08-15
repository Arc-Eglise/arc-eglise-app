import { redirect } from "next/navigation";

// La messagerie fidèle (maquette v3.4_1) est désormais embarquée comme panneau
// de l'espace membre (avec la vraie barre de navigation). On redirige donc
// l'ancienne URL /espace-membres/messagerie vers le shell, panneau messagerie.
export default function MessageriePage() {
  redirect("/espace-membres?panel=messagerie");
}
