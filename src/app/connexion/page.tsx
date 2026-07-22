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
      <div
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0a0d2e 0%,#1e2464 50%,#0f123a 100%)" }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle,rgba(136,153,204,.07) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <Link href="/" className="relative z-10">
          <div style={{ background: "rgba(255,255,255,.95)", borderRadius: 12, padding: "8px 14px", display: "inline-flex" }}>
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
          <div className="relative z-10">
            <blockquote className="font-serif text-[32px] italic text-white/85 leading-[1.4] mb-6">
              &ldquo;{citation.texte}&rdquo;
            </blockquote>
            <div className="text-sm text-white/50">
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
