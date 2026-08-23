import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    name: 'Corpus Lite',
    price: '₹199',
    period: '/month',
    color: '#0d5ddf',
    features: [
      '500 saves per month',
      'AI tagging + TLDR',
      'All save types (link, note, quote, image)',
      'Regular updates',
      'Semantic search',
       'Up to 25 Spaces'
    ],
    cta: 'Purchase Corpus Lite',
    highlight: false,
  },
  {
    name: 'Corpus Pro',
    price: '₹499',
    period: '',
    color: '#0d5ddf',
    features: [
       '2,000 saves per month',

        'AI tagging + TLDR',
        
        'All save types + browser extension',
          
        'Semantic search',
        
        'Unlimited Spaces',
        
        'Priority AI processing',
    ],
    cta: 'Purchase Corpus Pro',
    highlight: true,
  },
  {
    name: 'Corpus Team',
    price: '₹999',
    period: '',
    color: '#0d5ddf',
    features: [
      'Everything in Pro',
      'Unlimited saves',
      'AI tagging + TLDR',
      'All save types + browser extension',
      'Semantic search',
      'Unlimited Spaces',
      'Priority AI processing',
      'Export archive (JSON/CSV)',
      'Shared library & cloud sync',
      'Team access (up to 10 seats)',
      'Priority support',
      'Early access to new features',
    ],
    cta: 'Purchase Corpus Team',
    highlight: false,
  },
];

export default function PricingSection() {
  const navigate = useNavigate();

  return (
    <section
     className=" z-40 relative flex flex-col min-h-screen mt-5 pt-40 pb-24"
      id="pricing-section"
    >
      <div className="  max-w-7xl mx-auto text-center mb-12 px-5 relative ">
        <div className="inline-block border-[3px] border-black bg-white px-4 py-1 mb-6 font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_#000] font-hanken">
          Pricing Plans
        </div>
        <h2 className="text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.85] mb-6 font-hanken">
          Choose your toolkit
        </h2>
      </div>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12 items-start px-5 relative z-10 font-dm-sans">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`bg-white border-[3px] border-black rounded-[4px] p-6 flex flex-col h-full transition-all duration-200 hover:translate-y-[-2px] ${
              plan.highlight
                ? 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] relative z-20 scale-102 lg:scale-105'
                : 'shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] lg:mt-4'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 font-bold text-[10px] border-2 border-black rounded-[4px] whitespace-nowrap">
                MOST POPULAR
              </div>
            )}
            <div className="text-center mb-4">
              <h2 className="text-xl font-black mb-1.5 font-hanken">{plan.name}</h2>
              <div className="flex items-baseline justify-center gap-0.5">
                <span className={`${plan.highlight ? 'text-5xl' : 'text-4xl'} font-black font-hanken`}>
                  {plan.price}
                </span>
                {plan.period && <span className="text-black/60 font-bold text-xs">{plan.period}</span>}
              </div>
            </div>
            <ul className={`mb-6 space-y-2 flex-1 ${plan.highlight ? 'font-bold text-black' : 'font-medium text-black/80'}`}>
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-left">
                  <span className="material-symbols-outlined text-[16px] text-[#259d27] mt-0.5 shrink-0">
                    check_circle
                  </span>{' '}
                  <span className="leading-tight text-[13.5px]">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/signup')}
              className={`neubrutalist-button bg-[#0d5ddf] text-white py-3 px-4 font-bold text-[16px] flex items-center justify-center gap-2`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
