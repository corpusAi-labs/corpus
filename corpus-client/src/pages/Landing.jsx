import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Sidebar from '../components/landing/Sidebar';
import HeroSection from '../components/landing/HeroSection';
import BentoGallery from '../components/landing/BentoGallery';
import ProcessSection from '../components/landing/ProcessSection';
import StackingCards from '../components/landing/StackingCards';
import PricingSection from '../components/landing/PricingSection';
import FAQSection from '../components/landing/FAQSection';
import LandingFooter from '../components/landing/LandingFooter';

gsap.registerPlugin(ScrollTrigger);

export default function Landing() {
  useEffect(() => {
    const handleRefresh = () => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    };

    const timer1 = setTimeout(handleRefresh, 150);
    const timer2 = setTimeout(handleRefresh, 600);
    document.fonts?.ready?.then(handleRefresh);
    window.addEventListener('load', handleRefresh);
    window.addEventListener('resize', handleRefresh);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('load', handleRefresh);
      window.removeEventListener('resize', handleRefresh);
    };
  }, []);
  return (
    <div className="landing-body min-h-screen relative text-black bg-[#eadfc9]">
      {/* Persistent Cardboard Architectural Grid spanning all content */}
      <div className="fixed inset-0 pointer-events-none bg-grid-cardboard z-0" />

      {/* Tangible Paper Grain Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-[99]"
        style={{
          backgroundImage: 'url(/images/grain-400.jpg)',
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay',
          opacity: 0.16,
        }}
      />

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
