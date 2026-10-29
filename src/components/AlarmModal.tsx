import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Play, Square, Upload, Volume2, X } from 'lucide-react';
import { AlarmItem, AlarmSoundMode, CustomAudioTrack, DayIndex } from '../types/alarm';
import { DAILY_SCORES, ORDERED_WEEK_DAYS, getScoreById } from '../data/dailyScores';
import { musicEngine } from '../audio/dailyMusicEngine';

interface AlarmModalProps {
  initialAlarm: AlarmItem | null;
  customTracks: CustomAudioTrack[];
  onUploadCustomTrack: (track: CustomAudioTrack) => void;
  onSave: (alarm: Omit<AlarmItem, 'id'>, existingId?: string) => void;
  onClose: () => void;
}

const DAY_SHORT_LABELS: Record<DayIndex, string> = {
  [DayIndex.Monday]: 'Mon',
  [DayIndex.Tuesday]: 'Tue',
  [DayIndex.Wednesday]: 'Wed',
  [DayIndex.Thursday]: 'Thu',
  [DayIndex.Friday]: 'Fri',
  [DayIndex.Saturday]: 'Sat',
  [DayIndex.Sunday]: 'Sun',
};

export const AlarmModal: React.FC<AlarmModalProps> = ({
  initialAlarm,
  customTracks,
  onUploadCustomTrack,
  onSave,
  onClose,
}) => {
  const [hour, setHour] = useState<number>(() =>
    initialAlarm ? Number(initialAlarm.time.split(':')[0]) : 7
  );
  const [minute, setMinute] = useState<number>(() =>
    initialAlarm ? Number(initialAlarm.time.split(':')[1]) : 0
  );
  const [label, setLabel] = useState<string>(initialAlarm?.label ?? 'Morning Alarm');
  const [repeatDays, setRepeatDays] = useState<DayIndex[]>(
    initialAlarm?.repeatDays ?? [
      DayIndex.Monday,
      DayIndex.Tuesday,
      DayIndex.Wednesday,
      DayIndex.Thursday,
      DayIndex.Friday,
    ]
  );
  const [soundMode, setSoundMode] = useState<AlarmSoundMode>(
    initialAlarm?.soundMode ?? AlarmSoundMode.DailyRotation
  );
  const [fixedScoreId, setFixedScoreId] = useState<string>(
    initialAlarm?.fixedScoreId ?? DAILY_SCORES[0].id
  );
  const [customTrackId, setCustomTrackId] = useState<string>(
    initialAlarm?.customTrackId ?? customTracks[0]?.id ?? ''
  );
  const [fadeInSeconds, setFadeInSeconds] = useState<number>(initialAlarm?.fadeInSeconds ?? 30);
  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(initialAlarm?.snoozeMinutes ?? 9);
  const [volume, setVolume] = useState<number>(Math.round((initialAlarm?.volume ?? 0.85) * 100));
  const [isAuditioning, setIsAuditioning] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        musicEngine.stop();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const stopAuditionIfActive = () => {
    if (isAuditioning) {
      musicEngine.stop();
      setIsAuditioning(false);
    }
  };

  const toggleDay = (d: DayIndex) => {
    setRepeatDays((prev) =>
      prev.includes(d) ? prev.filter((item) => item !== d) : [...prev, d]
    );
  };

  const handleAudition = async () => {
    if (isAuditioning) {
      musicEngine.stop();
      setIsAuditioning(false);
      return;
    }

    await musicEngine.unlock();
    if (soundMode === AlarmSoundMode.CustomUpload) {
      const found = customTracks.find((t) => t.id === customTrackId);
      if (found) {
        await musicEngine.playCustomAudio(found.dataUrl, {
          targetVolume: volume / 100,
          fadeInSeconds: 1.0,
        });
        setIsAuditioning(true);
      }
      return;
    }

    const scoreToPlay =
      soundMode === AlarmSoundMode.FixedScore
        ? getScoreById(fixedScoreId)
        : DAILY_SCORES.find((s) => s.defaultDay === (new Date().getDay() as DayIndex)) ??
          DAILY_SCORES[0];

    await musicEngine.playScore(scoreToPlay, {
      targetVolume: volume / 100,
      fadeInSeconds: 1.0,
    });
    setIsAuditioning(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Please select an audio file under 15 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const newTrack: CustomAudioTrack = {
          id: `custom-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          dataUrl: reader.result,
        };
        onUploadCustomTrack(newTrack);
        setCustomTrackId(newTrack.id);
        setSoundMode(AlarmSoundMode.CustomUpload);
      }
    };
    reader.onerror = () => setUploadError('Unable to read the selected audio file.');
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    stopAuditionIfActive();

    const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    onSave(
      {
        time: formattedTime,
        label: label.trim() || 'Morning Alarm',
        enabled: true,
        repeatDays,
        soundMode,
        fixedScoreId: soundMode === AlarmSoundMode.FixedScore ? fixedScoreId : undefined,
        customTrackId: soundMode === AlarmSoundMode.CustomUpload ? customTrackId : undefined,
        fadeInSeconds,
        snoozeMinutes,
        volume: volume / 100,
      },
      initialAlarm?.id
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alarm-modal-title"
    >
      <div className="w-full max-w-lg bg-white text-[#0A0A0A] border border-neutral-200 rounded-2xl p-6 sm:p-7 shadow-2xl my-auto">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <h2 id="alarm-modal-title" className="font-display-heading text-xl font-semibold text-[#0A0A0A]">
            {initialAlarm ? 'Edit Alarm' : 'New Alarm'}
          </h2>
          <button
            type="button"
            onClick={() => {
              stopAuditionIfActive();
              onClose();
            }}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-neutral-500 hover:text-[#0A0A0A] hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Time Picker */}
          <div className="flex items-center justify-center gap-4 py-3 bg-[#0A0A0A] text-white rounded-xl">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => setHour((h) => (h + 1) % 24)}
                className="min-h-[32px] px-4 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                aria-label="Increase hour"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <input
                type="number"
                min={0}
                max={23}
                value={String(hour).padStart(2, '0')}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!Number.isNaN(val)) setHour(Math.max(0, Math.min(23, val)));
                }}
                aria-label="Hour"
                className="tabular-clock w-20 text-center text-4xl font-bold bg-transparent text-white focus:outline-none focus:text-red-500"
              />
              <button
                type="button"
                onClick={() => setHour((h) => (h - 1 + 24) % 24)}
                className="min-h-[32px] px-4 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                aria-label="Decrease hour"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            <span className="tabular-clock text-4xl font-bold text-red-600 pb-1">:</span>

            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => setMinute((m) => (m + 5) % 60)}
                className="min-h-[32px] px-4 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                aria-label="Increase minute"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <input
                type="number"
                min={0}
                max={59}
                value={String(minute).padStart(2, '0')}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!Number.isNaN(val)) setMinute(Math.max(0, Math.min(59, val)));
                }}
                aria-label="Minute"
                className="tabular-clock w-20 text-center text-4xl font-bold bg-transparent text-white focus:outline-none focus:text-red-500"
              />
              <button
                type="button"
                onClick={() => setMinute((m) => (m - 5 + 60) % 60)}
                className="min-h-[32px] px-4 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                aria-label="Decrease minute"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            <div className="pl-3 border-l border-white/15 text-left">
              <div className="tabular-clock text-sm font-bold text-red-500">
                {hour >= 12 ? 'PM' : 'AM'}
              </div>
              <div className="tabular-clock text-xs text-white/70">
                {String(hour % 12 || 12).padStart(2, '0')}:{String(minute).padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Label */}
          <div>
            <label htmlFor="alarm-label" className="block text-xs font-semibold text-[#0A0A0A] mb-1.5">
              Label
            </label>
            <input
              id="alarm-label"
              type="text"
              maxLength={40}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Morning Alarm"
              className="w-full min-h-[40px] px-3.5 py-2 rounded-lg bg-white border border-neutral-300 text-sm text-[#0A0A0A] placeholder:text-neutral-400 focus:outline-none focus:border-red-600"
            />
          </div>

          {/* Days */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-[#0A0A0A]">Days</span>
              <div className="flex items-center gap-2.5 text-xs text-neutral-600">
                <button
                  type="button"
                  onClick={() =>
                    setRepeatDays([
                      DayIndex.Monday,
                      DayIndex.Tuesday,
                      DayIndex.Wednesday,
                      DayIndex.Thursday,
                      DayIndex.Friday,
                    ])
                  }
                  className="hover:text-red-600 transition-colors cursor-pointer"
                >
                  Weekdays
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setRepeatDays([DayIndex.Saturday, DayIndex.Sunday])}
                  className="hover:text-red-600 transition-colors cursor-pointer"
                >
                  Weekends
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setRepeatDays([...ORDERED_WEEK_DAYS])}
                  className="hover:text-red-600 transition-colors cursor-pointer"
                >
                  Daily
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {ORDERED_WEEK_DAYS.map((dayIdx) => {
                const selected = repeatDays.includes(dayIdx);
                return (
                  <button
                    key={dayIdx}
                    type="button"
                    onClick={() => toggleDay(dayIdx)}
                    className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selected
                        ? 'bg-red-600 text-white'
                        : 'bg-neutral-100 text-[#0A0A0A] hover:bg-neutral-200'
                    }`}
                  >
                    {DAY_SHORT_LABELS[dayIdx]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Music Mode */}
          <div>
            <span className="block text-xs font-semibold text-[#0A0A0A] mb-2">Music</span>
            <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 rounded-xl mb-2.5">
              <button
                type="button"
                onClick={() => {
                  stopAuditionIfActive();
                  setSoundMode(AlarmSoundMode.DailyRotation);
                }}
                className={`min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  soundMode === AlarmSoundMode.DailyRotation
                    ? 'bg-[#0A0A0A] text-white'
                    : 'text-neutral-600 hover:text-[#0A0A0A]'
                }`}
              >
                Daily Music
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAuditionIfActive();
                  setSoundMode(AlarmSoundMode.FixedScore);
                }}
                className={`min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  soundMode === AlarmSoundMode.FixedScore
                    ? 'bg-[#0A0A0A] text-white'
                    : 'text-neutral-600 hover:text-[#0A0A0A]'
                }`}
              >
                Single Score
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAuditionIfActive();
                  setSoundMode(AlarmSoundMode.CustomUpload);
                }}
                className={`min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  soundMode === AlarmSoundMode.CustomUpload
                    ? 'bg-[#0A0A0A] text-white'
                    : 'text-neutral-600 hover:text-[#0A0A0A]'
                }`}
              >
                Upload File
              </button>
            </div>

            {soundMode === AlarmSoundMode.DailyRotation && (
              <p className="text-xs text-neutral-600">
                Plays a different curated composition automatically each day of the week.
              </p>
            )}

            {soundMode === AlarmSoundMode.FixedScore && (
              <select
                value={fixedScoreId}
                onChange={(e) => {
                  stopAuditionIfActive();
                  setFixedScoreId(e.target.value);
                }}
                aria-label="Select composition"
                className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white border border-neutral-300 text-xs text-[#0A0A0A] focus:outline-none focus:border-red-600"
              >
                {DAILY_SCORES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.dayName} — {s.title} ({s.instrumentation})
                  </option>
                ))}
              </select>
            )}

            {soundMode === AlarmSoundMode.CustomUpload && (
              <div className="space-y-2">
                {customTracks.length > 0 && (
                  <select
                    value={customTrackId}
                    onChange={(e) => {
                      stopAuditionIfActive();
                      setCustomTrackId(e.target.value);
                    }}
                    aria-label="Select uploaded audio"
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white border border-neutral-300 text-xs text-[#0A0A0A] focus:outline-none focus:border-red-600"
                  >
                    {customTracks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}

                <label className="min-h-[40px] px-4 py-2 rounded-lg border border-dashed border-neutral-400 hover:border-red-600 bg-white text-xs font-medium text-[#0A0A0A] flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-red-600" />
                  <span>Upload Audio (.mp3, .wav, .ogg)</span>
                  <input type="file" accept="audio/*" onChange={handleFileChange} className="sr-only" />
                </label>
                {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleAudition}
                disabled={soundMode === AlarmSoundMode.CustomUpload && !customTrackId}
                className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 text-xs font-semibold text-red-600 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isAuditioning ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Preview</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 flex-1 max-w-[190px]">
                <Volume2 className="w-4 h-4 text-neutral-500 shrink-0" />
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={volume}
                  aria-label="Volume"
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    if (isAuditioning) musicEngine.setVolume(v / 100);
                  }}
                  className="w-full accent-red-600 cursor-pointer"
                />
                <span className="tabular-clock text-xs text-neutral-600 w-9 text-right">
                  {volume}%
                </span>
              </div>
            </div>
          </div>

          {/* Fade-in & Snooze */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-200">
            <div>
              <label htmlFor="fade-select" className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                Gentle Fade-In
              </label>
              <select
                id="fade-select"
                value={fadeInSeconds}
                onChange={(e) => setFadeInSeconds(Number(e.target.value))}
                className="tabular-clock w-full min-h-[38px] px-2.5 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs text-[#0A0A0A] focus:outline-none focus:border-red-600"
              >
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
                <option value={90}>90s</option>
              </select>
            </div>

            <div>
              <label htmlFor="snooze-select" className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                Snooze
              </label>
              <select
                id="snooze-select"
                value={snoozeMinutes}
                onChange={(e) => setSnoozeMinutes(Number(e.target.value))}
                className="tabular-clock w-full min-h-[38px] px-2.5 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs text-[#0A0A0A] focus:outline-none focus:border-red-600"
              >
                <option value={5}>5 min</option>
                <option value={9}>9 min</option>
                <option value={15}>15 min</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => {
                stopAuditionIfActive();
                onClose();
              }}
              className="min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:text-[#0A0A0A] hover:bg-neutral-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={soundMode === AlarmSoundMode.CustomUpload && !customTrackId}
              className="min-h-[40px] px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Save Alarm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
