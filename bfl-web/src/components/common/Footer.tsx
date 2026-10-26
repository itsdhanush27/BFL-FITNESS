import React from 'react';
import { Dumbbell, Instagram, Youtube, Mail, Phone, MapPin, Shield } from 'lucide-react';
import { useFitnessData } from '../../context/FitnessDataContext';

export const Footer: React.FC<{ onNavigate: (view: 'marketing' | 'client_portal' | 'coach_portal') => void }> = ({ onNavigate }) => {
  const { cmsContent } = useFitnessData();

  return (
    <footer className="bg-white border-t border-neutral-200 text-neutral-600 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Col 1: Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl bg-neutral-950 flex items-center justify-center shadow-md shadow-neutral-900/20 border border-neutral-800 p-1.5 overflow-hidden shrink-0">
                <img 
                  src="/assets/bfl-emblem-transparent.png" 
                  alt="BFL Fitness Logo" 
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(220,38,38,0.35)]" 
                />
              </div>
              <div>
                <span className="font-extrabold text-2xl tracking-tighter font-display block leading-none">
                  <span className="text-red-600">BFL</span> <span className="text-neutral-900">FITNESS</span>
                </span>
                <span className="text-[10px] tracking-widest text-neutral-500 uppercase font-bold">
                  Brothers For Life &bull; Stronger Together
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-neutral-600">
              {cmsContent.footerDescription || 'Science-rooted online fitness coaching, bespoke hypertrophy programming, and precision metabolic nutrition designed for permanent physical transformation.'}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a href="#instagram" className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-red-600 hover:border-red-300 transition-colors">
                <Instagram className="w-4 h-4 text-red-600" />
              </a>
              <a href="#youtube" className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-red-600 hover:border-red-300 transition-colors">
                <Youtube className="w-4 h-4 text-red-600" />
              </a>
              <a href={`mailto:${cmsContent.contactEmail || 'coaching@bflfitness.com'}`} className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-red-600 hover:border-red-300 transition-colors">
                <Mail className="w-4 h-4 text-red-600" />
              </a>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="text-neutral-900 font-bold text-sm tracking-wider uppercase mb-4">Portals & Navigation</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => onNavigate('marketing')} className="hover:text-red-600 transition-colors cursor-pointer">
                  Public Website & Methodologies
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('client_portal')} className="hover:text-red-600 transition-colors cursor-pointer">
                  Client Coaching Portal
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('coach_portal')} className="hover:text-red-600 transition-colors cursor-pointer">
                  Coach Dashboard & Program Builder
                </button>
              </li>
              <li>
                <a href="#about" className="hover:text-red-600 transition-colors">
                  About Founders & Coaches
                </a>
              </li>
              <li>
                <a href="#plans" className="hover:text-red-600 transition-colors">
                  Coaching Tiers & Pricing
                </a>
              </li>
              <li>
                <a href="#results" className="hover:text-red-600 transition-colors">
                  Client Before & After Gallery
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Direct Contact */}
          <div>
            <h4 className="text-neutral-900 font-bold text-sm tracking-wider uppercase mb-4">Direct Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-red-600 shrink-0" />
                <span className="text-neutral-700">{cmsContent.contactEmail || 'coaching@bflfitness.com'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-red-600 shrink-0" />
                <span className="text-neutral-700">{cmsContent.supportPhone || '+1 (800) 555-BFL-FIT'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                <span className="text-neutral-700">{cmsContent.locationAddress || 'Headquarters: Austin, TX / Global Remote'}</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Safety & Evidence */}
          <div>
            <h4 className="text-neutral-900 font-bold text-sm tracking-wider uppercase mb-4">100% Evidence Based</h4>
            <p className="text-xs leading-relaxed text-neutral-600 mb-3">
              Every workout, macro ratio, and recovery protocol is built upon peer-reviewed exercise physiology and sports nutrition research.
            </p>
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-red-600 shrink-0" />
              <div className="text-xs text-neutral-600">
                <span className="font-bold text-neutral-900 block">{cmsContent.certificationTitle || 'NSCA & CISSN Certified'}</span>
                {cmsContent.certificationDescription || 'Compliant with ACSM health screening standards.'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>&copy; {new Date().getFullYear()} BFL Fitness LLC. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-neutral-900 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-neutral-900 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-neutral-900 cursor-pointer transition-colors">Medical Disclaimer</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
