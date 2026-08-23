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
    bg: '#0d5ddf',
  },
  {
    id: 'sc-2',
    num: '02',
    badge: 'Philosophy',
    title: 'Zero Folder Architecture',
    desc: 'Eliminate cognitive fatigue caused by complex tagging systems.',
    bg: '#f74700',
  },
  {
    id: 'sc-3',
    num: '03',
    badge: 'Omnichannel',
    title: 'Cross-Interface Ingestion',
    desc: 'Collect data continuously via browser extensions, text messaging, or quick native desktop drops.',
    bg: '#259d27',
  },
  {
    id: 'sc-4',
    num: '04',
    badge: 'Context',
    title: 'Auto-Generated Bookmarks',
    desc: 'Product URLs are enriched with live merchant pricing, product imagery, and store metadata automatically.',
    bg: '#faa200',
  },
];

// Card height — leaves a small gap at the bottom so rounded corners show
const CARD_H = 'calc(100vh - 48px)';

export default function StackingCards() {
  useEffect(() => {
    const stackingCards = gsap.utils.toArray('.sticky-card');
    if (stackingCards.length === 0) return;

    const offset = 25;

    // Card 1 starts visible, rest stacked 110vh below
    gsap.set(stackingCards[0], { y: 0 });
    gsap.set(stackingCards.slice(1), { y: '110vh' });

    const stackTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#stack-section-trigger',
        start: 'top top',
        end: `+=${stackingCards.length * 110}vh`,
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
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

    return () => {
      stackTl.scrollTrigger?.kill();
      stackTl.kill();
    };
  }, []);

  return (
    /*
     * z-30 — below the pricing section (z-50) so when the pin
     * releases, pricing cleanly slides over the top of this section.
     * Solid background prevents see-through during the pin.
     */
    <section
       className="bg-[#fff8f4] relative z-40"
      id="stack-section-trigger"
      //style={{ position: 'relative',  background: '#fff8f4' , zIndex: 30 }}
    >
      {/* The pinned wrapper must be exactly 100vh so GSAP can pin it */}
      <div
         className="w-full h-screen flex flex-col items-center justify-start pt-10 px-5 lg:px-20"
        id="stack-viewport"
        // style={{
        //   width: '100%',
        //   height: '100vh',
        //   display: 'flex',
        //   flexDirection: 'column',
        //   alignItems: 'center',
        //   justifyContent: 'flex-start',
        //   padding: '25px 80px 0',
        //   boxSizing: 'border-box',
        //   overflow: 'hidden',
        // }}
      >
        {/* Section header */}
        <div style={{ width: '100%', textAlign: 'center', marginBottom: '30px', flexShrink: 0 }}>
          <h2
            style={{
              fontFamily: 'Hanken Grotesk, sans-serif',
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '-0.04em',
              lineHeight: 0.88,
              marginBottom: '10px',
            }}
          >
            Built for the <br />
            <span style={{ color: '#0d5ddf' }}>Modern Mind.</span>
          </h2>
          <p style={{ color: 'rgba(0,0,0,0.55)', fontSize: '1.1rem', fontWeight: 500, fontFamily: 'DM Sans, sans-serif' }}>
            Uncompromising tools for your digital evolution.
          </p>
        </div>

        {/*
         * Card stack.
         * Height: fills the remaining viewport space minus the header (~160px).
         * Each card is absolutely stacked, GSAP animates y to slide them in.
         */}
        <div
          className="sticky-cards-container"
          style={{
            paddingTop: '2rem',
            paddingBottom: '20rem',
            position: 'relative',
            width: '100%',
            maxWidth: '1280px',
            flex: 1,           // fill remaining height
            overflow: 'visible',
          
          }}
        >
          {CARDS_DATA.map((card) => (
            <div
              key={card.id}
              id={card.id}
              className="sticky-card"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',   // fills the flex-1 container → nearly full viewport
                backgroundColor: card.bg,
                border: '3px solid black',
                borderRadius: '40px',
                overflow: 'hidden',
                willChange: 'transform',
                display: 'grid',
                gridTemplateRows: 'auto 1fr',   // row 1: number+badge  row 2: title+desc
                padding: '2.5rem 3rem',
                boxSizing: 'border-box',
                color: 'white',
              }}
            >
              {/* Row 1 — ghost number + badge pill */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span
                  style={{
                    fontFamily: 'Hanken Grotesk, sans-serif',
                    fontSize: 'clamp(4rem, 10vw, 8rem)',
                    fontWeight: 900,
                    opacity: 0.18,
                    lineHeight: 1,
                  }}
                >
                  {card.num}
                </span>
                <span
                  style={{
                    padding: '6px 20px',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontFamily: 'Hanken Grotesk, sans-serif',
                  }}
                >
                  {card.badge}
                </span>
              </div>

              {/* Row 2 — title + description, vertically centred in remaining space */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',   // vertical centre of the remaining row
                }}
              >
                <h3
                  style={{
                    fontFamily: 'Hanken Grotesk, sans-serif',
                    fontSize: 'clamp(2rem, 5vw, 5rem)',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    lineHeight: 0.95,
                    marginBottom: '1.25rem',
                  }}
                >
                  {card.title}
                </h3>
                <p
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 'clamp(1rem, 1.5vw, 1.25rem)',
                    opacity: 0.9,
                    lineHeight: 1.6,
                    maxWidth: '36rem',
                    fontWeight: 500,
                  }}
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
