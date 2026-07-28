import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

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
            <div className="bento-panel bento-panel-large bg-[#f74700] p-12 flex flex-col justify-end text-white">
              <div className="absolute top-10 left-10">
                <span className="px-4 py-2 border border-white/30 rounded-full text-xs font-bold uppercase tracking-widest font-hanken">
                 ORGANIZATION ON AUTOPILOT
                </span>
              </div>
              <h3 className="text-7xl font-black leading-[1.1] mb-6 font-hanken">
                Save anything.<br />
                Find everything.
              </h3>
              <p className="text-2xl font-bold mb-4 font-dm-sans">No tags, no folders, zero manual effort</p>
              <p className="text-white/80 leading-relaxed text-base max-w-md font-dm-sans">
                Drop in any link, note, quote, or image. Corpus instantly reads, tags, and files it away using AI—so you can search naturally whenever you need it again.
              </p>
            </div>
            <div className="bento-panel bento-panel-medium">
              <img
                alt="Textures"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSQCrq4IZwsmpz6JVT2uei_c5YQLgb7ipl3PJ0LVmqSaQ1KtF85GEE7yA7Z8q1AqNFYY1GcsBZ8QnMn2UDV1bovl8svEscQ7Df_QdyzCxgRjh4wkWCtL395Rf9Ynx-fv0Fo1OFHEpjrI3K592aH0gV-eNj5vp1SxK33KxC7hbQmIvDuI8cjGWzNf9R2LPlgph48ik-G93tJu1_OBE753y-QlpK_G5D7IEHU1FzNdCEDz0fe7BylUYCvdpXJrEaXC1lEL7WU4TC2JXu"
              />
            </div>
            <div className="bento-grid-col bento-panel-small font-dm-sans">
              <div className="flex-1 bento-panel bg-[#9439f9] p-10 text-white">
                <h4 className="text-3xl font-black mb-1 font-hanken">Spaces & Organization</h4>
                <p className="text-xs font-bold opacity-70 mb-6 uppercase tracking-wider font-hanken">
                  STRUCTURED WHEN YOU WANT IT
                </p>
                <div className="space-y-4">Dedicated archives for projects, research, and interest</div>
                  <div className="bento-list-item text-lg">Custom names and colors to keep ideas visually distinct</div>
                </div>
              </div>
              <div className="h-[35%] bento-panel bg-[#259d27] flex items-center justify-center p-8">
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
  
    </section>
  );
}
