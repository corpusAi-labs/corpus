import { motion } from 'framer-motion'

export default function SavingCard() {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.94, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.25 } }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative rounded-[10px] p-[2.5px] overflow-hidden min-h-[220px] flex flex-col shadow-md select-none"
    >
      {/* Moving colorful animated gradient border */}
      <div
        className="absolute -inset-[150%] animate-[spin_3.5s_linear_infinite]"
        style={{
          background: 'conic-gradient(from 0deg, #ff007f, #9439f9, #00d4ff, #ffaa00, #ff007f)',
        }}
      />

      {/* Inner dark card surface */}
      <div className="relative z-10 w-full h-full flex-1 rounded-[8px] bg-[#14131A] p-6 flex flex-col items-center justify-center text-center gap-3.5">
        {/* Animated breathing icon */}
        <motion.div
          animate={{ scale: [1, 1.07, 1], rotate: [0, 2, -2, 0] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 shadow-[0_0_15px_rgba(148,57,249,0.25)]"
        >
          <svg className="w-5 h-5 text-white/85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 10h.01M15 10h.01" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M9.5 14.8a3.5 3.5 0 0 0 5 0" strokeLinecap="round" />
          </svg>
        </motion.div>

        {/* Text */}
        <div className="space-y-1">
          <p className="font-serif text-[13.5px] text-white/95 tracking-tight font-medium">
            One moment.
          </p>
          <p className="font-circular text-[11px] text-white/45 tracking-wide">
            I'm saving this for you.
          </p>
        </div>
      </div>
    </motion.div>
  )
}
