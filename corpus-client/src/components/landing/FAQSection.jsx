import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PaperButton from './PaperButton';

gsap.registerPlugin(ScrollTrigger);

const FAQS = [
  {
    q: 'How does semantic search work in Corpus?',
    a: (
      <p>
        Unlike keyword search, our neural engine indexes the conceptual meaning of your saves. You can search by vibe, feeling, or association (e.g., "brutalist design with orange accents" or "that quote about discipline") and find the exact item instantly across text, links, and screenshots.
      </p>
    ),
  },
  {
    q: 'How does it work with my browser & daily workflow?',
    a: (
      <p>
        Corpus integrates into your flow via a lightweight browser extension and native shortcut (<kbd className="font-mono bg-white/80 px-1 py-0.5 rounded border border-[#A19D94]/50 text-xs">Cmd+Shift+S</kbd>). It captures clean article text, full DOM snapshots, and product imagery with zero manual tagging.
      </p>
    ),
  },
  {
    q: 'How accurate are the AI summaries and auto-tags?',
    a: (
      <p>
        Corpus uses high-precision spatial and language models to extract key takeaways, merchant pricing, and conceptual tags. You can edit any tag manually, but over 95% of saves require zero post-processing.
      </p>
    ),
  },
  {
    q: 'Who owns my saved data, and is it private?',
    a: (
      <p>
        You own your data 100%. All ingested notes, links, and documents are encrypted at rest with AES-256 and never used to train public models. You can export your entire database anytime in JSON, CSV, or Markdown.
      </p>
    ),
  },
  {
    q: 'How do credits work? Am I charged for every click?',
    a: (
      <p>
        No. Browsing, reading, and full-text searching your library is completely free and unlimited. Credits are only used for heavy AI computations like multi-document synthesis, deep OCR extraction, and automated longform summarization. Every account gets 1,000 free starter credits.
      </p>
    ),
  },
];

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState(-1);
  const sectionRef = useRef(null);
  const bgElRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const bgEl = bgElRef.current;
    if (!section || !bgEl) return;

    const ctx = gsap.context(() => {
      const isDesktop = window.innerWidth >= 1024;

      // Smoothly move the folder up and straighten on scroll to 0deg
      gsap.fromTo(
        bgEl,
        { 
          rotation: isDesktop ? 5 : 3, 
          y: isDesktop ? 80 : 30,
          transformOrigin: 'top left' 
        },
        {
          rotation: 0,
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'top 20%',
            scrub: 1.2,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const toggle = (idx) => {
    setOpenIdx(openIdx === idx ? -1 : idx);
  };

  return (
    <section 
      ref={sectionRef} 
      id="faqs" 
      className="relative z-40 -mt-24 sm:-mt-32 lg:-mt-40 pb-28 w-full overflow-x-clip"
    >
      {/* Full Width Edge-to-Edge Cardboard Folder that overlaps Pricing smoothly */}
      <div 
        ref={bgElRef}
        className="w-full relative origin-top-left will-change-transform"
        style={{ transform: 'rotate(5deg)' }}
      >
        {/* Top Folder Tab (placed at z-1 so content-faqs at z-2 sits over the bottom seam) */}
        <div className="absolute top-0 -translate-y-[calc(100%-6px)] left-6 sm:left-24 lg:left-48 h-9 sm:h-12 w-40 sm:w-64 flex items-center justify-center z-1">
          <svg 
            id="Layer_2" 
            viewBox="0 0 296.86 55.23" 
            className="absolute size-full inset-0 tab-shadow"
          >
            <defs>
              <pattern id="faqsBg" patternUnits="userSpaceOnUse" width="296" height="55">
                <image 
                  href="/images/faqs.jpg" 
                  x="0" 
                  y="0" 
                  width="296" 
                  height="300" 
                  preserveAspectRatio="xMidYMid slice" 
                />
              </pattern>
            </defs>
            <path 
              fill="url(#faqsBg)" 
              d="M.68,55.09c18,0,33.61-11.42,37.64-27.55h.01C42.39,11.43,58,0,75.98,0h145.6c18,0,33.61,11.42,37.64,27.55,4.05,16.12,19.66,27.55,37.64,27.55L0,55.23" 
            />
          </svg>
          <span className="relative z-10 font-geist tracking-[0.25em] uppercase font-500 text-12 sm:text-14 text-[#373737]">
            FAQs
          </span>
        </div>

        {/* Main Full-Width Cardboard Content Area */}
        <div 
          className="content-faqs w-full pt-10 sm:pt-14 lg:pt-16 pb-14 sm:pb-20 lg:pb-24 px-4 sm:px-8 relative z-2"
          style={{ 
            boxShadow: '6px 6px 0 rgba(0,0,0,0.12)',
            borderBottom: '1px solid rgba(66,66,66,0.2)',
          }}
        >
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-14 max-w-[1140px] mx-auto items-start">
            
            {/* Left Column: Heading & Contact Button (Matching Screenshot 3) */}
            <div className="w-full lg:w-4/12 flex flex-col items-start">
              <div className="mb-3">
                <span className="font-architect text-18 sm:text-20 text-[#5b5b5b] tracking-wider inline-flex items-center gap-2 border-b border-[#5b5b5b]/60 pb-0.5">
                  NEED HELP?
                </span>
              </div>

              <h3 className="font-f37 text-42 sm:text-54 lg:text-68 leading-[0.9] text-black mb-6">
                Frequently Asked Questions
              </h3>

              <PaperButton 
                text="support@corpus.ai"
                isBlue={false}
                href="mailto:support@corpus.ai"
                className="w-56"
              />
            </div>

            {/* Right Column: Accordion with Dashed Borders (Matching Screenshot 3) */}
            <div className="w-full lg:w-8/12 lg:pt-4 flex flex-col">
              {FAQS.map((faq, idx) => {
                const isOpen = openIdx === idx;
                return (
                  <div 
                    key={idx}
                    className="border-b border-dashed border-[#313131]/70 py-3 sm:py-3.5 w-full text-left"
                  >
                    <button 
                      onClick={() => toggle(idx)}
                      aria-expanded={isOpen}
                      className="w-full font-graphik text-15 sm:text-17 lg:text-18 -tracking-wider leading-[1.3] font-500 flex justify-between gap-4 items-center text-left cursor-pointer group"
                    >
                      <span className="text-[#212121] group-hover:text-black transition-colors">
                        {faq.q}
                      </span>
                      
                      {/* Square Indicator with SVG Chevron that rotates */}
                      <span className="w-7 h-6 sm:w-8 sm:h-7 flex items-center justify-center shrink-0 bg-[#e5d6bc] rounded-[2px] shadow-sm border border-[#A19D94]/50">
                        <svg 
                          viewBox="0 0 12 10" 
                          className={`w-3 h-2.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                        >
                          <path 
                            fill="#1d52d8" 
                            fillRule="evenodd" 
                            clipRule="evenodd" 
                            d="M5.734 9.903a.414.414 0 0 0 .532 0l5.625-4.972A.3.3 0 0 0 12 4.699V.332c0-.296-.4-.444-.641-.232L6.266 4.602a.414.414 0 0 1-.532 0L.641.1C.408-.106 0 .042 0 .332V4.7c0 .09.036.174.11.232z" 
                          />
                        </svg>
                      </span>
                    </button>

                    {/* Expandable Answer */}
                    <div 
                      className={`text-13 sm:text-14 font-graphik leading-relaxed -tracking-wider text-[#444] overflow-hidden transition-all duration-300 ${
                        isOpen ? 'max-h-[300px] pt-3 pb-1 opacity-100' : 'max-h-0 pt-0 opacity-0'
                      }`}
                    >
                      {faq.a}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
