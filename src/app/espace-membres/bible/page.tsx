import { redirect } from "next/navigation";

// Doublon consolidé : le lecteur biblique vit dans le panneau « Prière & Bible »
// (onglet « Lecteur biblique »). On redirige pour éviter deux endroits.
export default function BiblePage() {
  redirect("/espace-membres?panel=priere");
}
