import { redirect } from "next/navigation";

export default function MessageriePage() {
  redirect("/espace-membres?panel=messagerie");
}
