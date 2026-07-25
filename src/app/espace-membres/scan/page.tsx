import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import TicketScanner from "@/components/evenements/TicketScanner";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!["admin", "pasteur"].includes((prof?.role as string) ?? "")) {
    redirect("/espace-membres?panel=accueil");
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui,Arial,sans-serif" }}>
      <Link href="/espace-membres?panel=admin" style={{ fontSize: 13, color: "#8890aa", textDecoration: "none" }}>← Administration</Link>
      <h1 style={{ fontFamily: "Georgia,serif", fontSize: 28, fontWeight: 700, color: "#1e2464", margin: "6px 0 2px" }}>Scanner les billets 🎟️</h1>
      <p style={{ color: "#8890aa", margin: "0 0 20px", fontSize: 14 }}>Valide l&apos;entrée des participants — caméra du téléphone ou scanner PC.</p>
      <TicketScanner />
    </main>
  );
}
