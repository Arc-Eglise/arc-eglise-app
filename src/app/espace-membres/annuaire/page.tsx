import { redirect } from "next/navigation";

// Doublon consolidé : l'annuaire des membres vit dans le panneau « Contacts ».
// On redirige pour éviter deux endroits.
export default function AnnuairePage() {
  redirect("/espace-membres?panel=contacts");
}
