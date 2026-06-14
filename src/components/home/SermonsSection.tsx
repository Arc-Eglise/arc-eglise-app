import { createClient } from "@/lib/supabase/server";
import type { Sermon }   from "@/lib/supabase/types";
import SermonsClient     from "./SermonsClient";

export default async function SermonsSection() {
  const supabase = createClient();

  const { data: sermons } = await supabase
    .from("sermons")
    .select("*")
    .eq("is_published", true)
    .order("date", { ascending: false })
    .limit(10);

  return (
    <section id="sermons" className="py-24 bg-arc-bg">
      <div className="max-w-8xl mx-auto px-5 md:px-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[3px] uppercase text-arc-blue mb-4">
              <span className="w-5 h-px bg-arc-blue" /> Médiathèque
            </div>
            <h2 className="font-serif text-[38px] md:text-[44px] font-bold text-arc-navy leading-[1.15]">
              Sermons & Replays
            </h2>
          </div>
          <a
            href="https://www.youtube.com/@ARCEglise"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[9px] text-sm font-bold bg-arc-navy text-white hover:bg-arc-navy2 transition-colors self-start md:self-auto"
          >
            ▶ Voir sur YouTube
          </a>
        </div>

        <SermonsClient sermons={(sermons ?? []) as Sermon[]} />
      </div>
    </section>
  );
}
