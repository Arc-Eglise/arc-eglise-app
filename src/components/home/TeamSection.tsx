import { createClient }  from "@/lib/supabase/server";
import type { TeamMember } from "@/lib/supabase/types";

const GRADIENTS = [
  "from-arc-navy to-arc-blue",
  "from-[#2d3a8e] to-arc-navy",
  "from-arc-navy2 to-[#2d3a8e]",
  "from-arc-navy to-arc-navy2",
];

export default async function TeamSection() {
  const supabase = createClient();

  const { data: members } = await supabase
    .from("team_members")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(8);

  return (
    <section id="equipe" className="py-24 bg-arc-bg">
      <div className="max-w-8xl mx-auto px-5 md:px-10">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[3px] uppercase text-arc-blue mb-4">
            <span className="w-5 h-px bg-arc-blue" /> Notre équipe <span className="w-5 h-px bg-arc-blue" />
          </div>
          <h2 className="font-serif text-[38px] md:text-[44px] font-bold text-arc-navy leading-[1.15] mb-4">
            Des bergers au service<br />de la communauté
          </h2>
          <p className="text-base text-arc-text2 leading-relaxed max-w-[560px] mx-auto">
            Notre équipe pastorale est dédiée à vous accompagner dans votre parcours spirituel avec amour et excellence.
          </p>
        </div>

        {members && members.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[22px]">
            {members.map((m: TeamMember, i: number) => (
              <div
                key={m.id}
                className="rounded-[20px] overflow-hidden bg-white border border-arc-border hover:border-arc-bluePale hover:-translate-y-1.5 hover:shadow-arc transition-all duration-300 cursor-pointer"
              >
                <div className={`h-[180px] flex items-center justify-center bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`}>
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-[88px] h-[88px] rounded-full bg-white/20 border-[3px] border-white/30 flex items-center justify-center font-serif text-[28px] font-bold text-white">
                      {m.initials}
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="font-serif text-[19px] font-bold text-arc-navy mb-0.5">{m.name}</div>
                  <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-arc-blue mb-2.5">{m.role_label}</div>
                  {m.bio && <p className="text-xs text-arc-text2 leading-[1.7]">{m.bio}</p>}
                </div>

                <div className="px-5 py-3.5 border-t border-arc-border flex gap-2">
                  <a
                    href="mailto:contact@arc-eglise.ch"
                    aria-label="Envoyer un email"
                    className="w-8 h-8 rounded-lg bg-arc-bg border border-arc-border flex items-center justify-center text-sm hover:bg-arc-blueBg hover:border-arc-bluePale transition-all duration-200"
                  >
                    ✉️
                  </a>
                  <a
                    href="#contact"
                    aria-label="Envoyer un message"
                    className="w-8 h-8 rounded-lg bg-arc-bg border border-arc-border flex items-center justify-center text-sm hover:bg-arc-blueBg hover:border-arc-bluePale transition-all duration-200"
                  >
                    💬
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-arc-text3 text-sm">
            L'équipe sera présentée prochainement.
          </div>
        )}
      </div>
    </section>
  );
}
