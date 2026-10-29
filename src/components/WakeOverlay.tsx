import React, { useEffect, useState } from 'react';
import { AlarmClockOff, Clock, Volume2 } from 'lucide-react';
import { AlarmItem, DailyScore } from '../types/alarm';
import { AudioVisualizer } from './AudioVisualizer';
import { BackgroundClock } from './BackgroundClock';

interface WakeOverlayProps {
  alarm: AlarmItem;
  score: DailyScore;
  customTrackName?: string;
  use24Hour: boolean;
  isTestPreview?: boolean;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
}

export const WakeOverlay: React.FC<WakeOverlayProps> = ({
  alarm,
  score,
  customTrackName,
  use24Hour,
  isTestPreview = false,
  onDismiss,
  onSnooze,
}) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const hours24 = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const displayHours = use24Hour
    ? String(hours24).padStart(2, '0')
    : String(hours24 % 12 || 12).padStart(2, '0');
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';

  const dayText = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(now);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A] text-white p-6 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Morning alarm ringing"
    >
      <BackgroundClock variant="dark" />

      <div className="relative z-10 w-full max-w-xl bg-white/95 backdrop-blur-md text-[#0A0A0A] rounded-2xl p-8 sm:p-12 text-center shadow-2xl border border-neutral-200">
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-neutral-600 mb-4">
          <span>{dayText}</span>
          <span aria-hidden="true">·</span>
          <span className="text-red-600 font-semibold">
            {isTestPreview ? 'Wake Test' : alarm.label || 'Morning Alarm'}
          </span>
        </div>

        <div className="flex items-baseline justify-center gap-2.5 mb-6">
          <span className="tabular-clock text-6xl sm:text-8xl font-bold tracking-tight text-[#0A0A0A]">
            {displayHours}:{minutes}
          </span>
          {!use24Hour && (
            <span className="tabular-clock text-xl sm:text-2xl font-bold text-red-600">
              {meridiem}
            </span>
          )}
        </div>

        <div className="max-w-md mx-auto mb-8">
          <h2 className="font-display-heading text-2xl sm:text-3xl font-semibold text-[#0A0A0A] mb-2">
            {customTrackName ? customTrackName : score.title}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-600 mb-6">
            <Volume2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>{customTrackName ? 'Personal Audio' : score.instrumentation}</span>
            {!customTrackName && (
              <>
                <span aria-hidden="true">·</span>
                <span>{score.keySignature}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-clock">{score.bpm} BPM</span>
              </>
            )}
          </div>

          <AudioVisualizer active={true} height={44} barCount={28} surface="light" />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            <AlarmClockOff className="w-4 h-4" />
            <span>{isTestPreview ? 'Stop Test' : 'Dismiss Alarm'}</span>
          </button>

          <button
            type="button"
            onClick={() => onSnooze(alarm.snoozeMinutes)}
            className="w-full sm:w-auto min-h-[48px] px-6 py-3 bg-[#0A0A0A] hover:bg-neutral-800 text-white font-medium text-sm rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A]"
          >
            <Clock className="w-4 h-4 text-red-500" />
            <span className="tabular-clock">Snooze {alarm.snoozeMinutes}m</span>
          </button>
        </div>
      </div>
    </div>
  );
};
