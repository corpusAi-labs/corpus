import Sidebar from '../components/landing/Sidebar';
import HeroSection from '../components/landing/HeroSection';
import ProcessSection from '../components/landing/ProcessSection';
import BentoGallery from '../components/landing/BentoGallery';
import StackingCards from '../components/landing/StackingCards';
import PricingSection from '../components/landing/PricingSection';
import FAQSection from '../components/landing/FAQSection';
import LandingFooter from '../components/landing/LandingFooter';

export default function Landing() {
  return (
    <div className="landing-body min-h-screen relative text-black bg-[#fff8f4]">
      {/* Persistent Background Grid spanning all content */}
      <div className="fixed inset-0 pointer-events-none bg-grid-overlay z-0" />

      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="landing-main-content relative z-10" id="main-content-wrapper">
        <HeroSection />
        <BentoGallery />
        <ProcessSection />
        <StackingCards />
        <PricingSection />
        <FAQSection />
        <LandingFooter />
      </div>
    </div>
  );
}
