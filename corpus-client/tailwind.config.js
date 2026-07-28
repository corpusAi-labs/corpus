/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f0e3d9',
        ink: '#000000',
        line: '#000000',
        accent: '#0d5ddf',
        muted: '#5e5e5e',
        stitchOrange: '#faa200',
        stitchRed: '#f74700',
        stitchGreen: '#259d27',
        stitchPurple: '#9439f9',
        stitchBlue: '#0d5ddf',
        'landing-bg': '#fff8f4',
        // Dark dashboard tokens
        surface: '#0a0a0f',
        'surface-elevated': '#12121a',
        'surface-card': '#16161f',
        'surface-hover': '#1e1e2a',
        'border-subtle': 'rgba(255,255,255,0.06)',
        'border-glow': 'rgba(139,92,246,0.25)',
        'text-primary': '#f0f0f5',
        'text-secondary': '#71717a',
      },
      fontFamily: {
        sans: ['"Circular Std"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        roc: ['"Roc Grotesk"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        circular: ['"Circular Std"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        hanken: ['"Hanken Grotesk"', 'sans-serif'],
        'dm-sans': ['"DM Sans"', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      maxWidth: {
        content: '1120px',
      },
      keyframes: {
        'corpus-spin': {
          to: { transform: 'rotate(360deg)' },
        },
        'ai-pulse': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'marquee-left': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-right': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'grid-move': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 24px' },
        },
      },
      animation: {
        'corpus-spin': 'corpus-spin 2.2s linear infinite',
        'ai-pulse': 'ai-pulse 2s ease-in-out infinite',
        'marquee-left': 'marquee-left 30s linear infinite',
        'marquee-right': 'marquee-right 30s linear infinite',
        'grid-move': 'grid-move 4s linear infinite',
      },
      boxShadow: {
        'hard': '6px 6px 0px #000',
        'hard-sm': '4px 4px 0px #000',
        'hard-lg': '8px 8px 0px #000',
        'hard-xl': '12px 12px 0px #000',
      },
      backgroundImage: {
        'grid-overlay': "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '40px 40px',
        'grid-sm': '24px 24px',
      },
    },
  },
  plugins: [],
}

