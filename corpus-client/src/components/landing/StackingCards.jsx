import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CARDS_DATA = [
  {
    id: 'sc-1',
    num: '01',
    badge: 'Efficiency',
    title: 'Frictionless Capture',
    desc: 'Collect data continuously via browser extensions, text messaging, or quick native desktop drops.',
    bgImg: '/images/pricing-1.jpg',
    bgColor: '#fdfbf7',
    textColor: 'text-black',
    subColor: 'text-black/75',
    numberColor: 'text-black/25',
    pillBorder: 'border border-[#424242]/30 text-black/85 bg-black/[0.03]',
    cardBorder: 'border border-[#424242]/20',
  },
  {
    id: 'sc-2',
    num: '02',
    badge: 'Philosophy',
    title: 'Zero Folder Architecture',
    desc: 'Eliminate cognitive fatigue caused by complex tagging systems.',
    bgImg: '/images/pricing-2.jpg',
    bgColor: '#ea5834',
    textColor: 'text-white',
    subColor: 'text-white/90',
    numberColor: 'text-white/30',
    pillBorder: 'border border-white/40 text-white/95 bg-white/[0.08]',
    cardBorder: 'border border-[#424242]/30',
  },
  {
    id: 'sc-3',
    num: '03',
    badge: 'Omnichannel',
    title: 'Cross-Interface Ingestion',
    desc: 'Connect your entire workflow seamlessly across browser extensions, native drops, and mobile apps.',
    bgImg: '/images/pricing-3.jpg',
    bgColor: '#1d52d8',
    textColor: 'text-white',
    subColor: 'text-white/90',
    numberColor: 'text-white/30',
    pillBorder: 'border border-white/40 text-white/95 bg-white/[0.08]',
    cardBorder: 'border border-[#424242]/25',
  },
  {
    id: 'sc-4',
    num: '04',
    badge: 'Context',
    title: 'Auto-Generated Bookmarks',
    desc: 'Product URLs are enriched with live merchant pricing, product imagery, and store metadata automatically.',
    bgImg: '/images/pricing.jpg',
    bgColor: '#eadfc9',
    textColor: 'text-black',
    subColor: 'text-black/75',
    numberColor: 'text-black/25',
    pillBorder: 'border border-[#424242]/30 text-black/85 bg-black/[0.03]',
    cardBorder: 'border border-[#424242]/20',
  },
];

export default function StackingCards() {
  useEffect(() => {
    const stackingCards = gsap.utils.toArray('.sticky-card');
    if (stackingCards.length === 0) return;

    const offset = 22;

    const ctx = gsap.context(() => {
      // Card 1 starts visible, rest stacked below
      gsap.set(stackingCards[0], { y: 0 });
      gsap.set(stackingCards.slice(1), { y: '110vh' });

      const stackTl = gsap.timeline({
        scrollTrigger: {
          trigger: '#stack-section-trigger',
          start: 'top top',
          end: `+=${stackingCards.length * 100}vh`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      stackingCards.forEach((card, i) => {
        if (i > 0) {
          stackTl.to(
            card,
            { y: i * offset, ease: 'none', duration: 2 },
            (i - 1) * 2
          );
        }
      });
    });

    ScrollTrigger.sort();
    ScrollTrigger.refresh();

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <section
      className="relative z-30 w-full bg-[#eadfc9]"
      id="stack-section-trigger"
    >
      {/* Pinned 100vh viewport */}
      <div
        className="w-full h-screen min-h-[640px] flex flex-col items-center justify-start pt-5 sm:pt-7 pb-8 sm:pb-12 px-4 sm:px-8 lg:px-16 box-border overflow-visible"
        id="stack-viewport"
      >
        {/* Section Header */}
        <div className="w-full text-center mb-3 sm:mb-5 flex-shrink-0">
          <h2 className="font-hanken text-3xl sm:text-5xl lg:text-6xl font-900 uppercase tracking-tight leading-[0.9] mb-1.5 text-black">
            Built for the <br />
            <span className="text-[#1d52d8]">Modern Mind.</span>
          </h2>
          <p className="font-graphik text-xs sm:text-sm text-black/60 font-medium">
            Uncompromising tools for your digital evolution.
          </p>
        </div>

        {/* Card stack container — sized so translated cards never clip at bottom */}
        <div
          className="sticky-cards-container relative w-full max-w-[1240px] flex-1 max-h-[540px] overflow-visible"
        >
          {CARDS_DATA.map((card) => (
            <div
              key={card.id}
              id={card.id}
              className={`sticky-card absolute inset-x-0 top-0 w-full h-[430px] sm:h-[470px] lg:h-[510px] max-h-[calc(100vh-230px)] rounded-[24px] sm:rounded-[36px] ${card.cardBorder} overflow-hidden p-6 sm:p-10 lg:p-12 will-change-transform flex flex-col justify-start`}
              style={{
                backgroundColor: card.bgColor,
                backgroundImage: `url(${card.bgImg})`,
                backgroundRepeat: 'repeat',
                backgroundSize: 'cover',
                boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.12)',
              }}
            >
              {/* Row 1 — Large watermark number + badge pill */}
              <div className="flex justify-between items-start z-10 w-full">
                <span
                  className={`font-hanken text-5xl sm:text-6xl lg:text-7xl font-900 leading-none select-none ${card.numberColor}`}
                  style={{ lineHeight: 1 }}
                >
                  {card.num}
                </span>
                <span
                  className={`px-4 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider font-hanken ${card.pillBorder} backdrop-blur-xs`}
                >
                  {card.badge}
                </span>
              </div>

              {/* Row 2 — Title + Description with decreased top space gap & ample bottom padding */}
              <div className="flex flex-col justify-start z-10 max-w-4xl mt-3 sm:mt-5 lg:mt-6 pb-6 sm:pb-10">
                <h3
                  className={`font-hanken text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-900 uppercase leading-[0.92] mb-3 sm:mb-4 tracking-tight ${card.textColor}`}
                >
                  {card.title}
                </h3>
                <p
                  className={`font-graphik text-base sm:text-xl lg:text-2xl font-medium leading-relaxed max-w-3xl ${card.subColor}`}
                >
                  {card.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
