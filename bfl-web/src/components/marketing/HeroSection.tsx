import React, { useState, useRef } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Flame, 
  Award, 
  Users, 
  TrendingUp, 
  Sparkles, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Film 
} from 'lucide-react';
import { useFitnessData } from '../../context/FitnessDataContext';

interface HeroSectionProps {
  onApply: (planId?: string) => void;
  onExplorePlans: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onApply, onExplorePlans }) => {
  const { cmsContent } = useFitnessData();

  // Founder Video States
  const [massMuted, setMassMuted] = useState<boolean>(true);
  const [pouyaMuted, setPouyaMuted] = useState<boolean>(true);
  const [massPlaying, setMassPlaying] = useState<boolean>(true);
  const [pouyaPlaying, setPouyaPlaying] = useState<boolean>(true);

  const massVideoRef = useRef<HTMLVideoElement | null>(null);
  const pouyaVideoRef = useRef<HTMLVideoElement | null>(null);

  const toggleMassPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (massVideoRef.current) {
      if (massPlaying) {
        massVideoRef.current.pause();
        setMassPlaying(false);
      } else {
        massVideoRef.current.play();
        setMassPlaying(true);
      }
    }
  };

  const toggleMassMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (massVideoRef.current) {
      massVideoRef.current.muted = !massMuted;
      setMassMuted(!massMuted);
    }
  };

  const togglePouyaPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pouyaVideoRef.current) {
      if (pouyaPlaying) {
        pouyaVideoRef.current.pause();
        setPouyaPlaying(false);
      } else {
        pouyaVideoRef.current.play();
        setPouyaPlaying(true);
      }
    }
  };

  const togglePouyaMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pouyaVideoRef.current) {
      pouyaVideoRef.current.muted = !pouyaMuted;
      setPouyaMuted(!pouyaMuted);
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-neutral-50 to-white pt-12 pb-24 border-b border-neutral-200">
      {/* Background athletic red glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-red-600/5 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute -top-10 right-0 w-[300px] h-[300px] bg-red-700/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Urgent Announcement Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold tracking-wide shadow-sm">
            <Flame className="w-3.5 h-3.5 text-red-600 animate-bounce" />
            <span>{cmsContent.bannerNotice}</span>
          </div>
        </div>

        {/* Hero Title & High-Conversion Copy */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-neutral-900 leading-[1.08] font-display uppercase">
            {(cmsContent.heroHeadline || '').includes('.') ? (
              cmsContent.heroHeadline.split('.').map((chunk, i) => {
                const trimmed = chunk.trim();
                if (!trimmed) return null;
                return (
                  <span key={i} className={i % 2 === 1 ? 'text-red-600 block' : 'block'}>
                    {trimmed}.
                  </span>
                );
              })
            ) : (
              <span>{cmsContent.heroHeadline}</span>
            )}
          </h1>

          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed font-normal">
            {cmsContent.heroSubheadline}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onApply('plan_online_monthly')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-base tracking-wide uppercase shadow-md shadow-red-200 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer border border-red-500/40"
            >
              <span>Apply for 1-on-1 Coaching</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={onExplorePlans}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-bold text-base tracking-wide shadow-xs transition-all cursor-pointer"
            >
              Explore Coaching Plans
            </button>
          </div>

          {/* Trust points */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-600 font-medium">
            {(cmsContent.heroTrustPoints || [
              'Bespoke Macro Programming',
              'Weekly Video Lift Audits',
              'In-App Progressive Overload'
            ]).map((pt, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-red-600" />
                <span>{pt}</span>
              </span>
            ))}
          </div>
        </div>

        {/* FOUNDER ACTION VIDEO & PHOTO SHOWCASE */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider shadow-sm mb-2">
              <Film className="w-3.5 h-3.5 text-red-500" /> Live Founder Footage & Coaching Standards
            </div>
            <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">
              Coached directly by Australian bodybuilding & competitive combat founders
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mass Narimanian Showcase Card */}
            <div className="relative rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-xl group hover:border-red-600/50 transition-all">
              <div className="relative aspect-[16/10] sm:aspect-[16/11] bg-neutral-900 overflow-hidden">
                <video
                  ref={massVideoRef}
                  src="/assets/founders/videos/mass-training-1.mp4"
                  poster="/assets/founders/mass-gym.jpg"
                  autoPlay
                  loop
                  muted={massMuted}
                  playsInline
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-black/20 pointer-events-none" />

                {/* Video controls overlay */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                  <button
                    type="button"
                    onClick={toggleMassPlay}
                    className="p-2 rounded-xl bg-black/60 hover:bg-red-600 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/10"
                    title={massPlaying ? 'Pause Video' : 'Play Video'}
                  >
                    {massPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleMassMute}
                    className="p-2 rounded-xl bg-black/60 hover:bg-red-600 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/10"
                    title={massMuted ? 'Unmute Audio' : 'Mute Audio'}
                  >
                    {massMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Founder Badge */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-red-600/90 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-md border border-red-400/40">
                    IFBB Competitor
                  </span>
                </div>
              </div>

              {/* Card Meta */}
              <div className="p-6 bg-neutral-950 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black font-display uppercase tracking-tight text-white flex items-center gap-2">
                      <span>Mass Narimanian</span>
                      <ShieldCheck className="w-4 h-4 text-red-500" />
                    </h3>
                    <p className="text-xs text-neutral-400 font-semibold">Founder & Head Coach • 15+ Yrs Stage Posing & Hypertrophy</p>
                  </div>
                  <a
                    href="#coach"
                    className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 uppercase tracking-wider"
                  >
                    <span>Profile</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Specializing in maximum muscular hypertrophy, stage biomechanics, and contest-ready conditioning protocols.
                </p>
              </div>
            </div>

            {/* Pouya Marghzari Showcase Card */}
            <div className="relative rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-xl group hover:border-red-600/50 transition-all">
              <div className="relative aspect-[16/10] sm:aspect-[16/11] bg-neutral-900 overflow-hidden">
                <video
                  ref={pouyaVideoRef}
                  src="/assets/founders/videos/pouya-training.mp4"
                  poster="/assets/founders/pouya-boxing.jpg"
                  autoPlay
                  loop
                  muted={pouyaMuted}
                  playsInline
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-black/20 pointer-events-none" />

                {/* Video controls overlay */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                  <button
                    type="button"
                    onClick={togglePouyaPlay}
                    className="p-2 rounded-xl bg-black/60 hover:bg-red-600 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/10"
                    title={pouyaPlaying ? 'Pause Video' : 'Play Video'}
                  >
                    {pouyaPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={togglePouyaMute}
                    className="p-2 rounded-xl bg-black/60 hover:bg-red-600 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/10"
                    title={pouyaMuted ? 'Unmute Audio' : 'Mute Audio'}
                  >
                    {pouyaMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Founder Badge */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-red-600/90 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-md border border-red-400/40">
                    Competitive Boxer & Powerlifter
                  </span>
                </div>
              </div>

              {/* Card Meta */}
              <div className="p-6 bg-neutral-950 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black font-display uppercase tracking-tight text-white flex items-center gap-2">
                      <span>Pouya Marghzari</span>
                      <ShieldCheck className="w-4 h-4 text-red-500" />
                    </h3>
                    <p className="text-xs text-neutral-400 font-semibold">Founder & Head Coach • 10+ Yrs Combat Conditioning & Strength</p>
                  </div>
                  <a
                    href="#coach"
                    className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 uppercase tracking-wider"
                  >
                    <span>Profile</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Specializing in explosive rotational power, kinetic chain speed, and maximal barbell powerlifting overload.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {(cmsContent.heroStats || [
            { count: '500+', label: 'Transformations Completed' },
            { count: '98.4%', label: 'Goal Adherence Rate' },
            { count: '12+ Yrs', label: 'Evidence-Based Coaching' },
            { count: '100%', label: 'Personalized Plans' }
          ]).map((stat, i) => {
            const icons = [Users, TrendingUp, Award, Sparkles];
            const Icon = icons[i % icons.length];
            return (
              <div key={i} className="bg-white border border-neutral-200 rounded-2xl p-6 text-center shadow-xs hover:border-neutral-300 transition-colors">
                <Icon className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <div className="text-3xl font-black text-neutral-900 font-display">{stat.count}</div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
