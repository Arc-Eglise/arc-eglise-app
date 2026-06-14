const FEATURES = [
  {
    icon: "📺",
    title: "Sermons & Replays",
    text: "Retrouvez tous nos messages en vidéo, audio et transcription dès le lundi.",
    cta: "→ Voir les sermons",
    href: "sermons",
  },
  {
    icon: "👨‍👩‍👧‍👦",
    title: "Rejoindre la famille",
    text: "Intégrez notre communauté de 250 membres issus de 32 nations différentes.",
    cta: "→ Je veux rejoindre",
    href: "contact",
  },
  {
    icon: "📅",
    title: "Événements & Cultes",
    text: "Consultez notre agenda, réservez vos places pour nos soirées et événements spéciaux.",
    cta: "→ Voir l'agenda",
    href: "evenements",
  },
  {
    icon: "💛",
    title: "Soutenir l'Église",
    text: "Participez à l'œuvre de Dieu via TWINT, carte bancaire ou PostFinance.",
    cta: "→ Faire un don",
    href: "dons",
  },
];

export default function FeaturesStrip() {
  return (
    <div id="features" className="bg-arc-navy">
      <div className="max-w-8xl mx-auto px-5 md:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/[0.08]">
          {FEATURES.map((f, i) => (
            <a
              key={f.title}
              href={`#${f.href}`}
              className={`
                group relative flex flex-col gap-3 p-7 md:p-8 overflow-hidden
                cursor-pointer transition-all duration-250
                hover:bg-white/5
                ${i < FEATURES.length - 1 ? "border-r border-white/[0.08]" : ""}
              `}
            >
              {/* Gold underline on hover */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-arc-gold scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />

              <div className="text-[28px] leading-none">{f.icon}</div>
              <div className="text-[15px] font-bold text-white">{f.title}</div>
              <div className="text-[12px] text-white/50 leading-relaxed">{f.text}</div>
              <div className="text-sm text-arc-gold mt-auto group-hover:translate-x-1 transition-transform duration-200">
                {f.cta}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
