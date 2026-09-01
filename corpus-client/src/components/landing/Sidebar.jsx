import { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore.js';

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

export function FollowButton({ className = '' }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative bg-black text-white rounded-xl w-full h-10 overflow-hidden cursor-pointer transition-all duration-300 flex items-center justify-center border-0 select-none shrink-0 ${className}`}
    >
      {/* Default State */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          isHovered ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
        }`}
      >
        <span className="text-[11px] font-bold uppercase font-hanken tracking-wider">
          Follow on
        </span>
      </div>

      {/* Hover State: LinkedIn & Instagram icons */}
      <div
        className={`absolute inset-0 flex items-center justify-center gap-4 px-2 bg-black transition-all duration-300 ${
          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
        }`}
      >
        {/* LinkedIn */}
        <a
          href="https://linkedin.com"
          target="_blank"
          rel="noopener noreferrer"
          title="Follow on LinkedIn"
          className="p-1.5 rounded-lg hover:bg-[#0077b5] text-white transition-all transform hover:scale-115 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z" />
          </svg>
        </a>

        {/* Instagram */}
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          title="Follow on Instagram"
          className="p-1.5 rounded-lg hover:bg-[#e1306c] text-white transition-all transform hover:scale-115 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        </a>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <aside className="landing-sidebar bg-[#fff8f4] p-3 flex flex-col justify-between h-screen overflow-hidden z-50">

      {/* ── Mobile header row ── */}
      <div className="flex justify-between items-center lg:block shrink-0 mb-1">
        <Link to="/" className="flex items-center lg:mb-2 px-0.5 no-underline">
          <img src="/Frame 4.svg" alt="Corpus" className="h-9 w-auto object-contain" />
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden p-1.5 border-2 border-black rounded-lg bg-white flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-black text-xl">
            {isOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* ── Main nav + CTA wrapper ── */}
      <div
        className={`flex-1 flex flex-col justify-between gap-2 overflow-hidden py-1 ${
          isOpen ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* TOP GROUP — 4 nav cards */}
        <div className="flex-1 flex flex-col justify-between gap-2 overflow-hidden">
          {NAV_CARDS.map((card, idx) => (
            <a
              key={idx}
              href={card.href}
              onClick={() => setIsOpen(false)}
              className="side-nav-card relative overflow-hidden rounded-xl w-full flex-1 min-h-[68px] block no-underline group select-none cursor-pointer"
            >
              {/* Base background color */}
              <div className={`absolute inset-0 ${card.bg}`} />

              {/* Hover Waves */}
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
                          ? 'M 0 15 C 30 10 70 20 100 15 V 100 H 0 Z'
                          : wIdx === 1
                          ? 'M 0 12 C 40 18 60 8 100 12 V 100 H 0 Z'
                          : wIdx === 2
                          ? 'M 0 14 C 20 10 80 18 100 14 V 100 H 0 Z'
                          : 'M 0 10 C 35 5 65 15 100 10 V 100 H 0 Z'
                      }
                      fill={waveColor}
                    />
                  </svg>
                </div>
              ))}

              {/* Nav Content */}
              <div className="nav-content absolute inset-0 flex flex-col justify-between p-2.5 z-20 font-circular text-white transition-colors duration-200">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold">
                    {card.num}
                  </span>
                  <span
                    className="material-symbols-outlined text-xs"
                    style={{ transform: 'rotate(45deg)', display: 'inline-block' }}
                  >
                    north_east
                  </span>
                </div>
                <span className="self-center text-center text-[12px] font-black tracking-tight uppercase font-hanken">
                  {card.label}
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* BOTTOM GROUP — CTA buttons */}
        <div className="shrink-0 flex flex-col gap-2 pt-1">

          {/* Extension — purple */}
          <Link
            to="/extension"
            onClick={() => setIsOpen(false)}
            className="bg-[#9439f9] text-white rounded-xl text-[11px] font-bold cursor-pointer no-underline uppercase font-hanken hover:opacity-95 transition-all duration-200 flex items-center justify-center h-10 w-full shrink-0"
          >
            Extension
          </Link>

          {/* Dashboard / Sign in with Orange Hover Layer */}
          {user ? (
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="relative overflow-hidden group bg-black text-white rounded-xl text-[11px] font-bold cursor-pointer no-underline uppercase font-hanken flex items-center justify-center h-10 w-full shrink-0 select-none"
            >
              <div className="absolute inset-0 bg-[#f74700] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
              <span className="relative z-10 font-black tracking-wider transition-transform duration-300 group-hover:scale-105">
                Dashboard
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="relative overflow-hidden group bg-black text-white rounded-xl text-[11px] font-bold cursor-pointer no-underline uppercase font-hanken flex items-center justify-center h-10 w-full shrink-0 select-none"
            >
              <div className="absolute inset-0 bg-[#f74700] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
              <span className="relative z-10 font-black tracking-wider transition-transform duration-300 group-hover:scale-105">
                Sign in
              </span>
            </Link>
          )}

          {/* Follow Button with Hover Social Icons */}
          <FollowButton />
        </div>
      </div>
    </aside>
  );
}
