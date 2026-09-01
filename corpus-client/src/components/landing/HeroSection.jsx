import HeroCards from './HeroCards';

export default function HeroSection() {
  return (
    <div className="relative" id="main-trigger">
      <div className="h-screen w-full overflow-hidden relative bg-transparent" id="sticky-container">
        <main className="relative h-full bg-transparent">

          {/*
           * HERO TEXT — z-10 (behind the z-20 floating cards).
           * Fully centred both horizontally and vertically.
           */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-4 md:px-10 pointer-events-none"
            id="hero-text"
          >
            <h1
              className="text-[#f74700] text-[2.8rem] sm:text-[3.5rem] md:text-[4.2rem] lg:text-[4.6rem] leading-[1.05] font-black tracking-tight font-hanken"
              id="hero-title"
            >
              Remember everything <br />
              Organise nothing
            </h1>

            <div
              className="mt-8 md:mt-10 flex flex-wrap justify-center items-center gap-x-2 gap-y-3 text-black text-lg md:text-xl font-medium font-dm-sans max-w-2xl"
              id="hero-description"
            >
              <span className="opacity-70">All your</span>
              <span className="px-4 py-1.5 rounded-full border border-black bg-[#faa200]/10 text-[#faa200] font-bold text-sm">
                notes
              </span>
              <span className="px-4 py-1.5 rounded-full border border-black bg-[#9439f9]/10 text-[#9439f9] font-bold text-sm">
                bookmarks
              </span>
              <span className="px-4 py-1.5 rounded-full border border-black bg-[#0d5ddf]/10 text-[#0d5ddf] font-bold text-sm">
                inspiration
              </span>
              <div className="w-full flex flex-wrap justify-center items-center gap-x-2 gap-y-2">
                <span className="px-4 py-1.5 rounded-full border border-black bg-[#f74700]/10 text-[#f74700] font-bold text-sm">
                  articles
                </span>
                <span className="opacity-70">and</span>
                <span className="px-4 py-1.5 rounded-full border border-black bg-[#259d27]/10 text-[#259d27] font-bold text-sm">
                  images
                </span>
                <span className="opacity-70">in one single, private place.</span>
              </div>
            </div>
          </div>

          {/* Floating Cards — z-20, above the hero text */}
          <HeroCards />
        </main>
      </div>
    </div>
  );
}
