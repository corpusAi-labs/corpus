import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PaperButton from './PaperButton';

gsap.registerPlugin(ScrollTrigger);

export default function PricingSection() {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const bgElRef = useRef(null);
  const card1Ref = useRef(null);
  const card2Ref = useRef(null);
  const card3Ref = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const bgEl = bgElRef.current;
    const card1 = card1Ref.current;
    const card2 = card2Ref.current;
    const card3 = card3Ref.current;

    if (!section || !bgEl) return;

    const ctx = gsap.context(() => {
      const isDesktop = window.innerWidth >= 1024;

      // 1. Tilted cardboard folder straightening animation (exactly matching illoca reference)
      gsap.fromTo(
        bgEl,
        { 
          rotation: isDesktop ? -10 : -4,
          y: isDesktop ? 140 : 60,
          transformOrigin: 'top right' 
        },
        {
          rotation: 0,
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'top 5%',
            scrub: 1.2,
          },
        }
      );

      // 2. The 3 internal paper cards flying up while rotating into place (illoca reference: -30deg, -20deg, -10deg)
      if (card1 && card2 && card3) {
        if (isDesktop) {
          const cardsTl = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: 'top 90%',
              end: 'top -10%',
              scrub: 1.2,
            },
          });

          cardsTl
            .fromTo(card1, { rotation: -30, y: '80%', opacity: 0.7, transformOrigin: 'center center' }, { rotation: 0, y: 0, opacity: 1, ease: 'power2.inOut' }, 0)
            .fromTo(card2, { rotation: -20, y: '80%', opacity: 0.7, transformOrigin: 'center center' }, { rotation: 0, y: 0, opacity: 1, ease: 'power2.inOut' }, 0.05)
            .fromTo(card3, { rotation: -10, y: '80%', opacity: 0.7, transformOrigin: 'center center' }, { rotation: 0, y: 0, opacity: 1, ease: 'power2.inOut' }, 0.1);
        } else {
          gsap.fromTo(
            [card1, card2, card3],
            { y: 60, opacity: 0.8, rotation: (i) => [-6, 0, 6][i], transformOrigin: 'center center' },
            {
              y: 0,
              opacity: 1,
              rotation: 0,
              stagger: 0.08,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 85%',
                end: 'top 20%',
                scrub: 1.2,
              },
            }
          );
        }
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={sectionRef} 
      id="pricing" 
      className="relative z-30 pt-36 sm:pt-48 lg:pt-60 pb-0 w-full overflow-x-clip"
    >
      {/* Full Width Edge-to-Edge Cardboard Folder without side padding/margin */}
      <div 
        ref={bgElRef}
        className="w-full relative origin-top-right will-change-transform"
        style={{ transform: 'rotate(-10deg)' }}
      >
        {/* Top Folder Tab (placed at z-1 so content-pricing at z-2 sits over the bottom seam) */}
        <div className="absolute top-0 -translate-y-[calc(100%-6px)] left-6 sm:left-16 lg:left-28 h-9 sm:h-12 w-40 sm:w-64 flex items-center justify-center z-1">
          <svg 
            id="pricingTab" 
            viewBox="0 0 296.86 55.23" 
            className="absolute size-full inset-0 tab-shadow"
          >
            <defs>
              <pattern id="pricingBg" patternUnits="userSpaceOnUse" width="296" height="55">
                <image 
                  href="/images/pricing.jpg" 
                  x="0" 
                  y="0" 
                  width="296" 
                  height="300" 
                  preserveAspectRatio="xMidYMid slice" 
                />
              </pattern>
            </defs>
            <path 
              fill="url(#pricingBg)" 
              d="M.68,55.09c18,0,33.61-11.42,37.64-27.55h.01C42.39,11.43,58,0,75.98,0h145.6c18,0,33.61,11.42,37.64,27.55,4.05,16.12,19.66,27.55,37.64,27.55L0,55.23" 
            />
          </svg>
          <span className="relative z-10 font-geist tracking-[0.25em] uppercase font-500 text-12 sm:text-14 text-[#373737]">
            Pricing
          </span>
        </div>

        {/* Main Full-Width Cardboard Content Area */}
        <div 
          className="content-pricing w-full pt-10 sm:pt-14 lg:pt-16 pb-48 sm:pb-56 lg:pb-64 px-4 sm:px-8 relative z-2 flex flex-col items-center"
          style={{ 
            boxShadow: '4px 4px 0 rgba(0,0,0,0.1)',
            borderBottom: '1px solid rgba(66,66,66,0.2)',
          }}
        >
          {/* Header Callout */}
          <h3 className="text-20 sm:text-24 lg:text-28 text-center font-500 font-graphik leading-tight -tracking-wider mb-8 sm:mb-10 text-[#212121]">
            Get <span className="emph font-600 text-black">1,000 starter credits</span> when you sign up today.
          </h3>

          {/* 3 Pricing Cards Grid - Centered, matching height for Card 1 & Card 3 */}
          <div className="w-full flex flex-col lg:flex-row justify-center items-center lg:items-start gap-6 lg:gap-0 max-w-[1140px]">
            
            {/* Card 1: Corpus Lite (White / Ivory Paper) - Height exactly 395px */}
            <div 
              ref={card1Ref}
              className="pricing-card card--white text-black border border-[#424242]/20 w-full sm:w-[340px] lg:w-[355px] lg:-mr-2 relative z-1 rounded-[2px] flex flex-col justify-between h-[395px] will-change-transform"
              style={{
                boxShadow: '4px 4px 0 rgba(0,0,0,0.08)',
              }}
            >
              <div>
                <h2 className="font-graphik text-26 sm:text-28 font-500 leading-none -tracking-wider text-center mb-1.5">
                  Corpus Lite
                </h2>
                <h3 className="text-[#888] text-center font-graphik font-500 leading-normal -tracking-wider mb-4 text-14 sm:text-15">
                  ₹199 / month
                </h3>

                <ul className="pricing-list font-graphik font-500 leading-normal -tracking-wider text-13 sm:text-14 text-[#373737]">
                  <li>500 saves per month</li>
                  <li>AI tagging + TLDR</li>
                  <li>All save types (link, note, quote, image)</li>
                  <li>Regular updates</li>
                  <li>Semantic search</li>
                  <li>Up to 25 Spaces</li>
                </ul>
              </div>

              <div className="flex justify-center pt-2">
                <PaperButton 
                  text="Corpus Lite"
                  isBlue={false}
                  onClick={() => navigate('/signup')}
                  className="w-48 sm:w-52"
                />
              </div>
            </div>

            {/* Card 2: Corpus Pro (Terracotta Red Paper - RAISED & TALLER) */}
            <div 
              ref={card2Ref}
              className="pricing-card card--red text-[#FEF9F1] border border-[#424242]/30 w-full sm:w-[350px] lg:w-[370px] lg:-mt-7 relative z-10 rounded-[2px] flex flex-col justify-between h-[435px] will-change-transform"
              style={{
                boxShadow: '6px 6px 0 rgba(0,0,0,0.14)',
              }}
            >
              <div>
                <h2 className="font-graphik text-28 sm:text-32 font-500 leading-none -tracking-wider text-center mb-1.5 text-white">
                  Corpus Pro
                </h2>
                <h3 className="text-[#DECFB2] text-center font-graphik font-500 leading-normal -tracking-wider mb-5 text-14 sm:text-15">
                  ₹499 / month
                </h3>

                <ul className="pricing-list pricing-list--light font-graphik font-500 leading-normal -tracking-wider text-13 sm:text-14 text-[#FEF9F1]">
                  <li>2,000 saves per month</li>
                  <li>AI tagging + TLDR</li>
                  <li>All save types + browser extension</li>
                  <li>Semantic search</li>
                  <li>Unlimited Spaces</li>
                  <li>Priority AI processing</li>
                </ul>
              </div>

              <div className="flex justify-center pt-2">
                <PaperButton 
                  text="Corpus Pro"
                  isBlue={true}
                  onClick={() => navigate('/signup')}
                  className="w-48 sm:w-52"
                />
              </div>
            </div>

            {/* Card 3: Corpus Team (Blueprint Blue Paper) - EXACT SAME HEIGHT AS CARD 1 (395px) */}
            <div 
              ref={card3Ref}
              className="pricing-card card--blue text-[#FEF9F1] border border-[#424242]/25 w-full sm:w-[340px] lg:w-[355px] lg:-ml-2 relative z-1 rounded-[2px] flex flex-col justify-between h-[395px] will-change-transform"
              style={{
                boxShadow: '4px 4px 0 rgba(0,0,0,0.08)',
              }}
            >
              <div>
                <h2 className="font-graphik text-26 sm:text-28 font-500 leading-none -tracking-wider text-center mb-1.5 text-white">
                  Corpus Team
                </h2>
                <h3 className="text-[#DECFB2] text-center font-graphik font-500 leading-normal -tracking-wider mb-4 text-14 sm:text-15">
                  ₹999 / month
                </h3>

                <ul className="pricing-list pricing-list--light font-graphik font-500 leading-normal -tracking-wider text-13 sm:text-14 text-[#FEF9F1]">
                  <li>Everything in Pro</li>
                  <li>Unlimited saves per month</li>
                  <li>Team access (up to 10 seats)</li>
                  <li>Shared library & cloud sync</li>
                  <li>Export archive (JSON/CSV)</li>
                  <li>Priority support & early access</li>
                </ul>
              </div>

              <div className="flex justify-center pt-2">
                <PaperButton 
                  text="Corpus Team"
                  isBlue={false}
                  onClick={() => navigate('/signup')}
                  className="w-48 sm:w-52"
                />
              </div>
            </div>

          </div>

          {/* Bottom Credits Footnote - With clear margin above the overlap */}
          <p className="text-center text-12 font-geist text-[#736e65] mt-8 mb-0">
            Free plan includes 100 credits that refresh every month.
          </p>
        </div>
      </div>
    </section>
  );
}
