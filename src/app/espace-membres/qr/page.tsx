import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import QrStudio from "@/components/qr/QrStudio";

export const dynamic = "force-dynamic";

export default async function QrStudioPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("role, groups").eq("id", user.id).maybeSingle();
  const role = (prof?.role as string) ?? "";
  const groups = (prof?.groups as string[] | null) ?? [];
  const allowed = ["admin", "pasteur"].includes(role) || groups.includes("communication");
  if (!allowed) redirect("/espace-membres?panel=accueil");

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui,Arial,sans-serif" }}>
      <Link href="/espace-membres?panel=admin" style={{ fontSize: 13, color: "#8890aa", textDecoration: "none" }}>← Administration</Link>
      <h1 style={{ fontFamily: "Georgia,serif", fontSize: 28, fontWeight: 700, color: "#1e2464", margin: "6px 0 2px" }}>QR Studio 🎨</h1>
      <p style={{ color: "#8890aa", margin: "0 0 22px", fontSize: 14 }}>
        Génère et personnalise des QR codes ARC (site, espace membre, téléchargement des apps…) — couleurs, correction d&apos;erreur, taille, logo. Export PNG.
      </p>
      <QrStudio />
    </main>
  );
}
