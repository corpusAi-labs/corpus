import React from 'react';

export default function PaperButton({
  text = 'Sign up',
  isBlue = false,
  onClick,
  href,
  className = '',
  target,
  rel,
}) {
  const Comp = href ? 'a' : 'button';

  const props = {
    ...(href ? { href, target, rel: rel || (target === '_blank' ? 'noopener noreferrer' : undefined) } : {}),
    ...(onClick ? { onClick } : {}),
    className: `button-paper group h-10 sm:h-11 inline-flex items-center overflow-hidden cursor-pointer bg-[#FDF8F0] text-[#212121] p-1 rounded-[4px] relative border border-[#A19D94] transition-all duration-300 select-none ${className}`,
  };

  // Base box color (normal unhovered):
  const baseBoxColor = isBlue ? '#1d52d8' : '#ea5834';
  // Hovered box color (contrasting swapped color from reference):
  const hoverBoxColor = isBlue ? '#ea5834' : '#1d52d8';

  return (
    <Comp {...props}>
      {/* Expanding background cover that rolls up from bottom on hover */}
      <div 
        className={`absolute inset-[-1%] size-[102%] z-0 scale-y-0 origin-bottom rounded-[4px] transition-transform duration-300 ease-out group-hover:scale-y-100 ${
          isBlue ? 'bg-[#1d52d8]' : 'bg-[#ea5834]'
        }`} 
      />

      {/* Left Icon Square Box */}
      <div className="h-full w-8 sm:w-9 shrink-0 flex items-center justify-center z-1 relative overflow-hidden rounded-[2px]">
        {/* Primary SVG with changing box color, shifting dots & primary arrow */}
        <svg 
          viewBox="0 0 37 37" 
          fill="none" 
          className="size-7 sm:size-8"
        >
          {/* Base square background (fades out on hover) */}
          <rect 
            width="37" 
            height="37" 
            rx="2" 
            fill={baseBoxColor} 
            className="transition-opacity duration-300 ease-out group-hover:opacity-0"
          />

          {/* Hover square background (contrasting color, fades in on hover) */}
          <rect 
            width="37" 
            height="37" 
            rx="2" 
            fill={hoverBoxColor} 
            className="opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
          />

          {/* Dotted trailing path */}
          <g className="transition-transform duration-300 ease-out group-hover:translate-x-1.5">
            <circle cx="4" cy="19" r="1" fill="#D9D9D9" className="transition-opacity duration-300 opacity-0 group-hover:opacity-20" />
            <circle cx="8" cy="19" r="1" fill="#D9D9D9" className="transition-opacity duration-300 opacity-20 group-hover:opacity-40" />
            <circle cx="12" cy="19" r="1" fill="#D9D9D9" className="transition-opacity duration-300 opacity-40 group-hover:opacity-60" />
            <circle cx="16" cy="19" r="1" fill="#D9D9D9" className="transition-opacity duration-300 opacity-60 group-hover:opacity-80" />
            <circle cx="20" cy="19" r="1" fill="#D9D9D9" className="transition-opacity duration-300 opacity-100 group-hover:opacity-0" />
          </g>

          {/* Outgoing primary arrow (flies out to the right) */}
          <path 
            d="M21 25L27 19L21 13" 
            stroke="#EADFC9" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="transition-all duration-300 ease-out group-hover:translate-x-4 group-hover:opacity-0" 
          />
        </svg>

        {/* Incoming secondary arrow (scales in at center with slight delay, exact to illoca) */}
        <svg 
          viewBox="0 0 37 37" 
          fill="none" 
          className="size-7 sm:size-8 inset-0 absolute pointer-events-none transition-transform duration-300 ease-out scale-0 origin-center group-hover:scale-100 group-hover:delay-75 delay-0"
        >
          <path 
            d="M21 25L27 19L21 13" 
            stroke="#EADFC9" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      </div>

      {/* Rolling Text slot-machine effect - perfectly centered in both unhovered and hovered states */}
      <div className="font-geist text-12 sm:text-13 font-500 leading-none flex-1 h-full relative z-1 overflow-hidden">
        <div className="h-full flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-full">
          <div className="h-full shrink-0 flex items-center justify-center w-full px-2 text-center text-[#212121]">
            {text}
          </div>
          <div className="h-full shrink-0 flex items-center justify-center w-full px-2 text-center text-white">
            {text}
          </div>
        </div>
      </div>
    </Comp>
  );
}

