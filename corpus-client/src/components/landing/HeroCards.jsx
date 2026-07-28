import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function HeroCards() {
  const containerRef = useRef(null);

  useEffect(() => {
    /*
     * Initial scattered positions.
     *
     * Green  → top-left corner, partially off the left edge so it doesn't
     *           clash with the centred headline.
     * Purple → bottom-left corner, same left alignment as green.
     * Both intentionally sit on the far left so the centred text in the
     * middle of the viewport is never obscured.
     *
     * Blue / Cat / Orange / Yellow stay on the right half.
     */
    gsap.set('#card-green',  { top: '2%',    left: '2%', width: '28%', height: '20%' });
    gsap.set('#card-blue',   { top: '2%',    right: '2%', width: '16%', height: '32%' });
    gsap.set('#card-purple', { bottom: '2%', left: '2%', width: '16%', height: '38%' });
    gsap.set('#card-cat',    { top: '2%',    left: '58%', width: '16%', height: '20%' });
    gsap.set('#card-orange', { bottom: '2%', left: '44%', width: '16%', height: '20%' });
    gsap.set('#card-yellow', { bottom: '2%', right: '2%', width: '16%', height: '20%' });

    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#main-trigger',
        start: 'top top',
        end: '+=250%',
        scrub: 1.5,
        pin: '#sticky-container',
        anticipatePin: 1,
      },
    });

    // Fade out hero text on scroll
    heroTl.to(['#hero-title', '#hero-description'], {
      opacity: 0,
      scale: 0.75,
      //y: -120,
      stagger: 0.1,
      ease: 'power2.inOut',
      duration: 0.8,
    }, 0);

    // Assemble cards into full-screen mosaic
    const gap = 15;
    heroTl
      .to('#card-green',  { top: `${gap}px`, left: `${gap}px`, width: 'calc(66.6% - 22.5px)', height: 'calc(40% - 15px)',   ease: 'expo.inOut', duration: 1 }, 0)
      .to('#card-blue',   { top: `${gap}px`, right: `${gap}px`, width: 'calc(33.3% - 22.5px)', height: 'calc(65% - 15px)', ease: 'expo.inOut', duration: 1 }, 0)
      .to('#card-purple', { top: 'calc(40% + 15px)', left: `${gap}px`, width: 'calc(33.3% - 22.5px)', height: 'calc(60% - 30px)', ease: 'expo.inOut', duration: 1 }, 0.05)
      .to('#card-cat',    { top: 'calc(40% + 15px)', left: 'calc(33.3% + 7.5px)', width: 'calc(33.3% - 15px)', height: 'calc(30% - 15px)', ease: 'expo.inOut', duration: 1 }, 0.1)
      .to('#card-orange', { top: 'calc(70% + 15px)', left: 'calc(33.3% + 7.5px)', width: 'calc(33.3% - 15px)', height: 'calc(30% - 30px)', ease: 'expo.inOut', duration: 1 }, 0.15)
      .to('#card-yellow', { top: 'calc(65% + 15px)', right: `${gap}px`, width: 'calc(33.3% - 22.5px)', height: 'calc(35% - 30px)', ease: 'expo.inOut', duration: 1 }, 0.2);

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    /* z-20 — cards float above the z-10 hero text */
    <div className="absolute inset-0 z-20 pointer-events-none" ref={containerRef}>
      <div id="card-green"  className="card bg-[#259d27]" />
      <div id="card-blue"   className="card bg-[#0d5ddf]" />
      <div id="card-purple" className="card bg-[#9439f9]" />
      <div id="card-cat"    className="card bg-white">
        <img
          alt="Cat Illustration"
          className="cat-img"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuALxOxWAxCl3BQ-ItRhEj5LSZiF5ESjdWpHZIuPQ2UuIvkekUP4suU--UsLPybMB8zwz2rJdjWtlAJ3PqrtxFPChCLJ1OuK8c6yQJfC8QdZoNXN9WjGlQjNkDzPlJMoq6m8-D9fJn0s_QDbog-IXhd70R7t4tkYZSq5NKk1_SIWHM0KRZU0AmfGDw7WyBRLVngOVZKTnxSdBH_LgSIgJAgEYmfTLdJGkjJMN3nzeDyIisNtHKEghNYBMaYvIqOEfNqsxvQ"
        />
      </div>
      <div id="card-orange" className="card bg-[#f74700]" />
      <div id="card-yellow" className="card bg-[#faa200]" />
    </div>
  );
}
