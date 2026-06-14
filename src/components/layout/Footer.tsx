export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#06091e] pt-[72px] pb-7">
      <div className="max-w-8xl mx-auto px-5 md:px-10">

        {/* Top grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2.5fr_1fr_1fr_1fr] gap-14 mb-14">

          {/* Brand */}
          <div>
            <div className="font-serif text-[22px] font-bold tracking-[3px] text-white mb-2.5">ARC</div>
            <p className="text-[13px] text-white/40 leading-relaxed max-w-[260px] mb-5">
              Ambassade du Royaume de Christ. Une communauté évangélique vivante à La Chaux-de-Fonds, Suisse.
            </p>
            <div className="flex gap-2">
              {["📱", "📘", "📸", "▶️"].map((icon, i) => (
                <button
                  key={i}
                  className="w-9 h-9 rounded-lg bg-white/7 border border-white/8 flex items-center justify-center text-sm hover:bg-white/15 transition-colors"
                  aria-label="Réseau social"
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Col 1 */}
          <div>
            <div className="text-[10px] font-bold tracking-[2px] uppercase text-white/30 mb-[18px]">Navigation</div>
            <div className="flex flex-col gap-2.5">
              {["Accueil", "À propos", "Sermons", "Événements", "Équipe", "Donner"].map((l) => (
                <a key={l} href={`#${l.toLowerCase().replace("à ", "").replace(" ", "")}`} className="text-[13px] text-white/50 hover:text-white transition-colors cursor-pointer">
                  {l}
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <div className="text-[10px] font-bold tracking-[2px] uppercase text-white/30 mb-[18px]">Communauté</div>
            <div className="flex flex-col gap-2.5">
              {["Espace Membres", "Groupes", "Prière", "Bible", "Événements privés", "Dons en ligne"].map((l) => (
                <span key={l} className="text-[13px] text-white/50 hover:text-white transition-colors cursor-pointer">{l}</span>
              ))}
            </div>
          </div>

          {/* Col 3 */}
          <div>
            <div className="text-[10px] font-bold tracking-[2px] uppercase text-white/30 mb-[18px]">Contact</div>
            <div className="flex flex-col gap-2.5 text-[13px] text-white/50">
              <span>📍 Av. Charles-Naine 39<br className="hidden" /><span className="pl-5">2300 La Chaux-de-Fonds</span></span>
              <span>📧 contact@arc-eglise.ch</span>
              <span>🗓 Dim 09h30 & 17h00</span>
              <span>🗓 Mer 19h00 — Prière</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/25">
            © {year} ARC — Ambassade du Royaume de Christ · La Chaux-de-Fonds, Suisse
          </p>
          <div className="flex gap-5">
            {["Mentions légales", "Confidentialité", "nLPD"].map((l) => (
              <span key={l} className="text-[12px] text-white/25 hover:text-white/60 transition-colors cursor-pointer">{l}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
