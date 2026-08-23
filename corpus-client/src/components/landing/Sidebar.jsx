import { useState } from 'react';
import { Link } from 'react-router-dom';

// TOP group: Logo + 4 nav cards
const NAV_CARDS = [
  {
    num: '01',
    label: 'Home',
    bg: 'bg-[#0d5ddf]',
    href: '#',
    waves: ['#faa200', '#9439f9', '#f74700', '#0d5ddf'],
  },
  {
    num: '01',
    label: 'Features',
    bg: 'bg-[#faa200]',
    href: '#stack-section-trigger',
    waves: ['#0d5ddf', '#9439f9', '#f74700', '#faa200'],
  },
  {
    num: '02',
    label: 'Pricing',
    bg: 'bg-[#f74700]',
    href: '#pricing-section',
    waves: ['#0d5ddf', '#9439f9', '#faa200', '#f74700'],
  },
  {
    num: '03',
    label: 'How it works',
    bg: 'bg-[#259d27]',
    href: '#how-it-works',
    waves: ['#faa200', '#9439f9', '#f74700', '#259d27'],
  },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside className="landing-sidebar bg-[#fff8f4] p-4 flex flex-col z-50">
      {/* ── Mobile header row ── */}
      <div className="flex justify-between items-center lg:block">
        <div className="corpus-logo-font lg:mb-4 px-1 text-black font-serif italic font-black text-4xl">
          Corpus.
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden p-2 border-2 border-black rounded-lg bg-white flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-black text-2xl">
            {isOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* ── Main nav + CTA wrapper ── fills remaining height on desktop ── */}
      <div
        className={`flex-1 flex flex-col justify-between gap-2 ${
          isOpen ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* TOP GROUP — nav cards */}
        <div className="flex flex-col gap-2">
          {NAV_CARDS.map((card, i) => (
            <a
              key={i}
              href={card.href}
              onClick={() => setIsOpen(false)}
              className="side-nav-card relative overflow-hidden text-black rounded-xl h-[125px] cursor-pointer block no-underline"
            >
              {/* Base background */}
              <div className={`absolute inset-0 ${card.bg}`}></div>

              {/* Waves */}
              {card.waves.map((waveColor, wIdx) => (
                <div
                  key={wIdx}
                  className={`wave-container absolute inset-0 wave-layer-${wIdx} pointer-events-none`}
                  style={{ zIndex: wIdx + 1 }}
                >
                  <svg className="absolute bottom-[-2px] left-0 w-full h-[120%]" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path
                      d={
                        wIdx === 0
                          ? "M 0 15 C 30 10 70 20 100 15 V 100 H 0 Z"
                          : wIdx === 1
                          ? "M 0 12 C 40 18 60 8 100 12 V 100 H 0 Z"
                          : wIdx === 2
                          ? "M 0 14 C 20 10 80 18 100 14 V 100 H 0 Z"
                          : "M 0 10 C 35 5 65 15 100 10 V 100 H 0 Z"
                      }
                      fill={waveColor}
                    />
                  </svg>
                </div>
              ))}

              {/* Nav Content */}
              <div className="nav-content absolute inset-0 flex flex-col justify-between p-3 z-10 font-circular transition-colors duration-200">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold transition-colors duration-200">
                    {card.num}
                  </span>
                  <span
                    className="material-symbols-outlined text-sm transition-colors duration-200"
                    style={{ transform: 'rotate(45deg)', display: 'inline-block' }}
                  >
                    north_east
                  </span>
                </div>
                <span className="self-center text-center text-[13px] font-black tracking-tight uppercase font-hanken transition-colors duration-200">
                  {card.label}
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* BOTTOM GROUP — CTA buttons */}
        <div className="flex flex-col gap-2">
          {/* Extension (was "Pricing" button) — purple */}
          <a
            href="#how-it-works"
            onClick={() => setIsOpen(false)}
            className="bg-[#9439f9] h-14 text-white p-2.5 rounded-xl text-center text-xs font-bold cursor-pointer border-0 border-black block no-underline uppercase font-hanken hover:opacity-90 transition-opacity duration-200 align-content-center flex items-center justify-center"
          >
            Extension
          </a>
          <Link
            to="/signup"
            onClick={() => setIsOpen(false)}
            className="bg-black text-white p-2.5 rounded-xl text-center text-xs font-bold cursor-pointer block no-underline uppercase font-hanken border-0 border-black hover:opacity-80 transition-opacity duration-200"
          >
            Sign up
          </Link>
          <div className="bg-black text-white p-2.5 rounded-xl text-center text-xs font-bold cursor-pointer uppercase font-hanken border-0 border-black hover:opacity-80 transition-opacity duration-200">
            Follow on
          </div>
        </div>
      </div>
    </aside>
  );
}
