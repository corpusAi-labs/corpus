import { useState } from 'react';

const FAQ_DATA = [
  {
    q: 'How does semantic search work in Corpus?',
    a: 'Unlike traditional keyword matching, our neural engine analyzes the conceptual meaning of your saves. This means you can search using natural descriptions or associations (e.g., "design system resources" or "that quote about solitude") and find the exact item instantly.',
  },
  {
    q: 'Is my saved data secure and private?',
    a: 'Absolutely. We treat your personal knowledge base as a sacred space. All ingested data is encrypted at rest and in transit. We never sell your data or use it to train public machine learning models.',
  },
  {
    q: 'Can I import my data from other platforms?',
    a: 'Yes, we support bulk imports of bookmarks, documents, and markdown notes from popular applications. You can export your entire Corpus database in JSON or CSV format at any time.',
  },
  {
    q: 'How does the browser extension capture content?',
    a: 'Our extension captures the complete DOM and page metadata in real time. It extracts pricing details, article content, product images, and article summaries automatically without requiring any manual categorization.',
  },
];

export function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      onClick={() => setIsOpen(!isOpen)}
      className="bg-white rounded-[4px] p-6 cursor-pointer select-none border-[3px] border-black shadow-hard-sm transition-all duration-200 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#000]"
    >
      <div className="flex justify-between items-center gap-4">
        <h3 className="text-xl md:text-2xl font-black font-hanken text-black uppercase">
          {question}
        </h3>
        <span className="material-symbols-outlined text-black font-bold text-2xl transition-transform duration-300">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </div>
      <div
        className={`transition-all duration-300 overflow-hidden ${
          isOpen ? 'max-h-[200px] mt-4 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-black/70 text-base md:text-lg leading-relaxed font-dm-sans border-t border-black/10 pt-4">
          {answer}
        </p>
      </div>
    </div>
  );
}

export default function FAQSection() {
  return (
    <section className="bg-transparent py-24 px-5 lg:px-20 relative z-40 border-t border-black/10" id="faq-section">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block border-[3px] border-black bg-white px-4 py-1 mb-6 font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_#000] font-hanken">
            FAQ
          </div>
          <h2 className="text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.85] font-hanken">
            Frequently <br />
            <span className="text-black/10">Asked Questions.</span>
          </h2>
        </div>

        {/* Accordion List */}
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {FAQ_DATA.map((item, i) => (
            <FAQItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
