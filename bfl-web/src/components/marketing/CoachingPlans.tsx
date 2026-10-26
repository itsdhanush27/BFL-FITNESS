import React, { useState } from 'react';
import { Check, Flame, ShieldAlert, ArrowRight, Star, Dumbbell, Globe, Swords, Award } from 'lucide-react';
import { useFitnessData } from '../../context/FitnessDataContext';

interface CoachingPlansProps {
  onSelectPlan: (planId: string) => void;
}

export const CoachingPlans: React.FC<CoachingPlansProps> = ({ onSelectPlan }) => {
  const { coachingPlans, cmsContent } = useFitnessData();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'online' | 'face_to_face' | 'specialized'>('all');

  const filteredPlans = coachingPlans.filter(plan => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'online') return plan.category === 'online';
    if (selectedCategory === 'face_to_face') return plan.category === 'face_to_face';
    if (selectedCategory === 'specialized') return plan.category === 'boxing' || plan.category === 'powerlifting';
    return true;
  });

  const getCategoryBadge = (plan: typeof coachingPlans[0]) => {
    if (plan.category === 'face_to_face') {
      return {
        label: 'In-Person Gym',
        icon: Dumbbell,
        className: 'bg-neutral-900 text-white border-neutral-800'
      };
    }
    if (plan.category === 'online') {
      return {
        label: 'Full Diet & Exercise',
        icon: Globe,
        className: 'bg-red-50 text-red-700 border-red-200'
      };
    }
    if (plan.category === 'boxing') {
      return {
        label: 'Boxing Technical',
        icon: Swords,
        className: 'bg-amber-50 text-amber-800 border-amber-200'
      };
    }
    if (plan.category === 'powerlifting') {
      return {
        label: 'Powerlifting SBD',
        icon: Award,
        className: 'bg-zinc-100 text-zinc-900 border-zinc-300'
      };
    }
    return {
      label: 'Bespoke Coaching',
      icon: Star,
      className: 'bg-neutral-100 text-neutral-800 border-neutral-200'
    };
  };

  return (
    <section id="plans" className="py-24 bg-neutral-50/50 border-b border-neutral-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider shadow-xs">
            <Star className="w-3 h-3 fill-red-600 text-red-600" /> Tiered Coaching Roster
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-neutral-900 uppercase font-display tracking-tight">
            {cmsContent.plansHeadline || 'Invest in Guaranteed Results'}
          </h2>
          <p className="text-base sm:text-lg text-neutral-600">
            {cmsContent.plansSubheadline || 'Transparent rates for Face-to-Face gym training, full online diet & exercise protocols, and elite boxing & powerlifting.'}
          </p>

          {/* Interactive Category Filter Pills */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'all', label: 'All Programs' },
              { id: 'face_to_face', label: 'Face-to-Face Gym ($80/hr, $390/wk, $1,500/mo)' },
              { id: 'online', label: 'Online Full Diet & Exercise ($99/wk, $350/mo)' },
              { id: 'specialized', label: 'Boxing & Powerlifting ($80/hr)' }
            ].map(cat => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                    active
                      ? 'bg-red-600 text-white shadow-md shadow-red-200 border border-red-600'
                      : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {filteredPlans.map((plan) => {
            const isPopular = plan.popular;
            const badge = getCategoryBadge(plan);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                  isPopular
                    ? 'bg-white border-2 border-red-600 shadow-xl scale-102 lg:-translate-y-2 z-10'
                    : 'bg-white border border-neutral-200 hover:border-neutral-300 shadow-xs'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-red-600 rounded-full text-xs font-black text-white uppercase tracking-wider flex items-center gap-1 shadow-md shadow-red-200 border border-red-400/40">
                    <Flame className="w-3.5 h-3.5 fill-white text-white" /> Most Popular Tier
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-bold uppercase tracking-wider ${badge.className}`}>
                      <BadgeIcon className="w-3 h-3" />
                      <span>{badge.label}</span>
                    </div>
                    {plan.spotsLeft && (
                      <span className="px-2.5 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-700 text-[11px] font-bold font-mono">
                        {plan.spotsLeft} spots
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-black text-neutral-900 font-display uppercase tracking-tight">
                    {plan.name}
                  </h3>

                  <p className="text-xs text-neutral-600 min-h-[36px] my-4 leading-relaxed">
                    {plan.tagline}
                  </p>

                  <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-neutral-200">
                    <span className="text-5xl font-black text-neutral-900 font-display tracking-tight font-mono">
                      ${plan.price}
                    </span>
                    <span className="text-sm font-semibold text-neutral-500">
                      {plan.period}
                    </span>
                  </div>

                  <div className="space-y-3 mb-8">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                      Everything Included:
                    </p>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm text-neutral-700">
                        <div className="w-5 h-5 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-red-600" />
                        </div>
                        <span className="leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-600">
                    <span className="font-bold text-neutral-900 block mb-0.5">Target Athlete:</span>
                    {plan.idealFor}
                  </div>

                  <button
                    onClick={() => onSelectPlan(plan.id)}
                    className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      isPopular
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200 border border-red-500/50'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-900'
                    }`}
                  >
                    <span>Apply & Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <p className="text-center text-[10px] text-neutral-500 flex items-center justify-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-neutral-400" /> Instant onboarding & admin plan activation
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
