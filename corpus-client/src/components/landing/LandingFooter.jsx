import { useEffect, useRef } from 'react';

export default function LandingFooter() {
  const gridContainerRef = useRef(null);

  useEffect(() => {
    const gridContainer = gridContainerRef.current;
    if (!gridContainer) return;

    const colors = ['#0d5ddf', '#9439f9', '#f74700', '#259d27', '#faa200'];
    let isPainting = false;

    function paintCell(cell) {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      cell.style.backgroundColor = randomColor;
    }

    function createGrid() {
      if (!gridContainer) return;
      gridContainer.innerHTML = '';
      const cellWidth = 40;
      const width = gridContainer.parentElement?.offsetWidth || window.innerWidth;
      const height = gridContainer.parentElement?.offsetHeight || (window.innerHeight * 0.8);

      const cols = Math.ceil(width / cellWidth);
      const rows = Math.ceil(height / cellWidth);
      const totalCells = cols * rows;

      const allCells = [];

      for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement('div');
        cell.className = 'footer-grid-cell';
        cell.addEventListener('pointerdown', (e) => {
          const isColored = cell.style.backgroundColor !== '';
          if (isColored) {
            cell.style.backgroundColor = '';
            isPainting = false;
          } else {
            isPainting = true;
            paintCell(cell);
          }
          try {
            cell.releasePointerCapture(e.pointerId);
          } catch (err) {
            // Safe fallback
          }
        });
        cell.addEventListener('pointerenter', () => {
          if (isPainting) paintCell(cell);
        });
        gridContainer.appendChild(cell);
        allCells.push(cell);
      }

      // Initial random coloring: color 2 cells for each color in the array
      if (allCells.length > 0) {
        const numPerColor = 2;
        const coloredIndices = new Set();

        colors.forEach((color) => {
          for (let c = 0; c < numPerColor; c++) {
            let attempts = 0;
            while (attempts < 100) {
              const randIdx = Math.floor(Math.random() * allCells.length);
              if (!coloredIndices.has(randIdx)) {
                allCells[randIdx].style.backgroundColor = color;
                coloredIndices.add(randIdx);
                break;
              }
              attempts++;
            }
          }
        });
      }
    }

    const handlePointerUp = () => {
      isPainting = false;
    };

    const handleResize = () => {
      createGrid();
    };

    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointerleave', handlePointerUp);
    window.addEventListener('resize', handleResize);

    createGrid();

    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointerleave', handlePointerUp);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <footer className="relative z-50 border-t-2 border-black bg-transparent">
      {/* Main Interactive Footer Area */}
      <div className="relative bg-transparent h-[80vh] overflow-hidden flex flex-col items-center justify-center">
        {/* Paintable Grid */}
        <div className="absolute inset-0 z-0" id="interactive-footer-grid" ref={gridContainerRef} />
        
        {/* Large Logo Title - Positioned down and to the left with equal margins */}
        <div className="absolute bottom-12 left-8 z-10 pointer-events-none select-none">
          <h2 className="text-[20vw] font-black leading-[0.7] tracking-tighter text-black uppercase opacity-100 font-hanken">
            Corpus.
          </h2>
        </div>
      </div>

      {/* Copyright area - sits completely outside the interactive grid */}
      <div className="bg-[#fff8f4] py-8 border-t-2 border-black relative z-50 font-dm-sans">
        <div className="max-w-[1440px] mx-auto px-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="max-w-md text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start mb-1">
              <img src="/Frame 4.svg" alt="Corpus" className="h-6 w-auto object-contain" />
            </div>
            <p className="text-black/60 font-medium text-sm leading-relaxed">
              Building a second brain for knowledge.
            </p>
          </div>
          {/* Footer buttons stayed aligned on bottom-right */}
          <div className="flex flex-wrap gap-2 justify-center md:justify-end">
            <a
              className="px-5 py-2 border-2 border-black rounded-full font-bold text-xs transition-all duration-200 hover:bg-black hover:text-white bg-white/50 no-underline text-black"
              href="#faq-section"
            >
              FAQs
            </a>
            <a
              className="px-5 py-2 border-2 border-black rounded-full font-bold text-xs transition-all duration-200 hover:bg-black hover:text-white bg-white/50 no-underline text-black"
              href="#"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
