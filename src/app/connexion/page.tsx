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
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8f9fa] text-[#191c1d] antialiased">

      {/* LEFT — panneau de marque (maquette : indigo #000666, visible aussi en mobile) */}
      <div className="relative w-full md:w-[45%] lg:w-1/2 bg-[#000666] flex flex-col justify-between p-8 md:p-12 lg:p-16 min-h-[40vh] md:min-h-screen overflow-hidden">
        {/* Shader overlay — halos diffus pour la profondeur */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at top right,rgba(255,255,255,.05) 0%,transparent 40%)," +
              "radial-gradient(circle at bottom left,rgba(255,255,255,.02) 0%,transparent 50%)",
          }}
        />

        {/* Logo dans une boîte blanche arrondie */}
        <div className="relative z-10">
          <Link href="/" className="inline-block bg-white rounded-xl p-4 shadow-md">
            <Image
              src="/images/logo-arc.jpeg"
              alt="ARC — Ambassade du Royaume de Christ"
              width={160} height={64}
              className="h-16 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* Citation — visuel maquette, texte depuis Supabase */}
        {citation && (
          <div className="relative z-10 mt-12 md:mt-0 max-w-xl">
            <blockquote className="font-playfair italic font-bold text-[#bdc2ff] text-[28px] leading-[36px] md:text-[32px] md:leading-[40px] mb-6">
              &ldquo;{citation.texte}&rdquo;
            </blockquote>
            <p className="font-inter text-[16px] leading-[24px] text-[#bdc2ff] opacity-90">
              — {citation.auteur}
              {citation.role_mention && (
                <><span className="mx-2 opacity-50">·</span>{citation.role_mention}</>
              )}
            </p>
          </div>
        )}
      </div>

      {/* RIGHT — formulaire (Client Component) */}
      <ConnexionForm />
    </div>
  );
}
