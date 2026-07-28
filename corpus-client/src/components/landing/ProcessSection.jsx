import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function ProcessSection() {
  useEffect(() => {
    const stepTriggers = gsap.utils.toArray('.process-step-trigger');
    stepTriggers.forEach((step, i) => {
      const card = step.querySelector('.process-card');
      if (!card) return;
      gsap.fromTo(
        card,
        { y: 100, opacity: 0, scale: 0.96, rotation: i % 2 === 0 ? -2 : 2 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          rotation: 0,
          scrollTrigger: {
            trigger: step,
            start: 'top bottom-=10%',
            end: 'top center',
            scrub: 1,
          },
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger && t.trigger.closest('#how-it-works')) {
          t.kill();
        }
      });
    };
  }, []);

  return (
    <section className="bg-transparent py-16 px-5 lg:px-20 relative overflow-hidden" id="how-it-works">
      {/* Section Header */}
      <div className="max-w-7xl mx-auto relative z-10 text-center mb-24">
        <p className="text-[#f74700] font-black uppercase tracking-[0.2em] text-sm mb-4 font-hanken">
          The process
        </p>
        <h2 className="text-7xl lg:text-9xl font-black uppercase tracking-tighter leading-[0.8] mb-0 font-hanken">
          How it <br />
          <span className="text-black/10">works.</span>
        </h2>
      </div>

      <div className="max-w-7xl mx-auto text-center mb-24 px-4 space-y-24">
        {/* Card I - Capture */}
        <div className="process-step-trigger flex flex-col lg:flex-row items-center gap-16 justify-center">
          <div className="process-card w-full lg:w-1/2 aspect-[4/3] bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-3xl p-12 relative flex flex-col justify-between overflow-hidden">
            <div className="roman-numeral-bg absolute top-[-20px] right-[-20px] text-[15rem] font-black italic text-[#0d5ddf]/5 pointer-events-none transition-all duration-500 opacity-0 scale-75">
              I
            </div>
            <div className="z-10 text-left">
              <span className="inline-block bg-[#0d5ddf] text-white px-4 py-1 rounded-full font-bold text-xs uppercase tracking-widest mb-6 font-hanken">
                Capture
              </span>
              <h3 className="text-5xl lg:text-6xl font-black uppercase tracking-tight leading-none font-hanken">
                Save without <br />
                deciding.
              </h3>
            </div>
            <div className="relative flex-1 flex items-center justify-center">
              <div className="w-full h-full flex items-center justify-center gap-4">
                <div className="w-20 h-20 bg-[#0d5ddf]/10 border-2 border-[#0d5ddf] rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#0d5ddf]">link</span>
                </div>
                <div className="w-24 h-32 bg-[#f74700]/10 border-2 border-[#f74700] rounded-xl flex flex-col p-3 gap-2">
                  <div className="w-full h-2 bg-[#f74700]/20 rounded" />
                  <div className="w-3/4 h-2 bg-[#f74700]/20 rounded" />
                  <div className="mt-auto w-8 h-8 bg-[#f74700] rounded-full self-end" />
                </div>
                <div className="w-16 h-16 bg-[#259d27]/10 border-2 border-[#259d27] rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#259d27]">image</span>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:w-[400px] text-left">
            <p className="text-2xl font-bold leading-snug font-dm-sans">
              Spotted something interesting? Just drop it in. No folders, no tags, no friction. Corpus
              treats your attention as the only requirement.
            </p>
          </div>
        </div>

        {/* Card II - Processing */}
        <div className="process-step-trigger flex flex-col lg:flex-row-reverse items-center gap-16 justify-center">
          <div className="process-card w-full lg:w-1/2 aspect-[4/3] bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-3xl p-12 relative flex flex-col justify-between overflow-hidden">
            <div className="roman-numeral-bg absolute top-[-20px] right-[-20px] text-[15rem] font-black italic text-[#f74700]/5 pointer-events-none transition-all duration-500 opacity-0 scale-75">
              II
            </div>
            <div className="z-10 text-left">
              <span className="inline-block bg-[#f74700] text-white px-4 py-1 rounded-full font-bold text-xs uppercase tracking-widest mb-6 font-hanken">
                Processing
              </span>
              <h3 className="text-5xl lg:text-6xl font-black uppercase tracking-tight leading-none font-hanken">
                It files <br />
                itself.
              </h3>
            </div>
            <div className="relative flex-1 flex items-center justify-center">
              <div className="relative w-64 h-64">
                <div className="absolute inset-0 m-auto w-12 h-12 bg-black rounded-full z-10 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white rounded-full" />
                </div>
                <div className="absolute top-0 left-1/4 w-8 h-8 bg-[#f74700] rounded-full" />
                <div className="absolute bottom-4 right-0 w-10 h-10 bg-[#9439f9] rounded-full" />
                <div className="absolute top-1/2 right-1/4 w-6 h-6 bg-[#259d27] rounded-full" />
                <svg
                  className="absolute inset-0 w-full h-full stroke-black/10 stroke-2 fill-none"
                  viewBox="0 0 256 256"
                >
                  <line x1="128" y1="128" x2="64" y2="40" />
                  <line x1="128" y1="128" x2="256" y2="220" />
                  <line x1="128" y1="128" x2="192" y2="128" />
                </svg>
              </div>
            </div>
          </div>
          <div className="lg:w-[400px] text-left">
            <p className="text-2xl font-bold leading-snug font-dm-sans">
              Our neural engine analyzes every pixel and syllable. It builds connections between your
              ideas automatically, creating a semantic map of your digital mind.
            </p>
          </div>
        </div>

        {/* Card III - Recall */}
        <div className="process-step-trigger flex flex-col lg:flex-row items-center gap-16 justify-center">
          <div className="process-card w-full lg:w-1/2 aspect-[4/3] bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-3xl p-12 relative flex flex-col justify-between overflow-hidden">
            <div className="roman-numeral-bg absolute top-[-20px] right-[-20px] text-[15rem] font-black italic text-[#259d27]/5 pointer-events-none transition-all duration-500 opacity-0 scale-75">
              III
            </div>
            <div className="z-10 text-left">
              <span className="inline-block bg-[#259d27] text-white px-4 py-1 rounded-full font-bold text-xs uppercase tracking-widest mb-6 font-hanken">
                Recall
              </span>
              <h3 className="text-5xl lg:text-6xl font-black uppercase tracking-tight leading-none font-hanken">
                You ask, <br />
                it answers.
              </h3>
            </div>
            <div className="relative flex-1 flex flex-col items-center justify-center gap-8">
              <div className="w-full max-w-sm h-12 border-2 border-black rounded-full bg-white px-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-black/20">search</span>
                <div className="h-2 w-32 bg-black/5 rounded-full" />
              </div>
              <div className="flex gap-4">
                <div className="w-20 h-24 bg-[#faa200]/20 border border-black/10 rounded-xl" />
                <div className="w-20 h-24 bg-[#0d5ddf]/20 border border-black/10 rounded-xl translate-y-4" />
                <div className="w-20 h-24 bg-[#9439f9]/20 border border-black/10 rounded-xl" />
              </div>
            </div>
          </div>
          <div className="lg:w-[400px] text-left">
            <p className="text-2xl font-bold leading-snug font-dm-sans">
              Forgotten where you saw that quote? Ask Corpus in plain English. Your memories surface
              instantly, curated by relevance, not just keywords.
            </p>
          </div>
        </div>
      </div>

    </section>
  );
}
