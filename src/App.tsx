import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  Clock,
  Edit3,
  Moon,
  Play,
  Plus,
  RotateCcw,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react';
import {
  AlarmItem,
  AlarmSoundMode,
  CustomAudioTrack,
  DailyScore,
  DayIndex,
  WeeklyScoreMap,
} from './types/alarm';
import {
  DAILY_SCORES,
  DEFAULT_WEEKLY_SCORE_MAP,
  ORDERED_WEEK_DAYS,
  getScoreById,
  getScoreForDay,
} from './data/dailyScores';
import { musicEngine } from './audio/dailyMusicEngine';
import { AudioVisualizer } from './components/AudioVisualizer';
import { AlarmModal } from './components/AlarmModal';
import { WakeOverlay } from './components/WakeOverlay';
import { BedsideView } from './components/BedsideView';
import { BackgroundClock } from './components/BackgroundClock';
import { buildClockCursorUrls } from './utils/clockCursor';

const STORAGE_KEYS = {
  ALARMS: 'aube_alarms_v1',
  WEEKLY_MAP: 'aube_weekly_scores_v1',
  USE_24H: 'aube_use_24h_v1',
  CUSTOM_TRACKS: 'aube_custom_tracks_v1',
};

const INITIAL_ALARMS: AlarmItem[] = [
  {
    id: 'alarm-weekday-700',
    time: '07:00',
    label: 'Weekday Wake',
    enabled: true,
    repeatDays: [
      DayIndex.Monday,
      DayIndex.Tuesday,
      DayIndex.Wednesday,
      DayIndex.Thursday,
      DayIndex.Friday,
    ],
    soundMode: AlarmSoundMode.DailyRotation,
    fadeInSeconds: 30,
    snoozeMinutes: 9,
    volume: 0.85,
  },
  {
    id: 'alarm-weekend-830',
    time: '08:30',
    label: 'Weekend Morning',
    enabled: true,
    repeatDays: [DayIndex.Saturday, DayIndex.Sunday],
    soundMode: AlarmSoundMode.DailyRotation,
    fadeInSeconds: 60,
    snoozeMinutes: 9,
    volume: 0.75,
  },
];

const DAY_NAMES: Record<DayIndex, string> = {
  [DayIndex.Sunday]: 'Sunday',
  [DayIndex.Monday]: 'Monday',
  [DayIndex.Tuesday]: 'Tuesday',
  [DayIndex.Wednesday]: 'Wednesday',
  [DayIndex.Thursday]: 'Thursday',
  [DayIndex.Friday]: 'Friday',
  [DayIndex.Saturday]: 'Saturday',
};

const SHORT_DAY_NAMES: Record<DayIndex, string> = {
  [DayIndex.Sunday]: 'Sun',
  [DayIndex.Monday]: 'Mon',
  [DayIndex.Tuesday]: 'Tue',
  [DayIndex.Wednesday]: 'Wed',
  [DayIndex.Thursday]: 'Thu',
  [DayIndex.Friday]: 'Fri',
  [DayIndex.Saturday]: 'Sat',
};

function formatAlarmTimeDisplay(
  time24: string,
  use24Hour: boolean
): { main: string; period?: string } {
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  if (use24Hour) {
    return { main: `${String(h).padStart(2, '0')}:${mStr}` };
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return { main: `${String(h12).padStart(2, '0')}:${mStr}`, period };
}

function formatRepeatDays(days: DayIndex[]): string {
  if (days.length === 0) return 'Once';
  if (days.length === 7) return 'Every day';
  const isWeekdays =
    days.length === 5 &&
    [
      DayIndex.Monday,
      DayIndex.Tuesday,
      DayIndex.Wednesday,
      DayIndex.Thursday,
      DayIndex.Friday,
    ].every((d) => days.includes(d));
  if (isWeekdays) return 'Weekdays';
  const isWeekend =
    days.length === 2 && days.includes(DayIndex.Saturday) && days.includes(DayIndex.Sunday);
  if (isWeekend) return 'Weekends';

  return ORDERED_WEEK_DAYS.filter((d) => days.includes(d))
    .map((d) => SHORT_DAY_NAMES[d])
    .join(', ');
}

function getNextOccurrenceDate(alarm: AlarmItem, fromDate: Date): Date | null {
  if (!alarm.enabled) return null;
  const [targetHour, targetMinute] = alarm.time.split(':').map(Number);

  if (alarm.repeatDays.length === 0) {
    const candidate = new Date(fromDate);
    candidate.setHours(targetHour, targetMinute, 0, 0);
    if (candidate <= fromDate) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(fromDate);
    candidate.setDate(fromDate.getDate() + offset);
    candidate.setHours(targetHour, targetMinute, 0, 0);
    const dayIdx = candidate.getDay() as DayIndex;
    if (alarm.repeatDays.includes(dayIdx) && candidate > fromDate) {
      return candidate;
    }
  }
  return null;
}

export default function App() {
  const [now, setNow] = useState<Date>(() => new Date());

  const [alarms, setAlarms] = useState<AlarmItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ALARMS);
      if (saved) return JSON.parse(saved) as AlarmItem[];
    } catch {
      // Fallback to initial alarms
    }
    return INITIAL_ALARMS;
  });

  const [weeklyScoreMap, setWeeklyScoreMap] = useState<WeeklyScoreMap>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WEEKLY_MAP);
      if (saved) return { ...DEFAULT_WEEKLY_SCORE_MAP, ...(JSON.parse(saved) as WeeklyScoreMap) };
    } catch {
      // Fallback to default
    }
    return DEFAULT_WEEKLY_SCORE_MAP;
  });

  const [use24Hour, setUse24Hour] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.USE_24H) === 'true';
    } catch {
      return false;
    }
  });

  const [customTracks, setCustomTracks] = useState<CustomAudioTrack[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_TRACKS);
      if (saved) return JSON.parse(saved) as CustomAudioTrack[];
    } catch {
      // Fallback
    }
    return [];
  });

  const [previewingDay, setPreviewingDay] = useState<DayIndex | 'hero' | null>(null);
  const [isEnginePlaying, setIsEnginePlaying] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingAlarm, setEditingAlarm] = useState<AlarmItem | null>(null);
  const [bedsideActive, setBedsideActive] = useState<boolean>(false);

  const [ringingState, setRingingState] = useState<{
    alarm: AlarmItem;
    isTest: boolean;
  } | null>(null);
  const [snoozedState, setSnoozedState] = useState<{
    alarm: AlarmItem;
    wakeAt: number;
  } | null>(null);

  const lastTriggeredRef = useRef<string>('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(alarms));
    } catch {
      // Ignore storage error
    }
  }, [alarms]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WEEKLY_MAP, JSON.stringify(weeklyScoreMap));
    } catch {
      // Ignore storage error
    }
  }, [weeklyScoreMap]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USE_24H, String(use24Hour));
    } catch {
      // Ignore storage error
    }
  }, [use24Hour]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_TRACKS, JSON.stringify(customTracks));
    } catch {
      // Ignore storage error
    }
  }, [customTracks]);

  useEffect(() => {
    return musicEngine.subscribe(() => {
      const playing = musicEngine.isPlaying();
      setIsEnginePlaying(playing);
      if (!playing) {
        setPreviewingDay(null);
      }
    });
  }, []);

  useEffect(() => {
    const unlockHandler = () => {
      musicEngine.unlock();
    };
    window.addEventListener('pointerdown', unlockHandler, { once: true });
    window.addEventListener('keydown', unlockHandler, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
    };
  }, []);

  const currentMinuteKey = `${now.getHours()}:${now.getMinutes()}`;
  useEffect(() => {
    const { defaultCursor, pointerCursor } = buildClockCursorUrls(now);
    document.documentElement.style.setProperty('--cursor-clock', defaultCursor);
    document.documentElement.style.setProperty('--cursor-clock-pointer', pointerCursor);
  }, [currentMinuteKey]);

  const resolveScoreForAlarm = (alarm: AlarmItem, targetDay: DayIndex): DailyScore => {
    if (alarm.soundMode === AlarmSoundMode.FixedScore && alarm.fixedScoreId) {
      return getScoreById(alarm.fixedScoreId);
    }
    return getScoreForDay(targetDay, weeklyScoreMap);
  };

  const triggerAlarmAudioAndOverlay = async (alarm: AlarmItem, isTest: boolean) => {
    setPreviewingDay(null);
    setRingingState({ alarm, isTest });

    const todayIdx = new Date().getDay() as DayIndex;
    const score = resolveScoreForAlarm(alarm, todayIdx);

    if (alarm.soundMode === AlarmSoundMode.CustomUpload && alarm.customTrackId) {
      const track = customTracks.find((t) => t.id === alarm.customTrackId);
      if (track) {
        await musicEngine.playCustomAudio(track.dataUrl, {
          targetVolume: alarm.volume,
          fadeInSeconds: isTest ? 3 : alarm.fadeInSeconds,
        });
        return;
      }
    }

    await musicEngine.playScore(score, {
      targetVolume: alarm.volume,
      fadeInSeconds: isTest ? 3 : alarm.fadeInSeconds,
    });
  };

  useEffect(() => {
    const tick = () => {
      const current = new Date();
      setNow(current);

      if (ringingState) return;

      if (snoozedState && current.getTime() >= snoozedState.wakeAt) {
        const snoozedAlarm = snoozedState.alarm;
        setSnoozedState(null);
        triggerAlarmAudioAndOverlay(snoozedAlarm, false);
        return;
      }

      if (current.getSeconds() <= 2) {
        const hh = String(current.getHours()).padStart(2, '0');
        const mm = String(current.getMinutes()).padStart(2, '0');
        const currentHHMM = `${hh}:${mm}`;
        const currentDay = current.getDay() as DayIndex;
        const dateStamp = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}-${currentHHMM}`;

        for (const alarm of alarms) {
          if (!alarm.enabled) continue;
          if (alarm.time !== currentHHMM) continue;

          const dayMatches =
            alarm.repeatDays.length === 0 || alarm.repeatDays.includes(currentDay);
          const triggerKey = `${alarm.id}-${dateStamp}`;

          if (dayMatches && lastTriggeredRef.current !== triggerKey) {
            lastTriggeredRef.current = triggerKey;

            if (alarm.repeatDays.length === 0) {
              setAlarms((prev) =>
                prev.map((a) => (a.id === alarm.id ? { ...a, enabled: false } : a))
              );
            }

            triggerAlarmAudioAndOverlay(alarm, false);
            break;
          }
        }
      }
    };

    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  });

  const todayIndex = now.getDay() as DayIndex;
  const todaysScore = useMemo(
    () => getScoreForDay(todayIndex, weeklyScoreMap),
    [todayIndex, weeklyScoreMap]
  );

  const nextScheduledInfo = useMemo(() => {
    let soonestDate: Date | null = null;
    let soonestAlarm: AlarmItem | null = null;

    for (const alarm of alarms) {
      const nextDate = getNextOccurrenceDate(alarm, now);
      if (nextDate && (!soonestDate || nextDate < soonestDate)) {
        soonestDate = nextDate;
        soonestAlarm = alarm;
      }
    }

    if (!soonestDate || !soonestAlarm) return null;

    const diffMs = Math.max(0, soonestDate.getTime() - now.getTime());
    const totalMinutes = Math.ceil(diffMs / 60000);
    const hoursAway = Math.floor(totalMinutes / 60);
    const minsAway = totalMinutes % 60;

    const targetDay = soonestDate.getDay() as DayIndex;
    const score = resolveScoreForAlarm(soonestAlarm, targetDay);
    const formatted = formatAlarmTimeDisplay(soonestAlarm.time, use24Hour);

    return {
      alarm: soonestAlarm,
      countdownText:
        hoursAway > 0
          ? `Next in ${hoursAway}h ${String(minsAway).padStart(2, '0')}m`
          : `Next in ${minsAway}m`,
      summaryText: `${formatted.main}${formatted.period ? ` ${formatted.period}` : ''} · ${SHORT_DAY_NAMES[targetDay]}`,
      score,
    };
  }, [alarms, now, use24Hour, weeklyScoreMap]);

  const handlePreviewSlot = async (slot: DayIndex | 'hero', score: DailyScore) => {
    if (previewingDay === slot && isEnginePlaying) {
      musicEngine.stop();
      setPreviewingDay(null);
      return;
    }

    await musicEngine.unlock();
    setPreviewingDay(slot);
    await musicEngine.playScore(score, { targetVolume: 0.8, fadeInSeconds: 0.8 });
  };

  const handleSaveAlarm = (alarmData: Omit<AlarmItem, 'id'>, existingId?: string) => {
    if (existingId) {
      setAlarms((prev) =>
        prev.map((a) => (a.id === existingId ? { ...alarmData, id: existingId } : a))
      );
    } else {
      const created: AlarmItem = {
        ...alarmData,
        id: `alarm-${Date.now()}`,
      };
      setAlarms((prev) => [...prev, created].sort((a, b) => a.time.localeCompare(b.time)));
    }
    setModalOpen(false);
    setEditingAlarm(null);
  };

  const handleToggleAlarm = (id: string) => {
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  };

  const handleDeleteAlarm = (id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
    if (snoozedState?.alarm.id === id) {
      setSnoozedState(null);
    }
  };

  const handleDismissWake = () => {
    musicEngine.stop();
    setRingingState(null);
  };

  const handleSnoozeWake = (minutes: number) => {
    if (!ringingState) return;
    const targetAlarm = ringingState.alarm;
    musicEngine.stop();
    setRingingState(null);
    setSnoozedState({
      alarm: targetAlarm,
      wakeAt: Date.now() + minutes * 60 * 1000,
    });
  };

  const isCustomWeekModified = useMemo(
    () => ORDERED_WEEK_DAYS.some((d) => weeklyScoreMap[d] !== DEFAULT_WEEKLY_SCORE_MAP[d]),
    [weeklyScoreMap]
  );

  const h24 = now.getHours();
  const displayHour = use24Hour
    ? String(h24).padStart(2, '0')
    : String(h24 % 12 || 12).padStart(2, '0');
  const displayMinute = String(now.getMinutes()).padStart(2, '0');
  const displaySecond = String(now.getSeconds()).padStart(2, '0');
  const displayPeriod = h24 >= 12 ? 'PM' : 'AM';

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(now);

  return (
    <div className="relative min-h-screen bg-white text-[#0A0A0A] flex flex-col">
      {/* Live Matching Red, White & Black Analog Clock Background */}
      <BackgroundClock variant="light" />

      {/* Clean 3-Zone Top Bar */}
      <header className="relative z-10 border-b border-neutral-200/90 bg-white/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
          <a
            href="#clock"
            className="font-display-heading text-xl font-bold tracking-tight text-[#0A0A0A] whitespace-nowrap shrink-0"
          >
            Aube
          </a>

          <nav
            aria-label="Primary"
            className="hidden sm:flex items-center gap-6 text-sm font-medium text-neutral-600"
          >
            <a
              href="#clock"
              className="hover:text-[#0A0A0A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Clock
            </a>
            <a
              href="#alarms"
              className="hover:text-[#0A0A0A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Alarms
            </a>
            <a
              href="#daily-music"
              className="hover:text-[#0A0A0A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Daily Music
            </a>
            <button
              type="button"
              onClick={() => setBedsideActive(true)}
              className="hover:text-[#0A0A0A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Night Mode
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingAlarm(null);
                setModalOpen(true);
              }}
              className="min-h-[40px] px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              <Plus className="w-4 h-4" />
              <span>New Alarm</span>
            </button>
          </div>
        </div>
      </header>

      {/* Simple Single-Page Workspace */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-7">
        {snoozedState && (
          <div className="mb-6 px-5 py-3 rounded-xl bg-[#0A0A0A]/95 backdrop-blur-md text-white flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-red-500 shrink-0" />
              <span>Snoozed: {snoozedState.alarm.label}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-clock text-xs text-white/75">
                Rings in {Math.max(1, Math.ceil((snoozedState.wakeAt - now.getTime()) / 60000))}m
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSnoozedState(null)}
              className="min-h-[34px] px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Cancel Snooze
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left Column: Live Clock + Alarms */}
          <div className="lg:col-span-6 space-y-6">
            {/* Matte Black Precision Clock */}
            <section
              id="clock"
              className="bg-[#0A0A0A]/92 backdrop-blur-md text-white rounded-2xl p-7 sm:p-8 shadow-sm"
              aria-label="Current Time"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <span>{formattedDate}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-red-500 font-semibold">{todaysScore.title}</span>
                </div>

                <div
                  role="group"
                  aria-label="Time format"
                  className="flex items-center gap-1 p-1 bg-white/10 rounded-lg"
                >
                  <button
                    type="button"
                    onClick={() => setUse24Hour(false)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      !use24Hour ? 'bg-red-600 text-white' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    12h
                  </button>
                  <button
                    type="button"
                    onClick={() => setUse24Hour(true)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      use24Hour ? 'bg-red-600 text-white' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    24h
                  </button>
                </div>
              </div>

              <div className="flex items-baseline gap-3 my-2">
                <span className="tabular-clock text-6xl sm:text-7xl xl:text-8xl leading-none font-bold tracking-tight text-white">
                  {displayHour}:{displayMinute}
                </span>
                <div className="flex flex-col items-start gap-1">
                  <span className="tabular-clock text-xl sm:text-2xl font-bold text-red-500">
                    {displaySecond}
                  </span>
                  {!use24Hour && (
                    <span className="tabular-clock text-xs font-semibold text-white/80">
                      {displayPeriod}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 mb-6">
                <AudioVisualizer
                  active={isEnginePlaying && !ringingState}
                  height={32}
                  barCount={28}
                  surface="dark"
                />
              </div>

              <div className="pt-5 border-t border-white/15 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-white/75 flex items-center gap-2">
                  {nextScheduledInfo ? (
                    <>
                      <Bell className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="tabular-clock font-semibold text-white">
                        {nextScheduledInfo.countdownText}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-clock">{nextScheduledInfo.summaryText}</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-3.5 h-3.5 text-white/40 shrink-0" />
                      <span>No active alarms</span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePreviewSlot('hero', todaysScore)}
                    className="min-h-[40px] px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {previewingDay === 'hero' && isEnginePlaying ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop Music</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play Today’s Music</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const sampleAlarm =
                        nextScheduledInfo?.alarm ?? alarms[0] ?? INITIAL_ALARMS[0];
                      triggerAlarmAudioAndOverlay(sampleAlarm, true);
                    }}
                    className="min-h-[40px] px-3.5 py-2 rounded-lg bg-white text-[#0A0A0A] hover:bg-neutral-200 text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Test Alarm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBedsideActive(true)}
                    className="min-h-[40px] px-3 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    title="Full-screen black bedside clock"
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span className="sr-only sm:not-sr-only">Night</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Alarms List */}
            <section
              id="alarms"
              aria-labelledby="alarms-heading"
              className="bg-white/82 backdrop-blur-md border border-neutral-200/90 rounded-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between gap-4">
                <h2 id="alarms-heading" className="font-display-heading text-lg font-bold text-[#0A0A0A]">
                  Alarms
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAlarm(null);
                    setModalOpen(true);
                  }}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#0A0A0A] hover:bg-neutral-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-red-500" />
                  <span>Add Alarm</span>
                </button>
              </div>

              <div className="divide-y divide-neutral-200">
                {alarms.length === 0 ? (
                  <div className="py-10 px-6 text-center">
                    <p className="text-sm text-neutral-600 mb-4">
                      No alarms set yet. Add an alarm to wake up with daily music.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAlarm(null);
                        setModalOpen(true);
                      }}
                      className="min-h-[40px] px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create First Alarm</span>
                    </button>
                  </div>
                ) : (
                  alarms.map((alarm) => {
                    const formatted = formatAlarmTimeDisplay(alarm.time, use24Hour);
                    const musicText =
                      alarm.soundMode === AlarmSoundMode.DailyRotation
                        ? 'Daily Music'
                        : alarm.soundMode === AlarmSoundMode.CustomUpload
                          ? customTracks.find((t) => t.id === alarm.customTrackId)?.name ??
                            'Custom Audio'
                          : getScoreById(alarm.fixedScoreId ?? '').title;

                    return (
                      <div
                        key={alarm.id}
                        className={`px-6 py-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 transition-opacity ${
                          alarm.enabled ? 'opacity-100' : 'opacity-50'
                        }`}
                      >
                        <div className="flex items-baseline gap-4 min-w-0">
                          <div className="flex items-baseline gap-1.5 shrink-0">
                            <span className="tabular-clock text-2xl sm:text-3xl font-bold text-[#0A0A0A]">
                              {formatted.main}
                            </span>
                            {formatted.period && (
                              <span className="tabular-clock text-xs font-bold text-red-600">
                                {formatted.period}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0A0A0A] truncate">
                              {alarm.label}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-600">
                              <span>{formatRepeatDays(alarm.repeatDays)}</span>
                              <span aria-hidden="true">·</span>
                              <span>{musicText}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAlarm(alarm);
                              setModalOpen(true);
                            }}
                            className="min-h-[38px] min-w-[38px] rounded-lg text-neutral-500 hover:text-[#0A0A0A] hover:bg-neutral-100 transition-colors flex items-center justify-center cursor-pointer"
                            aria-label={`Edit ${alarm.label}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAlarm(alarm.id)}
                            className="min-h-[38px] min-w-[38px] rounded-lg text-neutral-500 hover:text-red-600 hover:bg-neutral-100 transition-colors flex items-center justify-center cursor-pointer"
                            aria-label={`Delete ${alarm.label}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={alarm.enabled}
                            onClick={() => handleToggleAlarm(alarm.id)}
                            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                              alarm.enabled
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-neutral-200 text-[#0A0A0A] hover:bg-neutral-300'
                            }`}
                          >
                            {alarm.enabled ? 'Active' : 'Off'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* Right Column: 7-Day Beautiful Music Schedule */}
          <section
            id="daily-music"
            aria-labelledby="daily-music-heading"
            className="lg:col-span-6 bg-white/45 backdrop-blur-[2px] border border-neutral-200/70 rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-neutral-200/60 flex items-center justify-between gap-4">
              <div>
                <h2
                  id="daily-music-heading"
                  className="font-display-heading text-lg font-bold text-[#0A0A0A]"
                >
                  Daily Wake Music
                </h2>
                <p className="text-xs text-neutral-600">
                  A different acoustic composition for every day of the week
                </p>
              </div>

              {isCustomWeekModified && (
                <button
                  type="button"
                  onClick={() => setWeeklyScoreMap(DEFAULT_WEEKLY_SCORE_MAP)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white/70 hover:bg-white text-xs font-semibold text-[#0A0A0A] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-neutral-200/55">
              {ORDERED_WEEK_DAYS.map((dayIdx) => {
                const assignedScore = getScoreForDay(dayIdx, weeklyScoreMap);
                const isToday = dayIdx === todayIndex;
                const isRowPlaying = previewingDay === dayIdx && isEnginePlaying;

                return (
                  <div
                    key={dayIdx}
                    className={`px-6 py-3.5 flex items-center justify-between gap-4 transition-colors ${
                      isToday ? 'bg-red-50/35' : 'bg-transparent hover:bg-white/40'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => handlePreviewSlot(dayIdx, assignedScore)}
                        aria-label={
                          isRowPlaying
                            ? `Stop ${DAY_NAMES[dayIdx]} music`
                            : `Preview ${DAY_NAMES[dayIdx]} music`
                        }
                        className={`min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                          isRowPlaying
                            ? 'bg-red-600 text-white'
                            : 'bg-[#0A0A0A] text-white hover:bg-red-600'
                        }`}
                      >
                        {isRowPlaying ? (
                          <Square className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-[#0A0A0A]">{DAY_NAMES[dayIdx]}</span>
                          {isToday && (
                            <>
                              <span aria-hidden="true" className="text-neutral-400">·</span>
                              <span className="font-bold text-red-600">Today</span>
                            </>
                          )}
                          <span aria-hidden="true" className="text-neutral-400">·</span>
                          <span className="tabular-clock text-neutral-500">
                            {assignedScore.bpm} BPM
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#0A0A0A] truncate">
                          {assignedScore.title}{' '}
                          <span className="font-normal text-neutral-600">
                            — {assignedScore.instrumentation}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 w-36 sm:w-44">
                      <label htmlFor={`day-score-${dayIdx}`} className="sr-only">
                        Music for {DAY_NAMES[dayIdx]}
                      </label>
                      <select
                        id={`day-score-${dayIdx}`}
                        value={weeklyScoreMap[dayIdx]}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setWeeklyScoreMap((prev) => ({
                            ...prev,
                            [dayIdx]: nextId,
                          }));
                          if (isRowPlaying) {
                            handlePreviewSlot(dayIdx, getScoreById(nextId));
                          }
                        }}
                        className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg bg-white/65 border border-neutral-300/80 text-xs font-medium text-[#0A0A0A] focus:outline-none focus:border-red-600 truncate cursor-pointer"
                      >
                        {DAILY_SCORES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {modalOpen && (
        <AlarmModal
          initialAlarm={editingAlarm}
          customTracks={customTracks}
          onUploadCustomTrack={(track) => setCustomTracks((prev) => [...prev, track])}
          onSave={handleSaveAlarm}
          onClose={() => {
            setModalOpen(false);
            setEditingAlarm(null);
          }}
        />
      )}

      {bedsideActive && !ringingState && (
        <BedsideView
          use24Hour={use24Hour}
          nextAlarmSummary={
            nextScheduledInfo
              ? `${nextScheduledInfo.countdownText} (${nextScheduledInfo.summaryText})`
              : null
          }
          upcomingScore={nextScheduledInfo?.score ?? todaysScore}
          onExit={() => setBedsideActive(false)}
        />
      )}

      {ringingState && (
        <WakeOverlay
          alarm={ringingState.alarm}
          score={resolveScoreForAlarm(ringingState.alarm, todayIndex)}
          customTrackName={
            ringingState.alarm.soundMode === AlarmSoundMode.CustomUpload
              ? customTracks.find((t) => t.id === ringingState.alarm.customTrackId)?.name
              : undefined
          }
          use24Hour={use24Hour}
          isTestPreview={ringingState.isTest}
          onDismiss={handleDismissWake}
          onSnooze={handleSnoozeWake}
        />
      )}
    </div>
  );
}
