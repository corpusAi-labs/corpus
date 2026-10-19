import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Text Reveal Scroll component: Solid color letter-by-letter reveal to pure black (no transparency)
function ScrollRevealText({
  text,
  children,
  className = '',
  revealMode = 'chars',
  startOffset = 88,
  endOffset = 45,
}) {
  const rootRef = useRef(null);
  const textRef = useRef(null);
  const segmentsRef = useRef([]);
  const isVisibleRef = useRef(false);
  const rafRef = useRef(0);
  const content = text || children;

  useEffect(() => {
    const root = rootRef.current;
    const textRoot = textRef.current;
    if (!root || !textRoot) return;

    const allSegments = [];
    textRoot.style.visibility = 'hidden';

    // Solid unrevealed warm paper tone derived from background (#eadfc9), not cold grey
    const DIM_R = 192;
    const DIM_G = 178;
    const DIM_B = 154;
    const DIM_COLOR = `rgb(${DIM_R}, ${DIM_G}, ${DIM_B})`;
    const ACTIVE_COLOR = 'rgb(0, 0, 0)';

    function createCharSpan(char) {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.display = 'inline';
      span.style.color = DIM_COLOR;
      span.style.opacity = '1';
      span.style.willChange = 'color';
      return span;
    }

    function createWordSpan(word) {
      const span = document.createElement('span');
      span.textContent = word;
      span.style.display = 'inline';
      span.style.color = DIM_COLOR;
      span.style.opacity = '1';
      span.style.willChange = 'color';
      return span;
    }

    function processNodeRecursively(el) {
      const originalChildren = Array.from(el.childNodes);
      for (const node of originalChildren) {
        if (node.nodeType === Node.TEXT_NODE) {
          const str = node.textContent || '';
          if (!str.length) continue;
          const frag = document.createDocumentFragment();
          if (revealMode === 'chars') {
            for (const char of str) {
              if (char === ' ') {
                frag.appendChild(document.createTextNode(' '));
              } else {
                const span = createCharSpan(char);
                frag.appendChild(span);
                allSegments.push(span);
              }
            }
          } else {
            const parts = str.split(/(\s+)/);
            for (const part of parts) {
              if (!part) continue;
              if (/^\s+$/.test(part)) {
                frag.appendChild(document.createTextNode(part));
              } else {
                const span = createWordSpan(part);
                frag.appendChild(span);
                allSegments.push(span);
              }
            }
          }
          node.parentNode?.replaceChild(frag, node);
          continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const childEl = node;
        if (childEl.tagName === 'BR') {
          childEl.style.display = 'inline';
          childEl.style.color = DIM_COLOR;
          childEl.style.opacity = '1';
          childEl.style.willChange = 'color';
          allSegments.push(childEl);
          continue;
        }
        processNodeRecursively(childEl);
      }
    }

    processNodeRecursively(textRoot);
    segmentsRef.current = allSegments;
    textRoot.style.visibility = 'visible';

    const computeReveal = () => {
      if (!isVisibleRef.current) return;
      const rect = root.getBoundingClientRect();
      const vh = window.innerHeight;
      const startPx = vh * (startOffset / 100);
      const endPx = vh * (endOffset / 100);
      const totalRange = rect.height + (startPx - endPx);
      const scrolled = startPx - rect.top;
      const progress = Math.min(Math.max(scrolled / totalRange, 0), 1);
      const total = segmentsRef.current.length;
      const litCount = Math.floor(progress * total);

      segmentsRef.current.forEach((seg, i) => {
        if (i < litCount) {
          seg.style.color = ACTIVE_COLOR;
        } else if (i === litCount) {
          const frac = progress * total - litCount;
          const r = Math.round(DIM_R * (1 - frac));
          const g = Math.round(DIM_G * (1 - frac));
          const b = Math.round(DIM_B * (1 - frac));
          seg.style.color = `rgb(${r}, ${g}, ${b})`;
        } else {
          seg.style.color = DIM_COLOR;
        }
        seg.style.opacity = '1';
      });
    };

    const scheduleReveal = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(computeReveal);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        isVisibleRef.current = entries[0].isIntersecting;
        if (isVisibleRef.current) scheduleReveal();
      },
      { rootMargin: '200px 0px 200px 0px', threshold: 0 }
    );
    observer.observe(root);

    window.addEventListener('scroll', scheduleReveal, { passive: true });
    window.addEventListener('resize', scheduleReveal, { passive: true });

    scheduleReveal();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', scheduleReveal);
      window.removeEventListener('resize', scheduleReveal);
      observer.disconnect();
      segmentsRef.current = [];
    };
  }, [content, revealMode, startOffset, endOffset]);

  return (
    <div ref={rootRef} className="relative w-full">
      <p ref={textRef} className={`${className} text-black`}>
        {content}
      </p>
    </div>
  );
}

export default function ProcessSection() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      const stepTriggers = gsap.utils.toArray('.process-step-trigger');
      stepTriggers.forEach((step, i) => {
        const card = step.querySelector('.process-card');
        if (!card) return;
        gsap.fromTo(
          card,
          { y: 60, opacity: 0.7, scale: 0.98 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            scrollTrigger: {
              trigger: step,
              start: 'top bottom-=5%',
              end: 'top center+=15%',
              scrub: 1,
            },
          }
        );
      });
    });

    ScrollTrigger.sort();
    ScrollTrigger.refresh();

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <section className="bg-transparent py-24 sm:py-36 px-5 lg:px-20 relative" id="how-it-works">
      
      {/* Section Header */}
      <div className="max-w-5xl mx-auto relative z-10 text-center mb-24 sm:mb-36">
        <div className="mb-4 flex justify-center">
          <span className="font-architect text-[18px] sm:text-[22px] text-[#5b5b5b] tracking-wider inline-flex items-center gap-2 border-b border-[#5b5b5b]/60 pb-0.5">
            THE PROCESS
          </span>
        </div>
        <h2 className="font-f37 text-[54px] sm:text-[72px] lg:text-[94px] leading-[0.92] text-black tracking-tight uppercase">
          How It Works
        </h2>
      </div>

      <div className="max-w-6xl mx-auto space-y-28 sm:space-y-44">
        
        {/* Step 1: Capture */}
        <div className="process-step-trigger flex flex-col lg:flex-row items-center gap-12 lg:gap-18 xl:gap-24 justify-center">
          
          {/* Minimalist Card 1 (Blue) */}
          <div 
            className="process-card w-full lg:w-[480px] xl:w-[520px] h-[380px] sm:h-[420px] border border-[#424242]/25 rounded-[14px] sm:rounded-[18px] p-7 sm:p-9 relative flex flex-col justify-between overflow-hidden"
            style={{
              backgroundColor: '#1d52d8',
              backgroundImage: 'url(/images/pricing-3.jpg)',
              backgroundRepeat: 'repeat',
              backgroundSize: 'cover',
              boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.12)',
            }}
          >
            
            {/* Minimalist Header Metadata */}
            <div className="z-10">
              <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-4 font-mono text-[11px] text-white/80 tracking-wider">
                <span>[ 01 // CAPTURE ]</span>
              </div>

              <h3 className="font-f37 text-[32px] sm:text-[40px] leading-[0.96] text-white tracking-tight uppercase">
                Save without <br />
                deciding.
              </h3>
            </div>

            {/* Light Grey Drop Box */}
            <div 
              className="process-drop-box z-10 border border-dashed border-[#424242]/30 rounded-xl p-4 sm:p-5 flex flex-col justify-between h-40 font-mono overflow-hidden"
              style={{
                backgroundColor: '#EFEDE6',
              }}
            >
              <div className="my-auto text-center text-[12px] sm:text-[13px] text-[#1a1a1a] font-medium tracking-tight">
                + DROP LINKS, NOTES, OR SCREENSHOTS
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#6b6b6b] border-t border-[#424242]/20 pt-2">
                <span>NO FOLDERS</span>
                <span>NO TAGGING REQUIRED</span>
              </div>
            </div>

          </div>

          {/* Large Right Text with Scroll Reveal */}
          <div className="w-full lg:w-[500px] xl:w-[560px] text-left">
            <span className="font-architect text-[18px] sm:text-[20px] text-[#5b5b5b] tracking-wider inline-flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-[#1d52d8]" /> 01 / INSTANT CAPTURE
            </span>
            <ScrollRevealText 
              text="Spotted something interesting? Just drop it in. No folders, no tags, no friction. Corpus treats your attention as the only requirement."
              className="font-graphik text-[28px] sm:text-[38px] lg:text-[44px] xl:text-[48px] font-500 -tracking-wider leading-[1.18] text-[#1a1a1a]"
            />
          </div>

        </div>

        {/* Step 2: Processing */}
        <div className="process-step-trigger flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-18 xl:gap-24 justify-center">
          
          {/* Minimalist Card 2 (Red) */}
          <div 
            className="process-card w-full lg:w-[480px] xl:w-[520px] h-[380px] sm:h-[420px] border border-[#424242]/25 rounded-[14px] sm:rounded-[18px] p-7 sm:p-9 relative flex flex-col justify-between overflow-hidden"
            style={{
              backgroundColor: '#ea5834',
              backgroundImage: 'url(/images/pricing-2.jpg)',
              backgroundRepeat: 'repeat',
              backgroundSize: 'cover',
              boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.12)',
            }}
          >
            
            {/* Minimalist Header Metadata */}
            <div className="z-10">
              <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-4 font-mono text-[11px] text-white/80 tracking-wider">
                <span>[ 02 // INDEX ]</span>
              </div>

              <h3 className="font-f37 text-[32px] sm:text-[40px] leading-[0.96] text-white tracking-tight uppercase">
                It files <br />
                itself.
              </h3>
            </div>

            {/* Light Grey Box with Simple Embedding Graph */}
            <div 
              className="process-drop-box z-10 border border-dashed border-[#424242]/30 rounded-xl p-3 sm:p-4 flex items-center justify-center h-40 overflow-hidden"
              style={{
                backgroundColor: '#EFEDE6',
              }}
            >
              <svg viewBox="0 0 320 120" className="w-full h-full max-h-[115px]" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Cluster 1 connecting edges */}
                <line x1="60" y1="50" x2="110" y2="35" stroke="#A19D94" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
                <line x1="60" y1="50" x2="85" y2="85" stroke="#A19D94" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
                <line x1="110" y1="35" x2="85" y2="85" stroke="#A19D94" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
                
                {/* Inter-cluster bridge edges */}
                <line x1="110" y1="35" x2="165" y2="60" stroke="#ea5834" strokeWidth="1.5" strokeDasharray="2 2" />
                <line x1="165" y1="60" x2="210" y2="40" stroke="#ea5834" strokeWidth="1.5" strokeDasharray="2 2" />
                <line x1="165" y1="60" x2="235" y2="80" stroke="#ea5834" strokeWidth="1.5" strokeDasharray="2 2" />

                {/* Cluster 2 connecting edges */}
                <line x1="210" y1="40" x2="265" y2="30" stroke="#A19D94" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
                <line x1="210" y1="40" x2="235" y2="80" stroke="#A19D94" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
                <line x1="265" y1="30" x2="270" y2="75" stroke="#A19D94" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
                <line x1="235" y1="80" x2="270" y2="75" stroke="#A19D94" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />

                {/* Cluster 1 Nodes */}
                <circle cx="60" cy="50" r="4" fill="#6b6b6b" />
                <circle cx="85" cy="85" r="3.5" fill="#888888" />
                <circle cx="110" cy="35" r="4.5" fill="#6b6b6b" />

                {/* Active Center Embedding Vector Node */}
                <circle cx="165" cy="60" r="12" fill="#ea5834" fillOpacity="0.2" />
                <circle cx="165" cy="60" r="6" fill="#ea5834" />
                <circle cx="165" cy="60" r="2.5" fill="#ffffff" />

                {/* Cluster 2 Nodes */}
                <circle cx="210" cy="40" r="4.5" fill="#6b6b6b" />
                <circle cx="265" cy="30" r="3.5" fill="#888888" />
                <circle cx="235" cy="80" r="5" fill="#1d52d8" />
                <circle cx="270" cy="75" r="4" fill="#6b6b6b" />
              </svg>
            </div>

          </div>

          {/* Large Left Text with Scroll Reveal */}
          <div className="w-full lg:w-[500px] xl:w-[560px] text-left">
            <span className="font-architect text-[18px] sm:text-[20px] text-[#5b5b5b] tracking-wider inline-flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-[#ea5834]" /> 02 / NEURAL INDEXING
            </span>
            <ScrollRevealText 
              text="Our neural engine analyzes every pixel and syllable. It builds connections between your ideas automatically, creating a semantic map of your digital mind."
              className="font-graphik text-[28px] sm:text-[38px] lg:text-[44px] xl:text-[48px] font-500 -tracking-wider leading-[1.18] text-[#1a1a1a]"
            />
          </div>

        </div>

        {/* Step 3: Recall */}
        <div className="process-step-trigger flex flex-col lg:flex-row items-center gap-12 lg:gap-18 xl:gap-24 justify-center">
          
          {/* Minimalist Card 3 (Green) */}
          <div 
            className="process-card w-full lg:w-[480px] xl:w-[520px] h-[380px] sm:h-[420px] border border-[#424242]/25 rounded-[14px] sm:rounded-[18px] p-7 sm:p-9 relative flex flex-col justify-between overflow-hidden"
            style={{
              backgroundColor: '#258b30',
              backgroundImage: 'url(/images/pricing-1.jpg)',
              backgroundBlendMode: 'multiply',
              backgroundRepeat: 'repeat',
              backgroundSize: 'cover',
              boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.12)',
            }}
          >
            
            {/* Minimalist Header Metadata */}
            <div className="z-10">
              <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-4 font-mono text-[11px] text-white/80 tracking-wider">
                <span>[ 03 // RETRIEVE ]</span>
              </div>

              <h3 className="font-f37 text-[32px] sm:text-[40px] leading-[0.96] text-white tracking-tight uppercase">
                You ask, <br />
                it answers.
              </h3>
            </div>

            {/* Light Grey Box with Clean Searching Typing Bar */}
            <div 
              className="process-drop-box z-10 border border-dashed border-[#424242]/30 rounded-xl p-4 sm:p-5 flex flex-col justify-center h-40 overflow-hidden"
              style={{
                backgroundColor: '#EFEDE6',
              }}
            >
              <div className="bg-white border border-[#424242]/25 rounded-lg px-3.5 py-3 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <svg className="w-4 h-4 text-[#7a7a7a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="font-mono text-[12px] sm:text-[13px] text-[#1a1a1a] truncate">
                    "that quote on architecture..."
                  </span>
                  <span className="w-0.5 h-4 bg-[#258b30] inline-block animate-pulse -ml-1 flex-shrink-0" />
                </div>
                <kbd className="text-[10px] font-mono bg-black/5 px-1.5 py-0.5 rounded border border-black/10 text-black/40 flex-shrink-0 ml-2">
                  ↵
                </kbd>
              </div>
            </div>

          </div>

          {/* Large Right Text with Scroll Reveal */}
          <div className="w-full lg:w-[500px] xl:w-[560px] text-left">
            <span className="font-architect text-[18px] sm:text-[20px] text-[#5b5b5b] tracking-wider inline-flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-[#258b30]" /> 03 / EFFORTLESS RECALL
            </span>
            <ScrollRevealText 
              text="Forgotten where you saw that quote? Ask Corpus in plain English. Your memories surface instantly, curated by relevance, not just keywords."
              className="font-graphik text-[28px] sm:text-[38px] lg:text-[44px] xl:text-[48px] font-500 -tracking-wider leading-[1.18] text-[#1a1a1a]"
            />
          </div>

        </div>

      </div>

    </section>
  );
}
