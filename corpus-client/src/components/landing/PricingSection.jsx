import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    name: 'Hover Lite',
    price: '₹199',
    period: '/forever',
    color: '#0d5ddf',
    features: [
      'Access to 200+ components',
      'Basic templates',
      'Community support',
      'Regular updates',
    ],
    cta: 'Purchase Hover Lite',
    highlight: false,
  },
  {
    name: 'Hover Pro',
    price: '₹499',
    period: '',
    color: '#0d5ddf',
    features: [
      'Lifetime access',
      'All inclusive',
      'Current & future',
      'Priority suggestions',
      'Modern tech',
    ],
    cta: 'Purchase Hover Pro',
    highlight: true,
  },
  {
    name: 'Hover Team',
    price: '₹999',
    period: '',
    color: '#0d5ddf',
    features: [
      'Everything in Pro',
      'Team access (up to 10 seats)',
      'Shared library & cloud sync',
      'Priority support',
      'Early access to new features',
    ],
    cta: 'Purchase Hover Team',
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
            className={`neubrutalist-card p-8 flex flex-col h-full ${
              plan.highlight
                ? 'bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative z-20 scale-105 lg:scale-110'
                : 'lg:mt-8'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-1 font-bold text-xs border-[3px] border-black whitespace-nowrap">
                MOST POPULAR
              </div>
            )}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black mb-2 font-hanken">{plan.name}</h2>
              <div className="flex items-baseline justify-center gap-1">
                <span className={`${plan.highlight ? 'text-7xl' : 'text-6xl'} font-black font-hanken`}>
                  {plan.price}
                </span>
                {plan.period && <span className="text-black/60 font-bold">{plan.period}</span>}
              </div>
            </div>
            <ul className={`mb-8 space-y-3 flex-1 ${plan.highlight ? 'font-bold text-black' : 'font-medium text-black/80'}`}>
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#259d27]">
                    check_circle
                  </span>{' '}
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/signup')}
              className={`neubrutalist-button bg-[#0d5ddf] text-white py-3 px-4 font-bold text-[18px] flex items-center justify-center gap-2`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
