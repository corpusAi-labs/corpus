import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Extension() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (email.trim()) {
      setSubmitted(true)
    }
  }

  return (
    <div className="min-h-screen bg-[#fff8f4] text-black font-circular flex flex-col justify-between selection:bg-[#ff6b2b] selection:text-white">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.035]" style={{
        backgroundImage: 'linear-gradient(black 1px,transparent 1px),linear-gradient(90deg,black 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Header */}
      <header className="relative z-10 border-b-2 border-black bg-white py-4 px-6 md:px-12 flex items-center justify-between shadow-[0_2px_0_black]">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <img src="/Frame 4.svg" alt="Corpus" className="h-8 w-auto object-contain" />
        </Link>
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 border-2 border-black rounded-[4px] bg-[#fff8f4] text-[12px] font-bold text-black shadow-[2px_2px_0px_black] hover:shadow-[3px_3px_0px_black] transition-all"
        >
          <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="14">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-[1200px] mx-auto px-6 py-12 flex-1 flex flex-col justify-center">

        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-black rounded-full bg-[#faa200] text-black font-bold text-[11px] uppercase tracking-widest mb-5 shadow-[2px_2px_0px_black]">
            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
            Browser Extension — Coming Soon
          </div>
          <h1 className="font-roc text-[42px] sm:text-[56px] font-black leading-[1.05] tracking-tight mb-4">
            Save anything from <br className="hidden sm:inline" />
            <span className="text-[#cc3d00]">any website.</span>
          </h1>
          <p className="text-[15px] sm:text-[17px] text-[#666] leading-relaxed">
            Capture links, text clips, and articles straight into your Corpus second brain without interrupting your flow.
          </p>
        </div>

        {/* Browser Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">

          {/* Chrome Card */}
          <div className="bg-white border-2 border-black rounded-xl p-6 shadow-[5px_5px_0px_black] flex flex-col justify-between hover:-translate-y-1 transition-transform">
            <div>
              <div className="flex items-center justify-between mb-5">
                {/* Chrome Icon */}
                <div className="w-12 h-12 rounded-lg bg-[#fff8f4] border-2 border-black flex items-center justify-center p-2 shadow-[2px_2px_0px_black]">
                  <svg viewBox="0 0 24 24" className="w-7 h-7">
                    <path fill="#4285F4" d="M12 22a10 10 0 0 0 8.66-5H12v-5h10a10 10 0 0 0-20 0c0 1.86.5 3.6 1.39 5.1L8 12.1a4 4 0 0 1 4-4.1h8.66A10 10 0 0 0 12 2Z" />
                    <circle cx="12" cy="12" r="4" fill="#4285F4" />
                    <path fill="#EA4335" d="M12 2a10 10 0 0 1 8.66 5H12v5L3.34 7C5.1 4 8.3 2 12 2Z" />
                    <path fill="#FBBC05" d="M3.34 7a10 10 0 0 0 0 10L8 12.1A4 4 0 0 1 8 8L3.34 7Z" />
                    <path fill="#34A853" d="M12 22a10 10 0 0 1-8.66-5L8 11.9a4 4 0 0 0 4 4.1h8.66A10 10 0 0 1 12 22Z" />
                  </svg>
                </div>
                <span className="px-2.5 py-1 border border-black rounded-md bg-[#e6f4ea] text-[#137333] text-[10px] font-bold uppercase tracking-wider">
                  Chrome Web Store
                </span>
              </div>

              <h3 className="font-roc text-[22px] font-black mb-2">Google Chrome</h3>
              <p className="text-[13px] text-[#666] leading-relaxed mb-6">
                1-click web page saving, selection clipping, and instant AI summarization right in Chrome.
              </p>
            </div>

            <div className="pt-4 border-t border-[#eee] flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#888] font-bold">STATUS: IN QA REVIEW</span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />
            </div>
          </div>

          {/* Brave Card */}
          <div className="bg-white border-2 border-black rounded-xl p-6 shadow-[5px_5px_0px_black] flex flex-col justify-between hover:-translate-y-1 transition-transform">
            <div>
              <div className="flex items-center justify-between mb-5">
                {/* Brave Icon */}
                <div className="w-12 h-12 rounded-lg bg-[#fff8f4] border-2 border-black flex items-center justify-center p-2 shadow-[2px_2px_0px_black]">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#ff1b2d]">
                    <path d="M12 2 4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-5.45 8-12V5l-8-3zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 14.3c-2.8-1.07-5.5-4.43-5.9-8.3h11.8c-.4 3.87-3.1 7.23-5.9 8.3z"/>
                  </svg>
                </div>
                <span className="px-2.5 py-1 border border-black rounded-md bg-[#fff0f0] text-[#c5221f] text-[10px] font-bold uppercase tracking-wider">
                  Brave Browser
                </span>
              </div>

              <h3 className="font-roc text-[22px] font-black mb-2">Brave</h3>
              <p className="text-[13px] text-[#666] leading-relaxed mb-6">
                Privacy-focused Manifest V3 extension built specifically for shield-enabled web browsing.
              </p>
            </div>

            <div className="pt-4 border-t border-[#eee] flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#888] font-bold">STATUS: COMPATIBLE</span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            </div>
          </div>

          {/* Edge Card */}
          <div className="bg-white border-2 border-black rounded-xl p-6 shadow-[5px_5px_0px_black] flex flex-col justify-between hover:-translate-y-1 transition-transform">
            <div>
              <div className="flex items-center justify-between mb-5">
                {/* Edge Icon */}
                <div className="w-12 h-12 rounded-lg bg-[#fff8f4] border-2 border-black flex items-center justify-center p-2 shadow-[2px_2px_0px_black]">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#0078d4]">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                  </svg>
                </div>
                <span className="px-2.5 py-1 border border-black rounded-md bg-[#e8f0fe] text-[#1a73e8] text-[10px] font-bold uppercase tracking-wider">
                  Edge Add-ons
                </span>
              </div>

              <h3 className="font-roc text-[22px] font-black mb-2">Microsoft Edge</h3>
              <p className="text-[13px] text-[#666] leading-relaxed mb-6">
                Native Edge sidebar capture widget with instant keyboard shortcuts and tab sync.
              </p>
            </div>

            <div className="pt-4 border-t border-[#eee] flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#888] font-bold">STATUS: IN DEVELOPMENT</span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            </div>
          </div>

        </div>

        {/* Features Grid */}
        <div className="bg-white border-2 border-black rounded-xl p-8 shadow-[6px_6px_0px_black] mb-12">
          <h2 className="font-roc text-[24px] font-black mb-6">Extension Capabilities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 border-2 border-black rounded-lg bg-[#fff8f4] shadow-[3px_3px_0px_black]">
              <span className="text-2xl mb-2 block">⚡</span>
              <h4 className="font-bold text-[14px] mb-1">1-Click Capture</h4>
              <p className="text-[12px] text-[#666]">Save full web page URLs, titles, and metadata under 100ms.</p>
            </div>
            <div className="p-4 border-2 border-black rounded-lg bg-[#fff8f4] shadow-[3px_3px_0px_black]">
              <span className="text-2xl mb-2 block">📝</span>
              <h4 className="font-bold text-[14px] mb-1">Text Selection</h4>
              <p className="text-[12px] text-[#666]">Highlight text on any site to instantly save as a note.</p>
            </div>
            <div className="p-4 border-2 border-black rounded-lg bg-[#fff8f4] shadow-[3px_3px_0px_black]">
              <span className="text-2xl mb-2 block">🏷️</span>
              <h4 className="font-bold text-[14px] mb-1">Auto AI Tagging</h4>
              <p className="text-[12px] text-[#666]">Corpus AI automatically categorizes and tags your clips.</p>
            </div>
            <div className="p-4 border-2 border-black rounded-lg bg-[#fff8f4] shadow-[3px_3px_0px_black]">
              <span className="text-2xl mb-2 block">⌨️</span>
              <h4 className="font-bold text-[14px] mb-1">Keyboard Shortcut</h4>
              <p className="text-[12px] text-[#666]">Press Alt + C anywhere in browser for instant popup launcher.</p>
            </div>
          </div>
        </div>

        {/* Waitlist Form */}
        <div className="bg-[#0d0d0d] text-white border-2 border-black rounded-xl p-8 shadow-[6px_6px_0px_black] text-center max-w-xl mx-auto w-full">
          <h3 className="font-roc text-[28px] font-black mb-2 text-white">Get Notified First</h3>
          <p className="text-[13px] text-[#aaa] mb-6">
            Enter your email to receive early access as soon as the Chrome, Brave, or Edge extension drops.
          </p>

          {submitted ? (
            <div className="p-4 border-2 border-green-500 bg-green-950 text-green-400 rounded-lg font-bold text-[14px]">
              🎉 You&apos;re on the list! We&apos;ll notify you the moment it launches.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 px-4 py-3 border-2 border-white/20 rounded-md bg-[#1a1a1a] text-white placeholder:text-[#666] focus:outline-none focus:border-[#ff6b2b] text-[14px]"
              />
              <button
                type="submit"
                className="bg-[#ff6b2b] text-black font-circular text-[13px] uppercase tracking-widest font-black px-6 py-3 rounded-md border-2 border-[#ff6b2b] shadow-[3px_3px_0px_#cc4a12] hover:shadow-[4px_4px_0px_#cc4a12] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer whitespace-nowrap"
              >
                Notify Me →
              </button>
            </form>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t-2 border-black bg-white py-6 px-6 text-center text-[12px] text-[#666]">
        <p>© 2026 Corpus Development. All rights reserved.</p>
      </footer>
    </div>
  )
}
