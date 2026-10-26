import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  Dumbbell, 
  ShieldCheck, 
  ArrowRight, 
  Flame, 
  Award, 
  Clock, 
  AlertCircle,
  Filter
} from 'lucide-react';
import { CoachingPlan } from '../../types';
import { fetchCoachingPlansFromFirestore } from '../../services/firestoreService';
import { useFitnessData } from '../../context/FitnessDataContext';

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanId?: string;
  currentPlanName?: string;
  onSelectPlanForCheckout: (plan: CoachingPlan) => void;
}

export const PlanSelectionModal: React.FC<PlanSelectionModalProps> = ({
  isOpen,
  onClose,
  currentPlanId,
  currentPlanName,
  onSelectPlanForCheckout,
}) => {
  const { coachingPlans } = useFitnessData();
  const [plans, setPlans] = useState<CoachingPlan[]>(coachingPlans || []);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'face_to_face' | 'online' | 'boxing' | 'powerlifting'>('all');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchCoachingPlansFromFirestore()
        .then((fetched) => {
          if (fetched && fetched.length > 0) {
            setPlans(fetched);
          } else if (coachingPlans && coachingPlans.length > 0) {
            setPlans(coachingPlans);
          }
        })
        .catch(() => {
          if (coachingPlans && coachingPlans.length > 0) {
            setPlans(coachingPlans);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, coachingPlans]);

  if (!isOpen) return null;

  const filteredPlans = plans.filter((plan) => {
    if (selectedCategory === 'all') return true;
    return plan.category === selectedCategory;
  });

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'face_to_face':
        return 'Face-to-Face 1-on-1';
      case 'boxing':
        return 'Championship Boxing';
      case 'powerlifting':
        return 'Powerlifting (SBD)';
      case 'online':
      default:
        return 'Online Coaching';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white border border-neutral-200 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="p-6 sm:p-7 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white relative">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-red-300 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                <span>Tier Upgrade & Program Management</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase font-display tracking-tight text-white">
                Choose Your Coaching Tier
              </h2>
              <p className="text-xs text-neutral-300 max-w-xl leading-relaxed">
                Select your next training discipline. After checkout, your lead coach reviews your profile, customizes your split, and approves your initialization.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Active Plan Notice */}
          {currentPlanName && (
            <div className="mt-4 pt-3 border-t border-neutral-700/60 flex items-center justify-between text-xs">
              <span className="text-neutral-400">
                Currently Enrolled In:{' '}
                <strong className="text-white font-semibold">{currentPlanName}</strong>
              </span>
              <span className="text-[11px] text-red-400 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Upgrading preserves historical workout logs
              </span>
            </div>
          )}
        </div>

        {/* Category Filters */}
        <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
          {[
            { id: 'all', label: 'All Tiers' },
            { id: 'online', label: 'Online Coaching' },
            { id: 'face_to_face', label: 'In-Person (F2F)' },
            { id: 'boxing', label: 'Boxing Split' },
            { id: 'powerlifting', label: 'Powerlifting SBD' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Plans Grid */}
        <div className="p-6 sm:p-7 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-neutral-400">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold">Loading available coaching tiers...</p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="py-12 text-center text-neutral-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
              <p className="text-sm font-bold text-neutral-700">No plans found in this category.</p>
              <button
                onClick={() => setSelectedCategory('all')}
                className="mt-2 text-xs text-red-600 underline font-semibold"
              >
                View all tiers
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPlans.map((plan) => {
                const isCurrent = currentPlanId === plan.id || currentPlanName?.toLowerCase().includes(plan.name.toLowerCase());

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                      isCurrent
                        ? 'border-neutral-300 bg-neutral-50/70 opacity-90'
                        : 'border-neutral-200 bg-white hover:border-red-400 hover:shadow-lg hover:shadow-red-50'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          plan.category === 'boxing' ? 'bg-amber-100 text-amber-800' :
                          plan.category === 'powerlifting' ? 'bg-purple-100 text-purple-800' :
                          plan.category === 'face_to_face' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {getCategoryLabel(plan.category)}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-md bg-neutral-200 text-neutral-700 text-[10px] font-bold uppercase">
                            Current Plan
                          </span>
                        )}
                        {!isCurrent && plan.spotsLeft && (
                          <span className="text-[10px] font-bold text-red-600">
                            {plan.spotsLeft} spots available
                          </span>
                        )}
                      </div>

                      {/* Title & Price */}
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-base font-black text-neutral-900 uppercase font-display tracking-tight">
                          {plan.name}
                        </h3>
                        <div className="text-right">
                          <span className="text-xl font-black text-neutral-900 font-mono">
                            ${plan.price}
                          </span>
                          <span className="text-xs text-neutral-500 font-semibold">
                            {plan.period}
                          </span>
                        </div>
                      </div>

                      {/* Tagline */}
                      <p className="text-xs text-neutral-600 mt-1 line-clamp-2 leading-relaxed">
                        {plan.tagline}
                      </p>

                      {/* Features List */}
                      <div className="mt-3.5 space-y-1.5 pt-3 border-t border-neutral-100">
                        {plan.features?.slice(0, 4).map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-neutral-700">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-5 pt-3 border-t border-neutral-100">
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-xl bg-neutral-100 text-neutral-400 text-xs font-bold uppercase tracking-wider cursor-not-allowed border border-neutral-200"
                        >
                          Currently Subscribed
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onClose();
                            onSelectPlanForCheckout(plan);
                          }}
                          className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-red-200 cursor-pointer"
                        >
                          <span>Select Plan & Continue</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="p-3.5 bg-neutral-50 border-t border-neutral-200 text-center">
          <p className="text-[11px] text-neutral-500">
            🛡️ All payments are processed securely. Your coach receives an instant real-time notification to customize and initialize your program routine.
          </p>
        </div>
      </div>
    </div>
  );
};
