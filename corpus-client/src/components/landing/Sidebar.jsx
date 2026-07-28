import { useState } from 'react';
import { Link } from 'react-router-dom';

// TOP group: Logo + 4 nav cards
const NAV_CARDS = [
  {
    num: '01',
    label: 'Home',
    bg: 'bg-[#0d5ddf]',
    href: '#',
  },
  {
    num: '01',
    label: 'Features',
    bg: 'bg-[#faa200]',
    href: '#gallery-trigger',
  },
  {
    num: '02',
    label: 'Pricing',
    bg: 'bg-[#f74700]',
    href: '#pricing-section',
  },
  {
    num: '03',
    label: 'How it works',
    bg: 'bg-[#259d27]',
    href: '#how-it-works',
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
              className={`
                group ${card.bg} text-black
                p-3 rounded-xl h-[125px]
                flex flex-col justify-between cursor-pointer
                border-0 border-black
                no-underline block
                transition-colors duration-200
              `}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold group-hover:text-white transition-colors duration-200">
                  {card.num}
                </span>
                {/* Arrow rotated 45° so it points right-diagonally but faces east */}
                <span
                  className="material-symbols-outlined text-sm group-hover:text-white transition-colors duration-200"
                  style={{ transform: 'rotate(45deg)', display: 'inline-block' }}
                >
                  north_east
                </span>
              </div>
              <span className=" self-center text-center text-[13px] font-black tracking-tight uppercase font-hanken group-hover:text-white transition-colors duration-200">
                {card.label}
              </span>
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
