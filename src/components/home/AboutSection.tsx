const PILLARS = [
  { icon: "📖", title: "La Parole",  desc: "La Bible est notre autorité absolue et notre guide quotidien." },
  { icon: "🙏", title: "La Prière",  desc: "Nous sommes une maison de prière et d'intercession." },
  { icon: "❤️", title: "L'Amour",   desc: "Nous nous aimons comme Christ nous a aimés, sans conditions." },
  { icon: "🌍", title: "La Mission", desc: "Nous allons vers toutes les nations pour proclamer l'Évangile." },
];

export default function AboutSection() {
  return (
    <section id="apropos" className="py-24 bg-white">
      <div className="max-w-8xl mx-auto px-5 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">

          {/* Visual */}
          <div className="relative">
            <div
              className="w-full h-[380px] md:h-[520px] rounded-3xl flex items-end overflow-hidden relative"
              style={{ background: "linear-gradient(160deg,#1e2464,#8899cc)" }}
            >
              {/* dot pattern */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='1' fill='rgba(255,255,255,.08)'/%3E%3C/svg%3E\")",
                  backgroundSize: "60px",
                }}
              />
              <div className="relative z-10 p-8 w-full">
                <div className="text-[9px] text-arc-bluePale tracking-[2px] uppercase mb-1.5">
                  Fondée en 2018 · La Chaux-de-Fonds
                </div>
                <blockquote className="font-serif text-[22px] italic text-white/85 leading-relaxed">
                  "Construisons des générations de disciples qui influencent positivement leur environnement."
                </blockquote>
              </div>
            </div>

            {/* Floating stat */}
            <div className="absolute bg-white rounded-[18px] px-6 py-5 shadow-arc-dark -right-4 md:-right-8 top-10">
              <div className="font-serif text-[40px] font-bold text-arc-navy leading-none">600+</div>
              <div className="text-[11px] text-arc-text3 mt-1">Personnes touchées</div>
            </div>
          </div>

          {/* Content */}
          <div>
            <div className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[3px] uppercase text-arc-blue mb-4">
              <span className="w-5 h-px bg-arc-blue" />
              Notre histoire
            </div>
            <h2 className="font-serif text-[38px] md:text-[44px] font-bold text-arc-navy leading-[1.15] mb-4">
              Une église enracinée<br />dans la Parole
            </h2>
            <div className="space-y-4 mb-8">
              <p className="text-[15px] text-arc-text2 leading-[1.9]">
                Fondée en 2018 par le Pasteur Pedro Obova, l'Ambassade du Royaume de Christ est une communauté évangélique multiraciale et dynamique établie au cœur de La Chaux-de-Fonds.
              </p>
              <p className="text-[15px] text-arc-text2 leading-[1.9]">
                Nous croyons en une foi authentique, pratique et transformatrice. Notre vision est de voir chaque personne rencontrer Dieu, être équipée et impacter sa génération pour l'Évangile.
              </p>
            </div>

            {/* Pillars */}
            <div className="grid grid-cols-2 gap-3.5 mb-7">
              {PILLARS.map((p) => (
                <div
                  key={p.title}
                  className="bg-arc-bg border border-arc-border rounded-[14px] p-5 hover:border-arc-bluePale hover:-translate-y-0.5 transition-all duration-250"
                >
                  <div className="text-2xl mb-2.5">{p.icon}</div>
                  <div className="text-sm font-bold text-arc-navy mb-1">{p.title}</div>
                  <div className="text-[12px] text-arc-text2 leading-[1.65]">{p.desc}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3.5 flex-wrap">
              <a
                href="#equipe"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[11px] text-sm font-bold bg-arc-navy text-white hover:bg-arc-navy2 hover:-translate-y-0.5 hover:shadow-arc transition-all duration-300"
              >
                Rencontrer l'équipe →
              </a>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[11px] text-sm font-bold bg-transparent text-arc-navy border-[1.5px] border-arc-navy/25 hover:bg-arc-blueBg hover:border-arc-navy transition-all duration-300"
              >
                Nous visiter
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
