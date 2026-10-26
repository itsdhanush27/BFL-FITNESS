import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Timer, Bell, X, Volume2 } from 'lucide-react';

interface RestTimerProps {
  initialSeconds?: number;
  onFinish?: () => void;
  inline?: boolean;
}

export const RestTimer: React.FC<RestTimerProps> = ({ 
  initialSeconds = 90, 
  onFinish,
  inline = false
}) => {
  const [duration, setDuration] = useState<number>(initialSeconds);
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [minimized, setMinimized] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      onFinish?.();
      // Browser audio tone or chime
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 tone
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch {
        // audio context ignored if blocked
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, onFinish]);

  const handleStartPause = () => {
    setIsActive(!isActive);
  };

  const handleReset = (newSecs?: number) => {
    const sec = newSecs ?? duration;
    setIsActive(false);
    setTimeLeft(sec);
  };

  const setPreset = (sec: number) => {
    setDuration(sec);
    setTimeLeft(sec);
    setIsActive(true);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent = ((duration - timeLeft) / duration) * 100;

  if (inline) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${isActive ? 'bg-red-50 text-red-600 animate-pulse border border-red-200' : 'bg-neutral-100 text-neutral-600 border border-neutral-200'}`}>
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xl font-black font-mono text-neutral-900 tracking-wider">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <p className="text-[10px] text-neutral-500 uppercase font-semibold">Rest Period</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {[60, 90, 120, 180].map((s) => (
            <button
              key={s}
              onClick={() => setPreset(s)}
              className={`px-2 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                duration === s && isActive 
                  ? 'bg-red-600 text-white shadow-xs border border-red-500/40' 
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300'
              }`}
            >
              {s}s
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStartPause}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
              isActive ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-300' : 'bg-red-600 hover:bg-red-700 text-white border border-red-500/40'
            }`}
          >
            {isActive ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Start</>}
          </button>
          <button
            onClick={() => handleReset()}
            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer border border-neutral-300"
            title="Reset Timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Floating widget
  return (
    <div className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ${minimized ? 'translate-y-1' : ''}`}>
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 border border-red-500 cursor-pointer font-mono font-bold text-sm"
        >
          <Timer className="w-4 h-4 animate-spin" />
          <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
        </button>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xl w-72 text-neutral-900">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-red-600" /> Rest Timer
              </h4>
            </div>
            <button
              onClick={() => setMinimized(true)}
              className="text-neutral-400 hover:text-neutral-700 p-1 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center my-3">
            <div className="text-4xl font-extrabold font-mono text-neutral-900 tracking-widest">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-3 overflow-hidden border border-neutral-200">
              <div 
                className="bg-red-600 h-full transition-all duration-500 ease-linear rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-4 gap-1.5 my-3">
            {[45, 60, 90, 120].map((s) => (
              <button
                key={s}
                onClick={() => setPreset(s)}
                className={`py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                  duration === s && isActive 
                    ? 'bg-red-600 text-white' 
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300'
                }`}
              >
                {s}s
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleStartPause}
              className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                isActive 
                  ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-300' 
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200 border border-red-500/40'
              }`}
            >
              {isActive ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Start Timer</>}
            </button>
            <button
              onClick={() => handleReset()}
              className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 cursor-pointer"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
