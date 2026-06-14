import Header         from "@/components/layout/Header";
import Footer         from "@/components/layout/Footer";
import HeroSection    from "@/components/home/HeroSection";
import FeaturesStrip  from "@/components/home/FeaturesStrip";
import AboutSection   from "@/components/home/AboutSection";
import SermonsSection from "@/components/home/SermonsSection";
import EventsSection  from "@/components/home/EventsSection";
import TeamSection    from "@/components/home/TeamSection";
import DonSection     from "@/components/home/DonSection";
import ContactSection from "@/components/home/ContactSection";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FeaturesStrip />
        <AboutSection />
        <SermonsSection />
        <EventsSection />
        <TeamSection />
        <DonSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
