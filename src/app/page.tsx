import { createClient }       from "@/lib/supabase/server";
import AnnouncementBar        from "@/components/home/AnnouncementBar";
import Header                 from "@/components/layout/Header";
import Footer                 from "@/components/layout/Footer";
import HeroSection            from "@/components/home/HeroSection";
import FeaturesStrip          from "@/components/home/FeaturesStrip";
import AboutSection           from "@/components/home/AboutSection";
import SermonsSection         from "@/components/home/SermonsSection";
import EventsSection          from "@/components/home/EventsSection";
import TeamSection            from "@/components/home/TeamSection";
import VersetStrip            from "@/components/home/VersetStrip";
import TestimonialsSection    from "@/components/home/TestimonialsSection";
import DonSection             from "@/components/home/DonSection";
import ContactSection         from "@/components/home/ContactSection";

export default async function HomePage() {
  const supabase = createClient();
  const [
    { data: settingsRows },
    { count: membresCount },
  ] = await Promise.all([
    supabase.from("site_settings").select("key, value")
      .in("key", ["hero_subtitle", "votre_impact_intro", "stats_nations", "stats_touches"]),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("validated", true),
  ]);

  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) settings[row.key] = row.value;

  const heroSubtitle      = settings.hero_subtitle;
  const votre_impact_intro = settings.votre_impact_intro;
  const heroStats = {
    membres: membresCount ?? 0,
    nations: settings.stats_nations || null,
    ans:     new Date().getFullYear() - 2018,
    touches: settings.stats_touches || null,
  };

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>
        <HeroSection subtitle={heroSubtitle} stats={heroStats} />
        <FeaturesStrip />
        <AboutSection />
        <SermonsSection />
        <EventsSection />
        <TeamSection />
        <VersetStrip />
        <TestimonialsSection />
        <DonSection intro={votre_impact_intro} />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
