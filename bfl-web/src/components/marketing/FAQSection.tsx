import React, { useState } from 'react';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { useFitnessData } from '../../context/FitnessDataContext';

export const FAQSection: React.FC = () => {
  const { cmsContent } = useFitnessData();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(cmsContent.faqs.map(f => f.category)))];

  const filteredFaqs = filterCategory === 'All' 
    ? cmsContent.faqs 
    : cmsContent.faqs.filter(f => f.category === filterCategory);

  return (
    <section id="faq" className="py-24 bg-white border-b border-neutral-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider shadow-xs">
            <HelpCircle className="w-3.5 h-3.5 text-red-600" /> Frequently Asked Questions
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-neutral-900 uppercase font-display tracking-tight">
            Clear Answers. <span className="text-red-600">Zero Ambiguity.</span>
          </h2>
          <p className="text-base text-neutral-600">
            Everything you need to know about our coaching intake, weekly workflows, app tracking, and expectations.
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterCategory === cat 
                  ? 'bg-red-600 text-white shadow-xs border border-red-500/40' 
                  : 'bg-neutral-100 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200 border border-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Accordions */}
        <div className="space-y-4">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white border border-neutral-200 rounded-2xl overflow-hidden transition-colors hover:border-neutral-300 shadow-xs"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full text-left p-6 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-neutral-100 text-red-600 border border-neutral-200">
                      {faq.category}
                    </span>
                    <span className="font-bold text-base sm:text-lg text-neutral-900">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-neutral-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-red-600' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-sm sm:text-base text-neutral-700 leading-relaxed border-t border-neutral-100 mt-1">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center p-6 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900">Have a specific question not covered here?</p>
              <p className="text-xs text-neutral-500">Send an inquiry directly to the coaching desk.</p>
            </div>
          </div>
          <a
            href="#contact"
            className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shrink-0 border border-neutral-900 cursor-pointer"
          >
            Contact Desk
          </a>
        </div>
      </div>
    </section>
  );
};
