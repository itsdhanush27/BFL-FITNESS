import React, { useState } from 'react';
import { Quote, Sparkles, TrendingDown, ArrowRight, Award } from 'lucide-react';
import { useFitnessData } from '../../context/FitnessDataContext';

export const ResultsGallery: React.FC<{ onApply: () => void }> = ({ onApply }) => {
  const { cmsContent } = useFitnessData();
  const [activeTab, setActiveTab] = useState<string>(cmsContent.testimonials[0]?.id || '');

  const activeTestimonial = cmsContent.testimonials.find(t => t.id === activeTab) || cmsContent.testimonials[0];

  return (
    <section id="results" className="py-24 bg-white border-b border-neutral-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider shadow-xs">
            <Award className="w-3.5 h-3.5 text-red-600" /> Proven Transformations
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-neutral-900 uppercase font-display tracking-tight">
            Real Clients. <span className="text-red-600">Uncompromising Data.</span>
          </h2>
          <p className="text-base sm:text-lg text-neutral-600">
            Browse verified transformations achieved through our periodized hypertrophy programming and targeted nutrition protocols.
          </p>
        </div>

        {/* Client selector tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {cmsContent.testimonials.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-red-600 text-white shadow-md shadow-red-200 border border-red-500/40'
                  : 'bg-neutral-100 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200 border border-neutral-200'
              }`}
            >
              {t.clientName} &bull; {t.duration}
            </button>
          ))}
        </div>

        {/* Featured Transformation Card */}
        {activeTestimonial && (
          <div className="bg-neutral-50/60 border border-neutral-200 rounded-3xl p-6 sm:p-10 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Image transformation showcase */}
              <div className="lg:col-span-6 grid grid-cols-2 gap-4">
                <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 group">
                  <img
                    src={activeTestimonial.beforeImg}
                    alt="Before transformation"
                    className="w-full h-72 sm:h-84 object-cover filter brightness-95 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider text-neutral-800 border border-neutral-200 shadow-xs">
                    Day 1 Baseline
                  </div>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-red-300 bg-neutral-100 group">
                  <img
                    src={activeTestimonial.afterImg}
                    alt="After transformation"
                    className="w-full h-72 sm:h-84 object-cover filter brightness-100 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-red-600 px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider text-white shadow-md border border-red-400/40">
                    {activeTestimonial.duration} Result
                  </div>
                </div>
              </div>

              {/* Story & Verified Metrics */}
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <span className="px-3 py-1 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider inline-block mb-3">
                    {activeTestimonial.achievement}
                  </span>
                  <h3 className="text-3xl font-black text-neutral-900 font-display uppercase tracking-tight">
                    {activeTestimonial.clientName}
                  </h3>
                  <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 bg-white px-3.5 py-1.5 rounded-lg border border-neutral-200 shadow-xs">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span>{activeTestimonial.stats}</span>
                  </div>
                </div>

                <div className="relative pl-6 border-l-2 border-red-600">
                  <Quote className="w-6 h-6 text-red-500/50 absolute -top-2 left-0 -translate-x-1/2 bg-neutral-50" />
                  <p className="text-base sm:text-lg text-neutral-700 italic leading-relaxed">
                    &ldquo;{activeTestimonial.quote}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-neutral-200 shadow-xs">
                  <div className="flex -space-x-2 shrink-0">
                    <img
                      src="/assets/founders/mass-gym.jpg"
                      alt="Mass Narimanian"
                      className="w-8 h-8 rounded-full border-2 border-white object-cover"
                    />
                    <img
                      src="/assets/founders/pouya-boxing.jpg"
                      alt="Pouya Marghzari"
                      className="w-8 h-8 rounded-full border-2 border-white object-cover"
                    />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-neutral-900 block">Direct Coaching Oversight</span>
                    <span className="text-neutral-500 text-[11px]">Periodized & programmed directly by Founders Mass & Pouya</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <button
                    onClick={onApply}
                    className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-200 transition-all border border-red-500/40"
                  >
                    <span>Start Your Transformation</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-neutral-500 flex items-center gap-1.5 justify-center sm:justify-start">
                    <Sparkles className="w-3.5 h-3.5 text-red-600" /> Verified client intake and log record
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
