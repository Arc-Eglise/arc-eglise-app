import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MemberSidebar from "@/components/espace-membres/MemberSidebar";
import MemberRightPanel from "@/components/espace-membres/MemberRightPanel";
import { getMemberShellData } from "@/components/espace-membres/shell-data";
import MediathequeClient, { type Sermon } from "./MediathequeClient";

export const dynamic = "force-dynamic";

export default async function MediathequePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Source réelle : table `sermons` (contenu publié). RLS SELECT déjà en place.
  const { data: rawSermons } = await supabase
    .from("sermons")
    .select("id, title, pastor, reference, series, excerpt, youtube_id, date, is_featured")
    .eq("is_published", true)
    .order("date", { ascending: false });

  const sermons = (rawSermons ?? []) as Sermon[];
  const featured = sermons.find(s => s.is_featured) ?? sermons[0] ?? null;

  const shell = await getMemberShellData(user.id);

  return (
    <>
      <MemberSidebar perms={shell.sidebarPerms} user={shell.sidebarUser} membresValides={shell.rp.membresValides} />
      <MemberRightPanel {...shell.rp} />
      <div className="min-[821px]:ml-[220px] min-[1280px]:mr-[264px] max-w-[1200px] px-4 md:px-6 pt-6 pb-24">
        <div className="mb-8">
          <h1 className="text-[40px] md:text-[48px] leading-tight font-bold text-[#000666] tracking-tight" style={{ fontFamily: '"Playfair Display", serif' }}>Médiathèque</h1>
          <p className="text-[18px] text-[#454652] mt-2">{sermons.length} enseignement{sermons.length > 1 ? "s" : ""} · sermons, séries et vidéos de l&apos;ARC</p>
        </div>

        <MediathequeClient sermons={sermons} featured={featured} />
      </div>
    </>
  );
}
