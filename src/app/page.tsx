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
import TestimonialsSection    from "@/components/home/TestimonialsSection";
import DonSection             from "@/components/home/DonSection";
import CopilotAssistant       from "@/components/home/CopilotAssistant";
import ContactSection         from "@/components/home/ContactSection";

export default async function HomePage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .eq("key", "hero_subtitle")
    .single();
  const heroSubtitle = data?.value;

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>
        <HeroSection subtitle={heroSubtitle} />
        <FeaturesStrip />
        <AboutSection />
        <SermonsSection />
        <EventsSection />
        <TeamSection />
        <TestimonialsSection />
        <DonSection />
        <CopilotAssistant />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
