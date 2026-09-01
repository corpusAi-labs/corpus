import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import bento1 from '../../assets/bento1.png';
import bento2 from '../../assets/bento2.png';

gsap.registerPlugin(ScrollTrigger);

export default function BentoGallery() {
  useEffect(() => {
    const galleryTrack = document.querySelector('#gallery-track');
    if (!galleryTrack) return;

    const isMobile = () => window.innerWidth < 1024;

    const animation = gsap.to(galleryTrack, {
      x: () => -(galleryTrack.scrollWidth - window.innerWidth + (isMobile() ? 0 : 156)),
      ease: 'none',
      scrollTrigger: {
        trigger: '#gallery-trigger',
        start: 'top top',
        end: () => '+=' + (galleryTrack.scrollWidth * 0.8),
        scrub: 1,
        pin: '#gallery-container',
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    return () => {
      animation.scrollTrigger?.kill();
      animation.kill();
    };
  }, []);

  return (
    <section className="bg-transparent overflow-hidden border-t border-black/10" id="gallery-trigger">
      <div className="h-screen flex items-center" id="gallery-container">
        <div className="flex items-center gap-12 px-[10vw]" id="gallery-track">
          
          {/* TITLE SECTION */}
          <div className="flex-shrink-0 w-[450px]">
            <h2 className="text-black text-7xl font-black uppercase leading-[0.9] tracking-tighter font-hanken">
              Your curated<br />
              <span className="text-[#f74700]">vault.</span>
            </h2>
            <p className="text-black/60 mt-8 text-xl max-w-sm leading-relaxed font-dm-sans">
              Your second memory for links, notes, and research. Save in two seconds—AI handles the rest.
            </p>
          </div>

          <div className="bento-container">
            
            {/* 1. LARGE ORANGE CARD */}
            <div className="bento-panel bento-panel-large bg-[#f74700] p-9 lg:p-10 flex flex-col justify-end text-white">
              <div className="absolute top-8 left-8 lg:top-10 lg:left-10">
                <span className="px-3.5 py-1.5 border border-white/30 rounded-full text-[11px] font-bold uppercase tracking-widest font-hanken">
                 ORGANIZATION ON AUTOPILOT
                </span>
              </div>
              <h3 className="text-5xl lg:text-6xl font-black leading-[1.05] mb-5 font-hanken">
                Save anything.<br />
                Find everything.
              </h3>
              <p className="text-xl font-bold mb-3 font-dm-sans">No tags, no folders, zero manual effort</p>
              <p className="text-white/80 leading-relaxed text-sm lg:text-base max-w-md font-dm-sans">
                Drop in any link, note, quote, or image. Corpus instantly reads, tags, and files it away using AI—so you can search naturally whenever you need it again.
              </p>
            </div>

            {/* 2. NEW TOP IMAGE + BOTTOM YELLOW CARD COLUMN */}
            <div className="bento-grid-col flex flex-col gap-4 font-dm-sans">
              
              {/* TOP: Image Card */}
              <div className="bento-panel flex-1 overflow-hidden">
                <img
                  alt="Archive Visual"
                  className="w-full h-full object-cover"
                  src={bento1}
                />
              </div>

              {/* BOTTOM: Yellow Card */}
              <div className="h-[35%] bento-panel bg-[#EAB308] flex items-center justify-center p-6 text-black shrink-0">
                <div className="text-center">
                  <h4 className="text-2xl font-black italic font-hanken uppercase tracking-tight">DRIFT MODE</h4>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-90 font-hanken mt-1">
                    RECONNECT WITH SAVED IDEAS
                  </p>
                </div>
              </div>

            </div>

            {/* 3. ORIGINAL MIDDLE IMAGE CARD */}
            <div className="bento-panel bento-panel-medium">
              <img
                alt="Textures"
                className="w-full h-full object-cover"
                src={bento2}
              />
            </div>

            {/* 4. PURPLE & GREEN COLUMN */}
            <div className="bento-grid-col flex flex-col gap-4 font-dm-sans">
              
              {/* TOP: Purple Card */}
              <div className="bento-panel bg-[#9439f9] p-10 text-white flex-1">
                <h4 className="text-3xl font-black mb-1 font-hanken">Spaces &amp; Organization</h4>
                <p className="text-xs font-bold opacity-70 mb-6 uppercase tracking-wider font-hanken">
                  STRUCTURED WHEN YOU WANT IT
                </p>
                <div className="space-y-4">Dedicated archives for projects, research, and interest</div>
                <div className="bento-list-item text-lg mt-2">Custom names and colors to keep ideas visually distinct</div>
              </div>

              {/* BOTTOM: Green Card */}
              <div className="h-[35%] bento-panel bg-[#259d27] flex items-center justify-center p-8 shrink-0">
                <div className="text-white text-center">
                  <div className="text-5xl font-black italic font-hanken">100</div>
                  <div className="text-[12px] font-bold uppercase tracking-widest opacity-80 font-hanken">
                    FREE SAVES TO START
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </section>
  );
}