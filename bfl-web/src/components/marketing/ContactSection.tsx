import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Instagram, Youtube, Clock } from 'lucide-react';
import { useFitnessData } from '../../context/FitnessDataContext';

export const ContactSection: React.FC = () => {
  const { cmsContent } = useFitnessData();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [goal, setGoal] = useState('hypertrophy');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setSubmitted(true);
  };

  return (
    <section id="contact" className="py-24 bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Contact details */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider shadow-xs">
              <Mail className="w-3.5 h-3.5 text-red-600" /> Get in Touch
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-neutral-900 uppercase font-display tracking-tight">
              Ready to Break Your <span className="text-red-600">Plateau?</span>
            </h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              Have questions regarding our coaching tiers, injury accommodations, or custom programming? Reach out directly and we will respond within 12-24 hours.
            </p>

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 text-sm text-neutral-700 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                <Mail className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <span className="text-xs text-neutral-500 block font-semibold">Direct Coaching Email</span>
                  <span className="font-bold text-neutral-900">{cmsContent.contactEmail || 'coaching@bflfitness.com'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-neutral-700 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                <Clock className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <span className="text-xs text-neutral-500 block font-semibold">Support & Response Time</span>
                  <span className="font-bold text-neutral-900">{cmsContent.supportHours || 'Mon – Sat, 7:00 AM – 7:00 PM CST (within 4-12 hrs)'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-neutral-700 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                <MapPin className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <span className="text-xs text-neutral-500 block font-semibold">Physical Location</span>
                  <span className="font-bold text-neutral-900">{cmsContent.locationAddress || 'Austin, TX (Remote athletes worldwide)'}</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Connect on Social:</p>
              <div className="flex items-center gap-3">
                <a href="#instagram" className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-700 hover:text-red-600 hover:border-red-300 transition-colors">
                  <Instagram className="w-4 h-4 text-red-600" />
                  <span>{cmsContent.instagramHandle || '@bfl_fitness'}</span>
                </a>
                <a href="#youtube" className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-700 hover:text-red-600 hover:border-red-300 transition-colors">
                  <Youtube className="w-4 h-4 text-red-600" />
                  <span>{cmsContent.youtubeChannel || 'BFL Masterclass'}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Inquiry Form */}
          <div className="lg:col-span-7">
            <div className="bg-neutral-50/60 border border-neutral-200 rounded-3xl p-8 sm:p-10 shadow-sm">
              {submitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-500 text-white flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-black text-neutral-900 uppercase font-display">Inquiry Received!</h3>
                  <p className="text-sm text-neutral-600 max-w-md mx-auto">
                    Thank you {name}. Our coaching staff will review your details and email your consultation recommendations shortly.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border border-neutral-900"
                  >
                    Send Another Note
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-xl font-black text-neutral-900 uppercase font-display mb-2">
                    Submit Coaching Inquiry
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Jordan Mitchell"
                        className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                      Primary Physique / Performance Goal
                    </label>
                    <select
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none cursor-pointer"
                    >
                      <option value="hypertrophy">Maximum Muscle Hypertrophy</option>
                      <option value="fat_loss">Aggressive Fat Loss & Shredding</option>
                      <option value="recomp">Body Recomposition (Gain Muscle & Drop Fat)</option>
                      <option value="strength">Powerlifting / Strength Focus</option>
                      <option value="contest_prep">Bodybuilding Contest Preparation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                      Tell us about your background & training history
                    </label>
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Current lifting experience, any previous injuries, and what your main stumbling blocks have been..."
                      className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm uppercase tracking-wider shadow-md shadow-red-200 cursor-pointer flex items-center justify-center gap-2 transition-all border border-red-500/40"
                  >
                    <span>Submit Consultation Request</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
