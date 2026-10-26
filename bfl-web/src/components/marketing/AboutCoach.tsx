import React, { useState, useRef, useEffect } from 'react';
import { 
  Award, 
  CheckCircle2, 
  ShieldCheck, 
  Dumbbell, 
  Zap, 
  BookOpen, 
  HeartPulse, 
  ArrowRight, 
  Flame, 
  Crosshair, 
  Sparkles,
  Camera,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Film,
  X
} from 'lucide-react';
import { useFitnessData } from '../../context/FitnessDataContext';
import massStageImg from '../../assets/founders/mass-stage.png';
import massGymImg from '../../assets/founders/mass-gym.jpg';
import pouyaPowerliftingImg from '../../assets/founders/pouya-powerlifting.jpg';
import pouyaBoxingImg from '../../assets/founders/pouya-boxing.jpg';
import pouyaPhysiqueImg from '../../assets/founders/pouya-physique.jpg';

export interface AboutCoachProps {
  onExplorePlans?: () => void;
  onApply?: () => void;
  massImage1?: string;
  massImage2?: string;
  pouyaImage1?: string;
  pouyaImage2?: string;
}

export type FounderMediaType = 'image' | 'video';

export interface FounderMediaItem {
  id: string;
  type: FounderMediaType;
  label: string;
  badgeLabel: string;
  subtitle: string;
  src: string;
  altSrc?: string;
  poster?: string;
  fallback?: string;
  objectPosition?: string;
  description?: string;
  founderName: string;
  founderRole: string;
}

export interface FounderActionReel {
  id: string;
  founderName: string;
  founderRole: string;
  specialtyBadge: string;
  title: string;
  description: string;
  videoSrc: string;
  altVideoSrc?: string;
  poster?: string;
  coachKey: 'mass' | 'pouya';
  focusPillars: string[];
}

export const AboutCoach: React.FC<AboutCoachProps> = ({
  onExplorePlans,
  onApply,
  massImage1,
  massImage2,
  pouyaImage1,
  pouyaImage2
}) => {
  const { cmsContent } = useFitnessData();

  // Media tab toggle states (index within founder's media array)
  const [massMediaIdx, setMassMediaIdx] = useState<number>(0);
  const [pouyaMediaIdx, setPouyaMediaIdx] = useState<number>(0);

  // Audio mute toggles for card videos
  const [massVideoMuted, setMassVideoMuted] = useState<boolean>(true);
  const [pouyaVideoMuted, setPouyaVideoMuted] = useState<boolean>(true);

  // Video play/pause states for card videos
  const [massVideoPlaying, setMassVideoPlaying] = useState<boolean>(true);
  const [pouyaVideoPlaying, setPouyaVideoPlaying] = useState<boolean>(true);

  // Video refs for card players
  const massVideoRef = useRef<HTMLVideoElement | null>(null);
  const pouyaVideoRef = useRef<HTMLVideoElement | null>(null);

  // Fallback states for images
  const [massImgError, setMassImgError] = useState<Record<number, boolean>>({});
  const [pouyaImgError, setPouyaImgError] = useState<Record<number, boolean>>({});

  // Cinema modal state
  const [cinemaModalVideo, setCinemaModalVideo] = useState<{
    title: string;
    coachName: string;
    subtitle: string;
    src: string;
    altSrc?: string;
    badge: string;
    description?: string;
    coachKey: 'mass' | 'pouya';
  } | null>(null);

  const cinemaVideoRef = useRef<HTMLVideoElement | null>(null);
  const [cinemaModalMuted, setCinemaModalMuted] = useState<boolean>(false);
  const [cinemaModalPlaying, setCinemaModalPlaying] = useState<boolean>(true);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCinemaModalVideo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleScrollToPlans = () => {
    if (onExplorePlans) {
      onExplorePlans();
    } else {
      const el = document.getElementById('plans');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleApplyClick = () => {
    if (onApply) {
      onApply();
    } else {
      handleScrollToPlans();
    }
  };

  // Mass Narimanian Media Configurations (Photos + Live Videos)
  const massMediaItems: FounderMediaItem[] = [
    {
      id: 'mass-photo-1',
      type: 'image',
      label: 'Stage Posing',
      badgeLabel: cmsContent.massFounder?.badge || '15+ Years Elite Experience',
      subtitle: 'Australian Posing School • Stage Posing #33',
      src: massImage1 || massStageImg || '/assets/founders/mass-stage.png',
      objectPosition: 'object-[center_20%]',
      fallback: '/assets/founders/mass-stage.png',
      founderName: cmsContent.massFounder?.title || 'Mass Narimanian',
      founderRole: 'Founder & Coach'
    },
    {
      id: 'mass-photo-2',
      type: 'image',
      label: 'Gym Hypertrophy',
      badgeLabel: 'Peak Hypertrophy & Muscularity',
      subtitle: 'Peak Hypertrophy & Muscularity',
      src: massImage2 || massGymImg || '/assets/founders/mass-gym.jpg',
      objectPosition: 'object-top',
      fallback: '/assets/founders/mass-gym.jpg',
      founderName: cmsContent.massFounder?.title || 'Mass Narimanian',
      founderRole: 'Founder & Coach'
    },
    {
      id: 'mass-video-1',
      type: 'video',
      label: 'Prep Reel',
      badgeLabel: 'Live Gym Footage • Hypertrophy',
      subtitle: 'Hypertrophy & Elite Stage Conditioning Reel',
      src: '/assets/founders/videos/6565 (1).mp4',
      altSrc: '/assets/founders/videos/mass-training-1.mp4',
      poster: massStageImg || '/assets/founders/mass-stage.png',
      objectPosition: 'object-center',
      founderName: cmsContent.massFounder?.title || 'Mass Narimanian',
      founderRole: 'Founder & Coach',
      description: 'Biomechanically calibrated training stimulus and competition-ready muscular conditioning in live action.'
    },
    {
      id: 'mass-video-2',
      type: 'video',
      label: 'Symmetry Reel',
      badgeLabel: 'Stage Execution • Muscularity',
      subtitle: 'Competition Symmetry & Stage Presentation',
      src: '/assets/founders/videos/6564.mp4',
      altSrc: '/assets/founders/videos/mass-training-2.mp4',
      poster: massGymImg || '/assets/founders/mass-gym.jpg',
      objectPosition: 'object-center',
      founderName: cmsContent.massFounder?.title || 'Mass Narimanian',
      founderRole: 'Founder & Coach',
      description: 'Precision muscular control, lat spread execution, and championship-standard stage conditioning.'
    }
  ];

  // Pouya Marghzari Media Configurations (Photos + Live Videos)
  const pouyaMediaItems: FounderMediaItem[] = [
    {
      id: 'pouya-photo-1',
      type: 'image',
      label: 'Raw Strength',
      badgeLabel: cmsContent.pouyaFounder?.badge || '10+ Years Competitive Boxing & Powerlifting',
      subtitle: 'Barbell Deadlift Mechanics & Raw Strength',
      src: pouyaImage1 || pouyaPowerliftingImg || '/assets/founders/pouya-powerlifting.jpg',
      objectPosition: 'object-top',
      fallback: '/assets/founders/pouya-powerlifting.jpg',
      founderName: cmsContent.pouyaFounder?.title || 'Pouya Marghzari',
      founderRole: 'Founder & Coach'
    },
    {
      id: 'pouya-photo-2',
      type: 'image',
      label: 'Boxing & Speed',
      badgeLabel: 'Rotational Power & Speed',
      subtitle: 'Competitive Boxing & High-Performance Conditioning',
      src: pouyaImage2 || pouyaBoxingImg || '/assets/founders/pouya-boxing.jpg',
      objectPosition: 'object-top',
      fallback: '/assets/founders/pouya-boxing.jpg',
      founderName: cmsContent.pouyaFounder?.title || 'Pouya Marghzari',
      founderRole: 'Founder & Coach'
    },
    {
      id: 'pouya-photo-3',
      type: 'image',
      label: 'Physique & Form',
      badgeLabel: 'Peak Conditioning Standard',
      subtitle: 'Lean Muscularity & Combat Conditioning Standard',
      src: '/assets/founders/6695.jpg',
      altSrc: pouyaPhysiqueImg || '/assets/founders/pouya-portrait.jpg',
      objectPosition: 'object-top',
      fallback: '/assets/founders/pouya-portrait.jpg',
      founderName: cmsContent.pouyaFounder?.title || 'Pouya Marghzari',
      founderRole: 'Founder & Coach'
    },
    {
      id: 'pouya-video-1',
      type: 'video',
      label: 'Boxing Reel',
      badgeLabel: 'Live Training • Explosive Striking',
      subtitle: 'Explosive Boxing Speed & Kinetic Transfer',
      src: '/assets/founders/videos/6551 (1).mp4',
      altSrc: '/assets/founders/videos/pouya-training.mp4',
      poster: pouyaBoxingImg || '/assets/founders/pouya-boxing.jpg',
      objectPosition: 'object-center',
      founderName: cmsContent.pouyaFounder?.title || 'Pouya Marghzari',
      founderRole: 'Founder & Coach',
      description: 'High-velocity striking combinations, kinetic chain rotational power, and explosive athletic endurance.'
    },
    {
      id: 'pouya-video-2',
      type: 'video',
      label: 'Power Drills',
      badgeLabel: 'Live Combat Drills • Speed',
      subtitle: 'Punch Sequencing & Dynamic Padwork Drills',
      src: '/assets/founders/videos/6694.mp4',
      altSrc: '/assets/founders/videos/pouya-training-2.mp4',
      poster: '/assets/founders/6695.jpg',
      objectPosition: 'object-center',
      founderName: cmsContent.pouyaFounder?.title || 'Pouya Marghzari',
      founderRole: 'Founder & Coach',
      description: 'Rapid combination punch mechanics, reactive head movement, and high-cadence anaerobic output.'
    }
  ];

  const currentMassMedia = massMediaItems[massMediaIdx];
  const massDisplaySrc = massImgError[massMediaIdx] ? (currentMassMedia.fallback || currentMassMedia.src) : currentMassMedia.src;

  const currentPouyaMedia = pouyaMediaItems[pouyaMediaIdx];
  const pouyaDisplaySrc = pouyaImgError[pouyaMediaIdx] ? (currentPouyaMedia.fallback || currentPouyaMedia.src) : currentPouyaMedia.src;

  // Dedicated "Founders In Action" Video Reel Showcase Cards (2 Pouya & 2 Mass)
  const actionReels: FounderActionReel[] = [
    {
      id: 'pouya-striking-reel',
      founderName: cmsContent.pouyaFounder?.title || 'Pouya Marghzari',
      founderRole: 'Founder & Coach',
      specialtyBadge: 'Boxing & Power Athletics',
      title: 'Kinetic Punch Mechanics & Explosive Speed',
      description: 'Pouya demonstrates high-velocity hand combinations, rapid rotational force transfer, and combat-grade cardiovascular endurance.',
      videoSrc: '/assets/founders/videos/6551 (1).mp4',
      altVideoSrc: '/assets/founders/videos/pouya-training.mp4',
      poster: pouyaBoxingImg || '/assets/founders/pouya-boxing.jpg',
      coachKey: 'pouya',
      focusPillars: ['Rotational Force', 'Kinetic Deceleration', 'Speed Endurance']
    },
    {
      id: 'pouya-drills-reel',
      founderName: cmsContent.pouyaFounder?.title || 'Pouya Marghzari',
      founderRole: 'Founder & Coach',
      specialtyBadge: 'Power & Combat Drills',
      title: 'Dynamic Punch Sequencing & Hand Speed',
      description: 'Live combat training showcasing aggressive punch tempo, core rotational torque, and peak anaerobic capacity.',
      videoSrc: '/assets/founders/videos/6694.mp4',
      altVideoSrc: '/assets/founders/videos/pouya-training-2.mp4',
      poster: '/assets/founders/6695.jpg',
      coachKey: 'pouya',
      focusPillars: ['Hand Speed', 'Anaerobic Output', 'Footwork Mechanics']
    },
    {
      id: 'mass-hypertrophy-reel',
      founderName: cmsContent.massFounder?.title || 'Mass Narimanian',
      founderRole: 'Founder & Coach',
      specialtyBadge: 'Hypertrophy & Peaking',
      title: 'Mechanical Tension & Stage Conditioning',
      description: 'Mass executes strict biomechanical form, maximizing the stimulus-to-fatigue ratio and showcasing contest-ready muscular conditioning.',
      videoSrc: '/assets/founders/videos/6565 (1).mp4',
      altVideoSrc: '/assets/founders/videos/mass-training-1.mp4',
      poster: massStageImg || '/assets/founders/mass-stage.png',
      coachKey: 'mass',
      focusPillars: ['Hypertrophy Stimulus', 'Water Manipulation', 'Muscle Density']
    },
    {
      id: 'mass-symmetry-reel',
      founderName: cmsContent.massFounder?.title || 'Mass Narimanian',
      founderRole: 'Founder & Coach',
      specialtyBadge: 'Stage Symmetry & Presentation',
      title: 'Championship Posing & Lat Flare Mastery',
      description: 'Precision muscular engagement, isometric lat flares, and the classical stage presentation standard built from 15+ years of bodybuilding.',
      videoSrc: '/assets/founders/videos/6564.mp4',
      altVideoSrc: '/assets/founders/videos/mass-training-2.mp4',
      poster: massGymImg || '/assets/founders/mass-gym.jpg',
      coachKey: 'mass',
      focusPillars: ['Isometric Posing', 'Symmetry & V-Taper', 'Stage Presence']
    }
  ];

  // Helper to toggle video play/pause
  const toggleVideoPlayback = (
    videoRef: React.RefObject<HTMLVideoElement | null>,
    isPlaying: boolean,
    setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Helper to toggle audio mute
  const toggleVideoMute = (
    videoRef: React.RefObject<HTMLVideoElement | null>,
    isMuted: boolean,
    setIsMuted: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <section 
      id="about" 
      className="py-24 bg-neutral-950 text-white border-b border-neutral-800 relative overflow-hidden"
    >
      {/* Background radial glow accents for depth */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/10 border border-red-500/30 text-red-500 text-xs font-black uppercase tracking-widest shadow-xs">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span>Meet The Founders</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase font-display tracking-tight text-white">
            {cmsContent.foundersHeadline || 'Built by Athletes. Engineered for Results.'}
          </h2>

          <p className="text-base sm:text-lg text-neutral-400 leading-relaxed max-w-2xl mx-auto">
            {cmsContent.foundersSubheadline || 'BFL Fitness was founded on a singular standard: elite, stage-proven experience translated into scientifically calibrated biomechanical programming and metabolic precision.'}
          </p>
        </div>

        {/* Dual-Bio Alternating Zig-Zag Layout */}
        <div className="space-y-20 lg:space-y-28">

          {/* ========================================================================= */}
          {/* BIO 1: Mass Narimanian (Desktop: Image/Video Left, Text Right) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Mass Visual Media Block */}
            <div className="lg:col-span-5 space-y-3">
              <div className="relative group">
                {/* Thin red accent border and ambient shadow */}
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-red-600/40 bg-neutral-900 shadow-2xl shadow-black/80">
                  
                  {currentMassMedia.type === 'image' ? (
                    <img
                      src={massDisplaySrc}
                      alt={`${currentMassMedia.founderName} - ${currentMassMedia.label}`}
                      onError={() => {
                        setMassImgError(prev => ({ ...prev, [massMediaIdx]: true }));
                      }}
                      className={`w-full h-[420px] sm:h-[490px] lg:h-[530px] object-cover ${currentMassMedia.objectPosition || 'object-center'} transition-transform duration-700 group-hover:scale-105`}
                    />
                  ) : (
                    <div className="relative w-full h-[420px] sm:h-[490px] lg:h-[530px] bg-black flex items-center justify-center overflow-hidden">
                      <video
                        ref={massVideoRef}
                        src={currentMassMedia.src}
                        poster={currentMassMedia.poster}
                        autoPlay
                        loop
                        muted={massVideoMuted}
                        playsInline
                        className="w-full h-full object-cover"
                        onPlay={() => setMassVideoPlaying(true)}
                        onPause={() => setMassVideoPlaying(false)}
                      >
                        {currentMassMedia.altSrc && (
                          <source src={currentMassMedia.altSrc} type="video/mp4" />
                        )}
                        <source src={currentMassMedia.src} type="video/mp4" />
                      </video>

                      {/* Video Quick Controls Floating Bar */}
                      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                        {/* Audio Mute/Unmute Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVideoMute(massVideoRef, massVideoMuted, setMassVideoMuted);
                          }}
                          className="p-2 rounded-xl bg-neutral-950/80 hover:bg-neutral-900 text-neutral-200 border border-neutral-700/80 backdrop-blur-md transition-all shadow-md cursor-pointer"
                          title={massVideoMuted ? 'Unmute Audio' : 'Mute Audio'}
                        >
                          {massVideoMuted ? (
                            <VolumeX className="w-4 h-4 text-neutral-300" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-red-500 animate-pulse" />
                          )}
                        </button>

                        {/* Expand to Cinema Modal */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCinemaModalVideo({
                              title: currentMassMedia.subtitle,
                              coachName: currentMassMedia.founderName,
                              subtitle: currentMassMedia.subtitle,
                              src: currentMassMedia.src,
                              altSrc: currentMassMedia.altSrc,
                              badge: currentMassMedia.badgeLabel,
                              description: currentMassMedia.description,
                              coachKey: 'mass'
                            });
                          }}
                          className="p-2 rounded-xl bg-neutral-950/80 hover:bg-neutral-900 text-neutral-200 border border-neutral-700/80 backdrop-blur-md transition-all shadow-md cursor-pointer"
                          title="Open HD Video Player"
                        >
                          <Maximize2 className="w-4 h-4 text-neutral-300 hover:text-white" />
                        </button>
                      </div>

                      {/* Centered Big Play/Pause overlay button when paused */}
                      {!massVideoPlaying && (
                        <button
                          onClick={() => toggleVideoPlayback(massVideoRef, massVideoPlaying, setMassVideoPlaying)}
                          className="absolute inset-0 z-15 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity cursor-pointer group/btn"
                        >
                          <div className="w-16 h-16 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl shadow-red-950/60 group-hover/btn:scale-110 transition-transform">
                            <Play className="w-8 h-8 ml-1 fill-white" />
                          </div>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Subtle dark gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent pointer-events-none" />

                  {/* Top Badge overlay */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="px-3 py-1 bg-neutral-950/85 backdrop-blur-md text-neutral-200 border border-neutral-800 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                      {currentMassMedia.type === 'video' ? (
                        <>
                          <Film className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                          <span>{currentMassMedia.badgeLabel}</span>
                        </>
                      ) : (
                        <>
                          <Flame className="w-3.5 h-3.5 text-red-500" />
                          <span>{currentMassMedia.badgeLabel}</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Bottom Image/Video Overlay Details */}
                  <div className="absolute bottom-5 left-5 right-5 z-10 space-y-1 pointer-events-none">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-widest rounded shadow-sm">
                        {currentMassMedia.type === 'video' ? 'Live Video Reel' : 'Founder & Coach'}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight font-display">
                      {currentMassMedia.founderName}
                    </h3>
                    <p className="text-xs text-neutral-300 font-medium">
                      {currentMassMedia.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Media Switcher Bar (Photos & Videos) */}
              <div className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-red-500" />
                    <span>Media Showcase ({massMediaItems.length})</span>
                  </span>
                  <span className="text-[10px] text-neutral-500 font-medium">
                    Tap to view footage & photos
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {massMediaItems.map((item, idx) => {
                    const isSelected = massMediaIdx === idx;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setMassMediaIdx(idx);
                          if (item.type === 'video') {
                            setMassVideoPlaying(true);
                          }
                        }}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-md shadow-red-900/40 border border-red-500/50'
                            : 'bg-neutral-800/80 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-transparent'
                        }`}
                      >
                        {item.type === 'video' ? (
                          <Film className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-red-400'}`} />
                        ) : (
                          <Camera className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-neutral-400'}`} />
                        )}
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mass Content Block */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/40 border border-red-600/30 text-red-400 text-xs font-bold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5 text-red-500" />
                <span>Founder & Coach</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase font-display tracking-tight">
                  {cmsContent.massFounder?.title || 'Mass Narimanian'}
                </h3>
                <p className="text-sm sm:text-base font-bold text-red-500 uppercase tracking-wider">
                  {cmsContent.massFounder?.subtitle || 'Founder & Coach • Hypertrophy & Stage Conditioning Specialist'}
                </p>
              </div>

              {/* DYNAMIC CMS FOUNDER COPY */}
              <div className="relative pl-5 border-l-2 border-red-600">
                <p className="text-base sm:text-lg text-neutral-200 leading-relaxed font-normal">
                  "{cmsContent.massFounder?.quote || 'With over 15 years of elite experience in the bodybuilding industry, Mass brings unparalleled expertise in muscle hypertrophy, stage conditioning, and elite body transformation. His hands-on experience on the stage translates to scientifically proven, results-driven programming for his clients.'}"
                </p>
              </div>

              {/* Core Pillars / Specialties */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {(cmsContent.massFounder?.pillars || [
                  { title: 'Muscle Hypertrophy', desc: 'Biomechanically optimized stimulus-to-fatigue programming.' },
                  { title: 'Stage Conditioning', desc: 'Peaking protocols, water manipulation & competition readiness.' },
                  { title: 'Body Transformation', desc: 'Proven physique rebuilding for athletes and executive clients.' }
                ]).map((pillar, pIdx) => {
                  const icons = [Crosshair, Flame, ShieldCheck];
                  const Icon = icons[pIdx % icons.length];
                  return (
                    <div key={pIdx} className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                      <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 font-bold text-xs mb-2">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-white tracking-wider">{pillar.title}</h4>
                      <p className="text-[11px] text-neutral-400">{pillar.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons with Video Quick Watch */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleApplyClick}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-red-900/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                >
                  <span>Train with Mass</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    // Activate first video tab
                    setMassMediaIdx(2);
                    setMassVideoPlaying(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-600/40 font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Watch Training Video</span>
                </button>

                <button
                  onClick={handleScrollToPlans}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                >
                  <span>View Programs</span>
                </button>
              </div>
            </div>
          </div>


          {/* ========================================================================= */}
          {/* BIO 2: Pouya Marghzari (Desktop: Text Left, Image/Video Right) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Pouya Content Block (On desktop renders first on left via order-2 lg:order-1) */}
            <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/40 border border-red-600/30 text-red-400 text-xs font-bold uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-red-500" />
                <span>Founder & Coach</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase font-display tracking-tight">
                  {cmsContent.pouyaFounder?.title || 'Pouya Marghzari'}
                </h3>
                <p className="text-sm sm:text-base font-bold text-red-500 uppercase tracking-wider">
                  {cmsContent.pouyaFounder?.subtitle || 'Founder & Coach • Boxing & Powerlifting Specialist'}
                </p>
              </div>

              {/* DYNAMIC CMS FOUNDER COPY */}
              <div className="relative pl-5 border-l-2 border-red-600">
                <p className="text-base sm:text-lg text-neutral-200 leading-relaxed font-normal">
                  "{cmsContent.pouyaFounder?.quote || 'Bringing over 10 years of competitive experience in boxing and powerlifting, Pouya specializes in explosive power, raw strength mechanics, and high-performance athletic conditioning. His diverse competitive background provides clients with a unique, highly effective approach to achieving peak physical fitness.'}"
                </p>
              </div>

              {/* Core Pillars / Specialties */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {(cmsContent.pouyaFounder?.pillars || [
                  { title: 'Explosive Power', desc: 'Rotational force production & rapid rate of force development.' },
                  { title: 'Raw Strength Mechanics', desc: 'Powerlifting barbell technique, bracing & joint-friendly loading.' },
                  { title: 'Athletic Conditioning', desc: 'High-capacity energy systems for boxers, fighters & power athletes.' }
                ]).map((pillar, pIdx) => {
                  const icons = [Zap, Dumbbell, HeartPulse];
                  const Icon = icons[pIdx % icons.length];
                  return (
                    <div key={pIdx} className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                      <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 font-bold text-xs mb-2">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-white tracking-wider">{pillar.title}</h4>
                      <p className="text-[11px] text-neutral-400">{pillar.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons with Video Quick Watch */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleApplyClick}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-red-900/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                >
                  <span>Train with Pouya</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    // Activate video tab
                    setPouyaMediaIdx(3);
                    setPouyaVideoPlaying(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-600/40 font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Watch Boxing Reel</span>
                </button>

                <button
                  onClick={handleScrollToPlans}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                >
                  <span>View Programs</span>
                </button>
              </div>
            </div>

            {/* Pouya Visual Media Block (On desktop renders second on right via order-1 lg:order-2) */}
            <div className="lg:col-span-5 space-y-3 order-1 lg:order-2">
              <div className="relative group">
                {/* Thin red accent border and ambient shadow */}
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-red-600/40 bg-neutral-900 shadow-2xl shadow-black/80">
                  
                  {currentPouyaMedia.type === 'image' ? (
                    <img
                      src={pouyaDisplaySrc}
                      alt={`${currentPouyaMedia.founderName} - ${currentPouyaMedia.label}`}
                      onError={() => {
                        setPouyaImgError(prev => ({ ...prev, [pouyaMediaIdx]: true }));
                      }}
                      className={`w-full h-[420px] sm:h-[490px] lg:h-[530px] object-cover ${currentPouyaMedia.objectPosition || 'object-center'} transition-transform duration-700 group-hover:scale-105`}
                    />
                  ) : (
                    <div className="relative w-full h-[420px] sm:h-[490px] lg:h-[530px] bg-black flex items-center justify-center overflow-hidden">
                      <video
                        ref={pouyaVideoRef}
                        src={currentPouyaMedia.src}
                        poster={currentPouyaMedia.poster}
                        autoPlay
                        loop
                        muted={pouyaVideoMuted}
                        playsInline
                        className="w-full h-full object-cover"
                        onPlay={() => setPouyaVideoPlaying(true)}
                        onPause={() => setPouyaVideoPlaying(false)}
                      >
                        {currentPouyaMedia.altSrc && (
                          <source src={currentPouyaMedia.altSrc} type="video/mp4" />
                        )}
                        <source src={currentPouyaMedia.src} type="video/mp4" />
                      </video>

                      {/* Video Quick Controls Floating Bar */}
                      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                        {/* Audio Mute/Unmute Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVideoMute(pouyaVideoRef, pouyaVideoMuted, setPouyaVideoMuted);
                          }}
                          className="p-2 rounded-xl bg-neutral-950/80 hover:bg-neutral-900 text-neutral-200 border border-neutral-700/80 backdrop-blur-md transition-all shadow-md cursor-pointer"
                          title={pouyaVideoMuted ? 'Unmute Audio' : 'Mute Audio'}
                        >
                          {pouyaVideoMuted ? (
                            <VolumeX className="w-4 h-4 text-neutral-300" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-red-500 animate-pulse" />
                          )}
                        </button>

                        {/* Expand to Cinema Modal */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCinemaModalVideo({
                              title: currentPouyaMedia.subtitle,
                              coachName: currentPouyaMedia.founderName,
                              subtitle: currentPouyaMedia.subtitle,
                              src: currentPouyaMedia.src,
                              altSrc: currentPouyaMedia.altSrc,
                              badge: currentPouyaMedia.badgeLabel,
                              description: currentPouyaMedia.description,
                              coachKey: 'pouya'
                            });
                          }}
                          className="p-2 rounded-xl bg-neutral-950/80 hover:bg-neutral-900 text-neutral-200 border border-neutral-700/80 backdrop-blur-md transition-all shadow-md cursor-pointer"
                          title="Open HD Video Player"
                        >
                          <Maximize2 className="w-4 h-4 text-neutral-300 hover:text-white" />
                        </button>
                      </div>

                      {/* Centered Big Play/Pause overlay button when paused */}
                      {!pouyaVideoPlaying && (
                        <button
                          onClick={() => toggleVideoPlayback(pouyaVideoRef, pouyaVideoPlaying, setPouyaVideoPlaying)}
                          className="absolute inset-0 z-15 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity cursor-pointer group/btn"
                        >
                          <div className="w-16 h-16 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl shadow-red-950/60 group-hover/btn:scale-110 transition-transform">
                            <Play className="w-8 h-8 ml-1 fill-white" />
                          </div>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Subtle dark gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent pointer-events-none" />

                  {/* Top Badge overlay */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="px-3 py-1 bg-neutral-950/85 backdrop-blur-md text-neutral-200 border border-neutral-800 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                      {currentPouyaMedia.type === 'video' ? (
                        <>
                          <Film className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                          <span>{currentPouyaMedia.badgeLabel}</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-red-500" />
                          <span>{currentPouyaMedia.badgeLabel}</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Bottom Details */}
                  <div className="absolute bottom-5 left-5 right-5 z-10 space-y-1 pointer-events-none">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-widest rounded shadow-sm">
                        {currentPouyaMedia.type === 'video' ? 'Live Video Reel' : 'Founder & Coach'}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight font-display">
                      {currentPouyaMedia.founderName}
                    </h3>
                    <p className="text-xs text-neutral-300 font-medium">
                      {currentPouyaMedia.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Media Switcher Bar (Photos & Videos) */}
              <div className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-red-500" />
                    <span>Media Showcase ({pouyaMediaItems.length})</span>
                  </span>
                  <span className="text-[10px] text-neutral-500 font-medium">
                    Tap to view footage & photos
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
                  {pouyaMediaItems.map((item, idx) => {
                    const isSelected = pouyaMediaIdx === idx;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setPouyaMediaIdx(idx);
                          if (item.type === 'video') {
                            setPouyaVideoPlaying(true);
                          }
                        }}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-md shadow-red-900/40 border border-red-500/50'
                            : 'bg-neutral-800/80 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-transparent'
                        }`}
                      >
                        {item.type === 'video' ? (
                          <Film className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-red-400'}`} />
                        ) : (
                          <Camera className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-neutral-400'}`} />
                        )}
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

        </div>


        {/* ========================================================================= */}
        {/* CINEMATIC SECTION: FOUNDERS IN ACTION (Raw Footage Video Showcase) */}
        {/* ========================================================================= */}
        <div id="founders-videos" className="mt-28 pt-20 border-t border-neutral-800/80 relative">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/10 border border-red-500/30 text-red-500 text-xs font-black uppercase tracking-widest shadow-xs">
              <Film className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>Cinematic Training Reels</span>
            </div>

            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase font-display tracking-tight">
              Founders In Action: <span className="text-red-500">Proven On The Floor</span>
            </h3>

            <p className="text-sm sm:text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              No actors, no filters. Real training footage of Mass Narimanian and Pouya Marghzari demonstrating the raw athletic execution, muscle recruitment, and fighting conditioning behind BFL programming.
            </p>
          </div>

          {/* 4-Card Video Reel Grid (2 Pouya & 2 Mass) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {actionReels.map((reel) => {
              return (
                <div 
                  key={reel.id}
                  className="bg-neutral-900 rounded-2xl sm:rounded-3xl border border-neutral-800 overflow-hidden hover:border-red-600/60 shadow-xl shadow-black/50 transition-all duration-300 flex flex-col group"
                >
                  {/* Video Player Box */}
                  <div className="relative aspect-[4/5] sm:aspect-[9/14] md:aspect-[4/5] bg-black overflow-hidden">
                    <video
                      src={reel.videoSrc}
                      poster={reel.poster}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    >
                      {reel.altVideoSrc && (
                        <source src={reel.altVideoSrc} type="video/mp4" />
                      )}
                      <source src={reel.videoSrc} type="video/mp4" />
                    </video>

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent pointer-events-none" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                      <span className="px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-wider text-red-400 border border-red-900/50 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        {reel.specialtyBadge}
                      </span>

                      <button
                        onClick={() => {
                          setCinemaModalVideo({
                            title: reel.title,
                            coachName: reel.founderName,
                            subtitle: reel.specialtyBadge,
                            src: reel.videoSrc,
                            altSrc: reel.altVideoSrc,
                            badge: reel.specialtyBadge,
                            description: reel.description,
                            coachKey: reel.coachKey
                          });
                        }}
                        className="p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-white border border-neutral-700/80 backdrop-blur-md transition-colors cursor-pointer shadow-md"
                        title="Watch Fullscreen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Play in Cinema Trigger overlay button */}
                    <div 
                      onClick={() => {
                        setCinemaModalVideo({
                          title: reel.title,
                          coachName: reel.founderName,
                          subtitle: reel.specialtyBadge,
                          src: reel.videoSrc,
                          altSrc: reel.altVideoSrc,
                          badge: reel.specialtyBadge,
                          description: reel.description,
                          coachKey: reel.coachKey
                        });
                      }}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[1px] cursor-pointer"
                    >
                      <div className="w-14 h-14 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg shadow-red-950/80 transform group-hover:scale-110 transition-transform">
                        <Play className="w-7 h-7 ml-0.5 fill-white" />
                      </div>
                    </div>

                    {/* Bottom overlay in player */}
                    <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none">
                      <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                        {reel.founderRole}
                      </div>
                      <h4 className="text-xl font-black text-white uppercase font-display tracking-tight leading-tight">
                        {reel.founderName}
                      </h4>
                    </div>
                  </div>

                  {/* Card Description & Pillars */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h5 className="text-base font-bold text-white leading-snug">
                        {reel.title}
                      </h5>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {reel.description}
                      </p>
                    </div>

                    {/* Focus Tag Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {reel.focusPillars.map((tag, tIdx) => (
                        <span 
                          key={tIdx}
                          className="px-2 py-0.5 rounded-md bg-neutral-800 text-[10px] font-semibold text-neutral-300 border border-neutral-700/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setCinemaModalVideo({
                            title: reel.title,
                            coachName: reel.founderName,
                            subtitle: reel.specialtyBadge,
                            src: reel.videoSrc,
                            altSrc: reel.altVideoSrc,
                            badge: reel.specialtyBadge,
                            description: reel.description,
                            coachKey: reel.coachKey
                          });
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-red-900/30 transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Watch Reel</span>
                      </button>

                      <button
                        onClick={handleApplyClick}
                        className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        <span>Apply</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>


        {/* ========================================================================= */}
        {/* 4 Pillars of Coaching Architecture */}
        {/* ========================================================================= */}
        <div className="mt-24 pt-16 border-t border-neutral-800/80">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black text-white uppercase font-display tracking-tight">
              Our 4 Pillars of Coaching Architecture
            </h3>
            <p className="text-sm text-neutral-400">
              Every workout program, mechanical cue, and nutrition target is derived from these scientific cornerstones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cmsContent.trainingMethodologies.map((method, i) => {
              const icons = [Dumbbell, Zap, HeartPulse, BookOpen];
              const Icon = icons[i % icons.length];
              return (
                <div 
                  key={i} 
                  className="bg-neutral-900/90 border border-neutral-800 p-6 rounded-2xl space-y-3 hover:border-red-600/50 shadow-md transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-white uppercase font-display tracking-tight">
                    {method.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                    {method.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Call to Action (CTA) Section */}
        {/* ========================================================================= */}
        <div className="mt-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-neutral-900 to-black border border-red-600/30 p-8 sm:p-14 text-center shadow-2xl shadow-red-950/20">
            {/* Subtle top red line indicator */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent" />
            
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-neutral-950 border border-neutral-800 p-2 shadow-2xl shadow-red-950/40">
                  <img 
                    src="/assets/bfl-emblem-transparent.png" 
                    alt="BFL Fitness Emblem" 
                    className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(220,38,38,0.5)]" 
                  />
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-red-500" />
                <span>{cmsContent.founderApplicationsNotice || 'Limited Coaching Roster • Applications Open'}</span>
              </div>

              <h3 className="text-3xl sm:text-5xl font-black text-white uppercase font-display tracking-tight">
                Work Directly with <span className="text-red-500">Mass & Pouya</span>
              </h3>

              <p className="text-base sm:text-lg text-neutral-300 max-w-2xl mx-auto leading-relaxed">
                Whether you need maximum hypertrophy, elite body transformation, or explosive athletic conditioning — get custom programming calibrated specifically for your physiology.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <button
                  id="work-with-coaches-btn"
                  onClick={handleApplyClick}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-red-900/40 flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-105"
                >
                  <span>Work With Our Coaches</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  id="explore-tiers-btn"
                  onClick={handleScrollToPlans}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 font-bold text-sm uppercase tracking-wider cursor-pointer transition-colors"
                >
                  <span>Explore Coaching Tiers</span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-red-500" />
                  <span>Direct 1-on-1 Founder Oversight</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-red-500" />
                  <span>Custom Biomechanical Programming</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-red-500" />
                  <span>Weekly Video Form Audits</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* CINEMA HD VIDEO MODAL */}
      {/* ========================================================================= */}
      {cinemaModalVideo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-xl animate-fade-in"
          onClick={() => setCinemaModalVideo(null)}
        >
          <div 
            className="relative w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl shadow-black flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-red-500 uppercase tracking-wider">
                      {cinemaModalVideo.coachName}
                    </span>
                    <span className="text-neutral-500 text-xs">•</span>
                    <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
                      {cinemaModalVideo.badge}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-white uppercase font-display tracking-tight">
                    {cinemaModalVideo.title}
                  </h4>
                </div>
              </div>

              <button
                onClick={() => setCinemaModalVideo(null)}
                className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Video Container */}
            <div className="relative bg-black flex items-center justify-center flex-1 min-h-[300px] max-h-[60vh]">
              <video
                ref={cinemaVideoRef}
                src={cinemaModalVideo.src}
                autoPlay
                controls
                loop
                muted={cinemaModalMuted}
                playsInline
                className="w-full h-full max-h-[60vh] object-contain"
                onPlay={() => setCinemaModalPlaying(true)}
                onPause={() => setCinemaModalPlaying(false)}
              >
                {cinemaModalVideo.altSrc && (
                  <source src={cinemaModalVideo.altSrc} type="video/mp4" />
                )}
                <source src={cinemaModalVideo.src} type="video/mp4" />
              </video>
            </div>

            {/* Modal Footer Info & CTA */}
            <div className="px-6 py-4 bg-neutral-900/90 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-left space-y-0.5">
                <p className="text-xs text-neutral-300 max-w-xl">
                  {cinemaModalVideo.description || 'Watch the unadulterated discipline, force mechanics, and physical mastery of the BFL coaching philosophy.'}
                </p>
                <span className="text-[10px] text-neutral-500 uppercase font-mono">
                  BFL Fitness • Founder Training Reel
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setCinemaModalVideo(null);
                    handleApplyClick();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-red-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105"
                >
                  <span>Train with {cinemaModalVideo.coachName.split(' ')[0]}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
