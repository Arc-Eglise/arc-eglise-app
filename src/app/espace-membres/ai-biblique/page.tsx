import { redirect } from "next/navigation";

// « ARC Église AI » n'est plus une application distincte : c'est un service IA
// intégré directement dans les applications dédiées (Prière & Bible : Étude,
// Théologie, Dictionnaire, Plans, Journal ; Agenda, Streaming, Contacts pour le
// reste). On redirige donc vers Prière & Bible pour éviter tout doublon.
export default function AiBibliqueRedirect() {
  redirect("/espace-membres?panel=priere");
}
