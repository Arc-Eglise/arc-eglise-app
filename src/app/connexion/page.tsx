import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import ConnexionForm from "./ConnexionForm";

export default async function ConnexionPage() {
  const supabase = createClient();
  const { data: citation } = await supabase
    .from("citations")
    .select("texte, auteur, role_mention")
    .eq("is_active", true)
    .single();

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">

      {/* LEFT — panneau de marque avec citation depuis la DB */}
      <div className="hidden lg:flex flex-col justify-between p-16 relative overflow-hidden bg-arc-navy">
        {/* Shader overlay — halos diffus pour la profondeur (charte Sacred Modernity) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at top right,rgba(255,255,255,.06) 0%,transparent 40%)," +
              "radial-gradient(circle at bottom left,rgba(255,255,255,.03) 0%,transparent 50%)",
          }}
        />
        <Link href="/" className="relative z-10">
          <div className="bg-white/95 rounded-xl p-4 inline-flex shadow-md">
            <Image
              src="/images/logo-arc.jpeg"
              alt="ARC — Ambassade du Royaume de Christ"
              width={140} height={86}
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
        </Link>

        {citation && (
          <div className="relative z-10 max-w-xl">
            <blockquote className="font-serif text-[32px] italic text-arc-bluePale leading-snug mb-6">
              &ldquo;{citation.texte}&rdquo;
            </blockquote>
            <div className="text-sm text-white/60">
              — {citation.auteur}{citation.role_mention ? ` · ${citation.role_mention}` : ""}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT — formulaire (Client Component) */}
      <ConnexionForm />
    </div>
  );
}
