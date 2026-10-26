import React, { useState } from 'react';
import { useFitnessData } from '../../context/FitnessDataContext';
import { CoachingPlan, CMSContent, FounderCMSData } from '../../types';
import { 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  Flame, 
  DollarSign, 
  Users, 
  Award, 
  HelpCircle, 
  Mail, 
  Plus, 
  Trash2, 
  Layers, 
  ShieldCheck, 
  Target, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';

export const CMSEditor: React.FC = () => {
  const { 
    cmsContent, 
    updateCMSContent, 
    resetCMSToDefaults, 
    coachingPlans, 
    updatePlan, 
    addPlan, 
    deletePlan 
  } = useFitnessData();

  const [activeSubTab, setActiveSubTab] = useState<
    'alerts' | 'hero' | 'pricing' | 'founders' | 'methodologies' | 'testimonials' | 'faqs' | 'contact'
  >('alerts');

  // Local draft state for CMS Content
  const [draft, setDraft] = useState<CMSContent>({ ...cmsContent });
  const [plansDraft, setPlansDraft] = useState<CoachingPlan[]>(coachingPlans);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Sync draft if external cmsContent updates
  React.useEffect(() => {
    setDraft({ ...cmsContent });
  }, [cmsContent]);

  React.useEffect(() => {
    setPlansDraft(coachingPlans);
  }, [coachingPlans]);

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // 1. Save CMS Content
    updateCMSContent(draft);
    // 2. Save each coaching plan
    plansDraft.forEach(plan => {
      updatePlan(plan.id, plan);
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    if (confirm('Are you sure you want to reset all CMS copy and marketing content to factory defaults?')) {
      resetCMSToDefaults();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 2500);
    }
  };

  // Helpers for nested fields
  const handleMassChange = (field: keyof FounderCMSData, val: any) => {
    setDraft(prev => ({
      ...prev,
      massFounder: {
        ...(prev.massFounder || {
          title: 'Mass Narimanian',
          subtitle: 'Founder & Coach • Hypertrophy & Stage Conditioning Specialist',
          badge: '15+ Years Elite Experience',
          quote: '',
          pillars: []
        }),
        [field]: val
      }
    }));
  };

  const handlePouyaChange = (field: keyof FounderCMSData, val: any) => {
    setDraft(prev => ({
      ...prev,
      pouyaFounder: {
        ...(prev.pouyaFounder || {
          title: 'Pouya Marghzari',
          subtitle: 'Founder & Coach • Boxing & Powerlifting Specialist',
          badge: '10+ Years Competitive Boxing & Powerlifting',
          quote: '',
          pillars: []
        }),
        [field]: val
      }
    }));
  };

  // Plan editing helpers
  const handleUpdatePlanField = (index: number, field: keyof CoachingPlan, value: any) => {
    setPlansDraft(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddFeatureToPlan = (planIndex: number) => {
    setPlansDraft(prev => {
      const updated = [...prev];
      const plan = { ...updated[planIndex] };
      plan.features = [...plan.features, 'New premium coaching deliverable'];
      updated[planIndex] = plan;
      return updated;
    });
  };

  const handleUpdatePlanFeature = (planIndex: number, featureIndex: number, text: string) => {
    setPlansDraft(prev => {
      const updated = [...prev];
      const plan = { ...updated[planIndex] };
      const feats = [...plan.features];
      feats[featureIndex] = text;
      plan.features = feats;
      updated[planIndex] = plan;
      return updated;
    });
  };

  const handleDeletePlanFeature = (planIndex: number, featureIndex: number) => {
    setPlansDraft(prev => {
      const updated = [...prev];
      const plan = { ...updated[planIndex] };
      plan.features = plan.features.filter((_, i) => i !== featureIndex);
      updated[planIndex] = plan;
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200">
              <Layers className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-red-600">
              Front-End Content Management System
            </span>
          </div>
          <h2 className="text-2xl font-black text-neutral-900 uppercase font-display tracking-tight">
            Website Content &amp; Pricing Manager
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Modify any marketing copy, headline, founder biography, pricing tier, or FAQ without touching source code.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:border-neutral-400 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveAll()}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-red-200 cursor-pointer transition-all border border-red-500/40"
          >
            <Save className="w-4 h-4" />
            <span>Publish CMS Updates</span>
          </button>
        </div>
      </div>

      {/* Status Alerts */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>All CMS content &amp; coaching tier updates published! Public pages will immediately reflect changes.</span>
        </div>
      )}

      {resetSuccess && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>CMS copy has been reset to default values.</span>
        </div>
      )}

      {/* Navigation Tabs for CMS Sections */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-neutral-100/80 rounded-2xl border border-neutral-200">
        {[
          { id: 'alerts', label: 'Alerts & Notices', icon: Flame },
          { id: 'hero', label: 'Hero Section', icon: Sparkles },
          { id: 'pricing', label: 'Coaching Plans & Pricing', icon: DollarSign },
          { id: 'founders', label: 'Founders & Bios', icon: Award },
          { id: 'methodologies', label: '4 Pillars (Methodologies)', icon: ShieldCheck },
          { id: 'testimonials', label: 'Transformation Results', icon: Users },
          { id: 'faqs', label: 'Objection FAQs', icon: HelpCircle },
          { id: 'contact', label: 'Contact & Footer', icon: Mail }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                isActive 
                  ? 'bg-neutral-900 text-white shadow-xs' 
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-red-500" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ALERTS & NOTICES */}
      {activeSubTab === 'alerts' && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="border-b border-neutral-200 pb-4">
            <h3 className="text-lg font-black text-neutral-900 uppercase font-display">
              Top Announcements &amp; Urgency Banners
            </h3>
            <p className="text-xs text-neutral-500">
              Control the top notification bar, hero scarcity banner, and application alerts.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Top Global Announcement Bar (Header)
              </label>
              <input
                type="text"
                value={draft.topAnnouncementBar || ''}
                onChange={(e) => setDraft(prev => ({ ...prev, topAnnouncementBar: e.target.value }))}
                placeholder="e.g. BFL Coaching Portal MVP • Instant Access for Clients & Coaches"
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:border-red-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Hero Urgency Banner Pill (CMS Field: bannerNotice)
              </label>
              <input
                type="text"
                value={draft.bannerNotice}
                onChange={(e) => setDraft(prev => ({ ...prev, bannerNotice: e.target.value }))}
                placeholder="🔥 SPRING ROSTER OPENING: 3 SPOTS REMAINING FOR ELITE 1-ON-1 COACHING"
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:border-red-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Founder Application CTA Callout (Bottom About Section)
              </label>
              <input
                type="text"
                value={draft.founderApplicationsNotice || ''}
                onChange={(e) => setDraft(prev => ({ ...prev, founderApplicationsNotice: e.target.value }))}
                placeholder="Limited Coaching Roster • Applications Open"
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:border-red-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HERO SECTION */}
      {activeSubTab === 'hero' && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="border-b border-neutral-200 pb-4">
            <h3 className="text-lg font-black text-neutral-900 uppercase font-display">
              Hero Section Copy &amp; Metrics
            </h3>
            <p className="text-xs text-neutral-500">
              Primary headline, subheadline, trust bullet points, and marketing statistics.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Hero Headline (Separate sentences with periods to format colored accents)
              </label>
              <input
                type="text"
                value={draft.heroHeadline}
                onChange={(e) => setDraft(prev => ({ ...prev, heroHeadline: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm focus:border-red-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Hero Subheadline
              </label>
              <textarea
                rows={3}
                value={draft.heroSubheadline}
                onChange={(e) => setDraft(prev => ({ ...prev, heroSubheadline: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:border-red-600 focus:bg-white focus:outline-none resize-none"
              />
            </div>

            <div className="border-t border-neutral-200 pt-4">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Hero Trust Highlights (3 Checkmarks under CTAs)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(draft.heroTrustPoints || ['Bespoke Macro Programming', 'Weekly Video Lift Audits', 'In-App Progressive Overload']).map((pt, i) => (
                  <input
                    key={i}
                    type="text"
                    value={pt}
                    onChange={(e) => {
                      const updated = [...(draft.heroTrustPoints || ['Bespoke Macro Programming', 'Weekly Video Lift Audits', 'In-App Progressive Overload'])];
                      updated[i] = e.target.value;
                      setDraft(prev => ({ ...prev, heroTrustPoints: updated }));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:border-red-600 focus:bg-white focus:outline-none"
                  />
                ))}
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-4">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Authority Metric Cards (Count &amp; Label)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(draft.heroStats || [
                  { count: '500+', label: 'Transformations Completed' },
                  { count: '98.4%', label: 'Goal Adherence Rate' },
                  { count: '12+ Yrs', label: 'Evidence-Based Coaching' },
                  { count: '100%', label: 'Personalized Plans' }
                ]).map((stat, i) => (
                  <div key={i} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                    <input
                      type="text"
                      value={stat.count}
                      onChange={(e) => {
                        const updated = [...(draft.heroStats || [])];
                        updated[i] = { ...updated[i], count: e.target.value };
                        setDraft(prev => ({ ...prev, heroStats: updated }));
                      }}
                      placeholder="Count (e.g. 500+)"
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-black text-neutral-900"
                    />
                    <input
                      type="text"
                      value={stat.label}
                      onChange={(e) => {
                        const updated = [...(draft.heroStats || [])];
                        updated[i] = { ...updated[i], label: e.target.value };
                        setDraft(prev => ({ ...prev, heroStats: updated }));
                      }}
                      placeholder="Label"
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-[11px] text-neutral-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COACHING PLANS & PRICING */}
      {activeSubTab === 'pricing' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-neutral-900 uppercase font-display">
                  Coaching Tiers &amp; Pricing Plans
                </h3>
                <p className="text-xs text-neutral-500">
                  Update rates, taglines, capacity limits, and deliverable bullet lists for each plan.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newPlanId = 'plan_' + Date.now();
                  const newPlan: CoachingPlan = {
                    id: newPlanId,
                    name: 'New Coaching Tier',
                    tagline: 'Custom transformation tier description',
                    price: 299,
                    period: '/ month',
                    features: [
                      'Custom periodized workout programming',
                      'Direct in-app messaging with coach'
                    ],
                    idealFor: 'Athletes seeking dedicated guidance',
                    spotsLeft: 3
                  };
                  addPlan(newPlan);
                  setPlansDraft(prev => [...prev, newPlan]);
                }}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 text-red-500" />
                <span>Add New Tier</span>
              </button>
            </div>

            {/* Global Pricing Header Copy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 mb-6 border-b border-neutral-200">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Pricing Section Headline
                </label>
                <input
                  type="text"
                  value={draft.plansHeadline || ''}
                  onChange={(e) => setDraft(prev => ({ ...prev, plansHeadline: e.target.value }))}
                  placeholder="Invest in Guaranteed Results"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:border-red-600 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Pricing Section Subheadline
                </label>
                <input
                  type="text"
                  value={draft.plansSubheadline || ''}
                  onChange={(e) => setDraft(prev => ({ ...prev, plansSubheadline: e.target.value }))}
                  placeholder="No cookie-cutter algorithms..."
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:border-red-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-8">
              {plansDraft.map((plan, planIdx) => (
                <div 
                  key={plan.id}
                  className="p-6 rounded-2xl border border-neutral-200 bg-neutral-50/50 space-y-4 relative"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-bold flex items-center justify-center text-xs font-mono">
                        {planIdx + 1}
                      </span>
                      <h4 className="text-base font-black text-neutral-900 uppercase font-display">
                        {plan.name}
                      </h4>
                      {plan.popular && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold uppercase">
                          Most Popular
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!plan.popular}
                          onChange={(e) => handleUpdatePlanField(planIdx, 'popular', e.target.checked)}
                          className="rounded text-red-600 focus:ring-red-500"
                        />
                        <span>Highlight as Most Popular</span>
                      </label>

                      {plansDraft.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete the tier "${plan.name}"?`)) {
                              deletePlan(plan.id);
                              setPlansDraft(prev => prev.filter(p => p.id !== plan.id));
                            }
                          }}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-2 cursor-pointer"
                          title="Delete Tier"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                        Plan Name
                      </label>
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => handleUpdatePlanField(planIdx, 'name', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-bold text-neutral-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                        Monthly Price ($ USD)
                      </label>
                      <input
                        type="number"
                        value={plan.price}
                        onChange={(e) => handleUpdatePlanField(planIdx, 'price', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-bold text-neutral-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                        Billing Period
                      </label>
                      <input
                        type="text"
                        value={plan.period}
                        onChange={(e) => handleUpdatePlanField(planIdx, 'period', e.target.value)}
                        placeholder="e.g. / month"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                        Spots Remaining
                      </label>
                      <input
                        type="number"
                        value={plan.spotsLeft ?? ''}
                        onChange={(e) => handleUpdatePlanField(planIdx, 'spotsLeft', Number(e.target.value))}
                        placeholder="e.g. 2"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                      Short Tagline
                    </label>
                    <input
                      type="text"
                      value={plan.tagline}
                      onChange={(e) => handleUpdatePlanField(planIdx, 'tagline', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                      Ideal Target Audience
                    </label>
                    <input
                      type="text"
                      value={plan.idealFor}
                      onChange={(e) => handleUpdatePlanField(planIdx, 'idealFor', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900"
                    />
                  </div>

                  {/* Feature deliverables editor */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-700 uppercase">
                        Included Features &amp; Deliverables ({plan.features.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddFeatureToPlan(planIdx)}
                        className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Deliverable</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {plan.features.map((feature, featIdx) => (
                        <div key={featIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={feature}
                            onChange={(e) => handleUpdatePlanFeature(planIdx, featIdx, e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs text-neutral-800"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeletePlanFeature(planIdx, featIdx)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-neutral-100 cursor-pointer"
                            title="Remove feature"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FOUNDERS & BIOS */}
      {activeSubTab === 'founders' && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-8 shadow-sm">
          <div className="border-b border-neutral-200 pb-4">
            <h3 className="text-lg font-black text-neutral-900 uppercase font-display">
              Founders Section &amp; Biographies
            </h3>
            <p className="text-xs text-neutral-500">
              Customize Mass Narimanian and Pouya Marghzari's credentials, bio quotes, and specialized pillars.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Section Main Headline
              </label>
              <input
                type="text"
                value={draft.foundersHeadline || ''}
                onChange={(e) => setDraft(prev => ({ ...prev, foundersHeadline: e.target.value }))}
                placeholder="Built by Athletes. Engineered for Results."
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-bold text-neutral-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Section Subheadline
              </label>
              <input
                type="text"
                value={draft.foundersSubheadline || ''}
                onChange={(e) => setDraft(prev => ({ ...prev, foundersSubheadline: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-xs text-neutral-900"
              />
            </div>
          </div>

          {/* Mass Narimanian Editor */}
          <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
              <Award className="w-5 h-5 text-red-600" />
              <h4 className="text-base font-black text-neutral-900 uppercase font-display">
                Founder 1: Mass Narimanian
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">Display Name</label>
                <input
                  type="text"
                  value={draft.massFounder?.title || 'Mass Narimanian'}
                  onChange={(e) => handleMassChange('title', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">Title &amp; Subtitle</label>
                <input
                  type="text"
                  value={draft.massFounder?.subtitle || ''}
                  onChange={(e) => handleMassChange('subtitle', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">Experience Badge</label>
                <input
                  type="text"
                  value={draft.massFounder?.badge || ''}
                  onChange={(e) => handleMassChange('badge', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">Bio Quote</label>
              <textarea
                rows={3}
                value={draft.massFounder?.quote || ''}
                onChange={(e) => handleMassChange('quote', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs resize-none"
              />
            </div>
          </div>

          {/* Pouya Marghzari Editor */}
          <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
              <Award className="w-5 h-5 text-red-600" />
              <h4 className="text-base font-black text-neutral-900 uppercase font-display">
                Founder 2: Pouya Marghzari
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">Display Name</label>
                <input
                  type="text"
                  value={draft.pouyaFounder?.title || 'Pouya Marghzari'}
                  onChange={(e) => handlePouyaChange('title', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">Title &amp; Subtitle</label>
                <input
                  type="text"
                  value={draft.pouyaFounder?.subtitle || ''}
                  onChange={(e) => handlePouyaChange('subtitle', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">Experience Badge</label>
                <input
                  type="text"
                  value={draft.pouyaFounder?.badge || ''}
                  onChange={(e) => handlePouyaChange('badge', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">Bio Quote</label>
              <textarea
                rows={3}
                value={draft.pouyaFounder?.quote || ''}
                onChange={(e) => handlePouyaChange('quote', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: 4 PILLARS (METHODOLOGIES) */}
      {activeSubTab === 'methodologies' && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="border-b border-neutral-200 pb-4">
            <h3 className="text-lg font-black text-neutral-900 uppercase font-display">
              Methodologies &amp; Scientific Pillars
            </h3>
            <p className="text-xs text-neutral-500">
              The 4 foundational pillars displayed on the homepage and about section.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Mission Statement &amp; Origin Overview (CMS Field: coachOriginStory)
            </label>
            <textarea
              rows={4}
              value={draft.coachOriginStory}
              onChange={(e) => setDraft(prev => ({ ...prev, coachOriginStory: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:border-red-600 focus:bg-white focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-neutral-200">
            <h4 className="text-xs font-black uppercase text-neutral-800 tracking-wider">
              The 4 Coaching Architecture Pillars
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {draft.trainingMethodologies.map((method, i) => (
                <div key={i} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center justify-center font-mono">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={method.title}
                      onChange={(e) => {
                        const updated = [...draft.trainingMethodologies];
                        updated[i] = { ...updated[i], title: e.target.value };
                        setDraft(prev => ({ ...prev, trainingMethodologies: updated }));
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-bold text-neutral-900"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={method.description}
                    onChange={(e) => {
                      const updated = [...draft.trainingMethodologies];
                      updated[i] = { ...updated[i], description: e.target.value };
                      setDraft(prev => ({ ...prev, trainingMethodologies: updated }));
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-neutral-300 text-xs text-neutral-700 resize-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: TESTIMONIALS */}
      {activeSubTab === 'testimonials' && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <div>
              <h3 className="text-lg font-black text-neutral-900 uppercase font-display">
                Transformation Results &amp; Testimonials
              </h3>
              <p className="text-xs text-neutral-500">
                Verified client before/after photos, metric highlights, and quotes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const newT = {
                  id: 't_' + Date.now(),
                  clientName: 'New Athlete',
                  achievement: 'Physique Transformation',
                  duration: '12 Weeks',
                  stats: 'Body Fat: 22% → 14%',
                  quote: 'Custom testimonial feedback describing coaching experience...',
                  beforeImg: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80',
                  afterImg: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80'
                };
                setDraft(prev => ({ ...prev, testimonials: [...prev.testimonials, newT] }));
              }}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-red-500" />
              <span>Add Transformation</span>
            </button>
          </div>

          <div className="space-y-6">
            {draft.testimonials.map((t, idx) => (
              <div key={t.id} className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                  <span className="text-xs font-bold uppercase text-neutral-800">
                    Testimonial #{idx + 1} &bull; {t.clientName}
                  </span>
                  {draft.testimonials.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(prev => ({
                          ...prev,
                          testimonials: prev.testimonials.filter((_, i) => i !== idx)
                        }));
                      }}
                      className="p-1 text-neutral-400 hover:text-red-600 cursor-pointer"
                      title="Delete Testimonial"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Client Name</label>
                    <input
                      type="text"
                      value={t.clientName}
                      onChange={(e) => {
                        const updated = [...draft.testimonials];
                        updated[idx] = { ...updated[idx], clientName: e.target.value };
                        setDraft(prev => ({ ...prev, testimonials: updated }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Achievement</label>
                    <input
                      type="text"
                      value={t.achievement}
                      onChange={(e) => {
                        const updated = [...draft.testimonials];
                        updated[idx] = { ...updated[idx], achievement: e.target.value };
                        setDraft(prev => ({ ...prev, testimonials: updated }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Duration &amp; Stats</label>
                    <input
                      type="text"
                      value={t.stats}
                      onChange={(e) => {
                        const updated = [...draft.testimonials];
                        updated[idx] = { ...updated[idx], stats: e.target.value };
                        setDraft(prev => ({ ...prev, testimonials: updated }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Quote</label>
                  <textarea
                    rows={2}
                    value={t.quote}
                    onChange={(e) => {
                      const updated = [...draft.testimonials];
                      updated[idx] = { ...updated[idx], quote: e.target.value };
                      setDraft(prev => ({ ...prev, testimonials: updated }));
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: FAQS */}
      {activeSubTab === 'faqs' && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <div>
              <h3 className="text-lg font-black text-neutral-900 uppercase font-display">
                Frequently Asked Questions (FAQs)
              </h3>
              <p className="text-xs text-neutral-500">
                Manage objection-handling questions and operational details shown on the landing page.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const newFaq = {
                  category: 'General',
                  question: 'New frequently asked question?',
                  answer: 'Clear, detailed answer explaining how BFL coaching works.'
                };
                setDraft(prev => ({ ...prev, faqs: [...prev.faqs, newFaq] }));
              }}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-red-500" />
              <span>Add FAQ</span>
            </button>
          </div>

          <div className="space-y-4">
            {draft.faqs.map((faq, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={faq.category}
                      onChange={(e) => {
                        const updated = [...draft.faqs];
                        updated[idx] = { ...updated[idx], category: e.target.value };
                        setDraft(prev => ({ ...prev, faqs: updated }));
                      }}
                      placeholder="Category (e.g. General, Training)"
                      className="w-32 px-2.5 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-bold text-red-600"
                    />
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => {
                        const updated = [...draft.faqs];
                        updated[idx] = { ...updated[idx], question: e.target.value };
                        setDraft(prev => ({ ...prev, faqs: updated }));
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-bold text-neutral-900"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDraft(prev => ({ ...prev, faqs: prev.faqs.filter((_, i) => i !== idx) }));
                    }}
                    className="p-1 text-neutral-400 hover:text-red-600 cursor-pointer"
                    title="Delete FAQ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  rows={2}
                  value={faq.answer}
                  onChange={(e) => {
                    const updated = [...draft.faqs];
                    updated[idx] = { ...updated[idx], answer: e.target.value };
                    setDraft(prev => ({ ...prev, faqs: updated }));
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-neutral-300 text-xs text-neutral-700 resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: CONTACT & FOOTER */}
      {activeSubTab === 'contact' && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="border-b border-neutral-200 pb-4">
            <h3 className="text-lg font-black text-neutral-900 uppercase font-display">
              Contact Channels &amp; Footer Information
            </h3>
            <p className="text-xs text-neutral-500">
              Emails, phone numbers, office location, hours of operation, and certifications.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Direct Inquiries Email
              </label>
              <input
                type="email"
                value={draft.contactEmail || ''}
                onChange={(e) => setDraft(prev => ({ ...prev, contactEmail: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-xs text-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Support Phone Number
              </label>
              <input
                type="text"
                value={draft.supportPhone || ''}
                onChange={(e) => setDraft(prev => ({ ...prev, supportPhone: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-xs text-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Operating Hours &amp; Response Speed
              </label>
              <input
                type="text"
                value={draft.supportHours || ''}
                onChange={(e) => setDraft(prev => ({ ...prev, supportHours: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-xs text-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Physical Location / Headquarters
              </label>
              <input
                type="text"
                value={draft.locationAddress || ''}
                onChange={(e) => setDraft(prev => ({ ...prev, locationAddress: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-xs text-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Instagram Handle
              </label>
              <input
                type="text"
                value={draft.instagramHandle || ''}
                onChange={(e) => setDraft(prev => ({ ...prev, instagramHandle: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-xs text-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                YouTube Channel Name
              </label>
              <input
                type="text"
                value={draft.youtubeChannel || ''}
                onChange={(e) => setDraft(prev => ({ ...prev, youtubeChannel: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-xs text-neutral-900"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-200">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Footer Brand Description
            </label>
            <textarea
              rows={2}
              value={draft.footerDescription || ''}
              onChange={(e) => setDraft(prev => ({ ...prev, footerDescription: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
