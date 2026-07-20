import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default async function AnnuairePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: members } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, groups, avatar_url, country")
    .eq("validated", true)
    .order("first_name");

  const roleStyle: Record<string, string> = {
    admin:   "bg-red-100 text-red-700",
    pasteur: "bg-purple-100 text-purple-700",
    membre:  "bg-green-100 text-green-700",
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <Link href="/espace-membres/ai-biblique" className="inline-flex items-center gap-1.5 text-sm text-arc-blue hover:text-arc-navy transition-colors">
          ← ARC Église AI
        </Link>
        <span className="text-arc-border">|</span>
        <Link href="/espace-membres" className="inline-flex items-center gap-1.5 text-sm text-arc-text2 hover:text-arc-navy transition-colors">
          ← Espace Membres
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">Annuaire</h1>
        <p className="text-sm text-arc-text2 mt-0.5">{members?.length ?? 0} membres</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(members ?? []).map((m) => {
          const initiale = (m.first_name?.[0] ?? "?").toUpperCase();
          const fullName = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";

          return (
            <div key={m.id} className="bg-white border border-arc-border rounded-2xl p-4 flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-arc-navy flex items-center justify-center overflow-hidden flex-shrink-0">
                {m.avatar_url
                  ? <Image src={m.avatar_url} alt={fullName} width={48} height={48} className="w-full h-full object-cover" />
                  : <span className="font-serif text-lg font-bold text-white">{initiale}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-arc-navy text-sm">{fullName}</div>
                {m.country && <div className="text-[11px] text-arc-text3 mt-0.5">📍 {m.country}</div>}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleStyle[m.role] ?? "bg-arc-blueBg text-arc-navy"}`}>
                    {m.role}
                  </span>
                  {m.groups?.map((g: string) => (
                    <span key={g} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-arc-gold/10 text-arc-goldDark">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        {!members?.length && (
          <div className="col-span-3 py-16 text-center text-arc-text3 text-sm bg-white border border-arc-border rounded-2xl">
            Aucun membre validé pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}
