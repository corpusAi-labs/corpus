import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const PLANS = [
  {
    name: 'Beginner',
    price: '₹199',
    period: '/month',
    credits: '500 saves',
    color: '#9439f9',
    features: [
      '500 saves per month',
      'AI tagging + TLDR',
      'All save types (link, note, quote, image)',
      'Semantic search',
      'Up to 3 Spaces',
    ],
    cta: 'Get Beginner',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₹499',
    period: '/month',
    credits: '2,000 saves',
    color: '#0d5ddf',
    features: [
      '2,000 saves per month',
      'AI tagging + TLDR',
      'All save types + browser extension',
      'Semantic search',
      'Unlimited Spaces',
      'Priority AI processing',
    ],
    cta: 'Get Pro',
    highlight: true,
  },
  {
    name: 'Max',
    price: '₹999',
    period: '/month',
    credits: 'Unlimited saves',
    color: '#000000',
    features: [
      'Unlimited saves',
      'AI tagging + TLDR',
      'All save types + browser extension',
      'Semantic search',
      'Unlimited Spaces',
      'Priority AI processing',
      'Export archive (JSON/CSV)',
      'Early access to new features',
    ],
    cta: 'Get Max',
    highlight: false,
  },
]

export default function Pricing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen relative w-full py-16">
      {/* Background grid overlay */}
      <div className="fixed inset-0 pointer-events-none bg-grid-overlay z-0" data-purpose="background-pattern"></div>

      <div className="relative z-10 max-w-[1120px] mx-auto px-6">
        <div className="flex items-center gap-3 mb-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 transition-colors group back-btn border-2 border-black bg-white shadow-[2px_2px_0px_black] hover:shadow-none translate-y-[-2px] hover:translate-y-0"
          >
            <svg className="transition-transform group-hover:-translate-x-1 text-black" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="20">
              <path d="M19 12H5M12 19l-7-7 7-7"></path>
            </svg>
          </button>
        </div>

        <div className="text-center mb-14">
          <p className="font-circular text-[12px] uppercase tracking-[0.2em] text-[#0d5ddf] mb-3 font-bold">Plans</p>
          <h1 className="font-roc text-[48px] leading-tight font-bold mb-4 text-black">
            Keep your memory growing.
          </h1>
          <p className="text-[16px] font-circular text-gray-600 max-w-md mx-auto">
            Your first 100 saves are free. When you're ready to go further, pick a plan that fits.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative rounded-[10px] border-2 border-black bg-white flex flex-col shadow-[5px_5px_0px_black] overflow-hidden"
            >
              {plan.highlight && (
                <div className="absolute top-2 right-2">
                  <span className="font-circular text-[9px] uppercase tracking-wider text-white bg-black px-3 py-1.5 rounded-full font-bold">
                    POPULAR
                  </span>
                </div>
              )}

              <div className="p-7 border-b-2 border-black" style={{ backgroundColor: plan.color + '12' }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full border border-black shrink-0" style={{ backgroundColor: plan.color }} />
                  <span className="font-circular text-[12px] uppercase tracking-wider text-black font-bold">{plan.name}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-roc text-[42px] font-bold text-black leading-none">{plan.price}</span>
                  <span className="font-circular text-[12px] text-gray-500">{plan.period}</span>
                </div>
                <p className="font-circular text-[11px] text-gray-500 font-medium">{plan.credits}</p>
              </div>

              <div className="p-7 flex-1 flex flex-col justify-between">
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-[13.5px]">
                      <span className="font-circular text-[#0d5ddf] font-bold mt-0.5 shrink-0">✓</span>
                      <span className="text-gray-700 leading-snug font-circular font-medium">{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => alert('Razorpay integration coming soon!')}
                  className="w-full font-circular text-[12px] uppercase tracking-widest font-bold py-3.5 rounded-[4px] border-2 border-black transition-all shadow-[3px_3px_0px_black] hover:shadow-none translate-y-[-2px] hover:translate-y-0 active:translate-y-[2px]"
                  style={{
                    backgroundColor: plan.color,
                    color: plan.name === 'Max' || plan.highlight ? 'white' : 'black',
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <p className="font-circular text-[11px] text-gray-500 font-medium">
            All plans include a 7-day free trial. Cancel anytime. Razorpay payment coming soon.
          </p>
        </div>
      </div>
    </div>
  )
}
