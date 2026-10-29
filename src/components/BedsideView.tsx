import React, { useEffect, useState } from 'react';
import { Moon, SunDim, X } from 'lucide-react';
import { DailyScore } from '../types/alarm';
import { BackgroundClock } from './BackgroundClock';

interface BedsideViewProps {
  use24Hour: boolean;
  nextAlarmSummary: string | null;
  upcomingScore: DailyScore;
  onExit: () => void;
}

export const BedsideView: React.FC<BedsideViewProps> = ({
  use24Hour,
  nextAlarmSummary,
  upcomingScore,
  onExit,
}) => {
  const [now, setNow] = useState(() => new Date());
  const [luminance, setLuminance] = useState<number>(70);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onExit]);

  const h24 = now.getHours();
  const hours = use24Hour ? String(h24).padStart(2, '0') : String(h24 % 12 || 12).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const meridiem = h24 >= 12 ? 'PM' : 'AM';

  const dateText = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(now);

  return (
    <div
      className="fixed inset-0 z-40 bg-black text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden"
      role="region"
      aria-label="Bedside Nightstand Display"
    >
      <div style={{ opacity: luminance / 100 }}>
        <BackgroundClock variant="dark" />
      </div>

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Moon className="w-4 h-4 text-red-600" />
          <span>Night Mode · Keep tab open overnight</span>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="min-h-[40px] px-4 py-2 rounded-lg border border-white/20 bg-black/60 backdrop-blur-sm text-xs font-medium text-white hover:bg-white hover:text-black transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Exit Night Mode</span>
        </button>
      </div>

      <div
        className="relative z-10 my-auto text-center transition-opacity duration-150"
        style={{ opacity: luminance / 100 }}
      >
        <p className="text-sm text-white/70 mb-3 tracking-wide">{dateText}</p>
        <div className="flex items-baseline justify-center gap-3">
          <span className="tabular-clock text-7xl sm:text-9xl font-semibold tracking-tight text-white">
            {hours}:{minutes}
          </span>
          <div className="flex flex-col items-start gap-1">
            <span className="tabular-clock text-xl sm:text-2xl text-red-500 font-semibold">
              {seconds}
            </span>
            {!use24Hour && (
              <span className="tabular-clock text-sm font-medium text-white/70">
                {meridiem}
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-white/70">
          <span>{nextAlarmSummary ?? 'No active alarm'}</span>
          <span aria-hidden="true">·</span>
          <span>Music: {upcomingScore.title}</span>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center gap-4 max-w-xs mx-auto w-full">
        <SunDim className="w-4 h-4 text-white/60 shrink-0" />
        <label htmlFor="bedside-luminance" className="sr-only">
          Display Brightness
        </label>
        <input
          id="bedside-luminance"
          type="range"
          min={20}
          max={100}
          value={luminance}
          onChange={(e) => setLuminance(Number(e.target.value))}
          className="w-full accent-red-600 cursor-pointer"
        />
        <span className="tabular-clock text-xs text-white/60 w-10 text-right shrink-0">
          {luminance}%
        </span>
      </div>
    </div>
  );
};
