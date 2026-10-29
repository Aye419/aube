export enum DayIndex {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
}

export enum InstrumentTimbre {
  FeltPiano = 'felt_piano',
  ConcertHarp = 'concert_harp',
  VintageRhodes = 'vintage_rhodes',
  NylonGuitar = 'nylon_guitar',
  RosewoodMarimba = 'rosewood_marimba',
  BowedGlass = 'bowed_glass',
  WarmVibraphone = 'warm_vibraphone',
}

export enum AlarmSoundMode {
  DailyRotation = 'daily_rotation',
  FixedScore = 'fixed_score',
  CustomUpload = 'custom_upload',
}

export interface DailyScore {
  id: string;
  defaultDay: DayIndex;
  dayName: string;
  shortDay: string;
  title: string;
  subtitle: string;
  keySignature: string;
  bpm: number;
  instrumentation: string;
  moodNote: string;
  timbre: InstrumentTimbre;
  imageUrl: string;
  imageAlt: string;
  /** Four rich chord voicings in MIDI note numbers */
  chords: number[][];
  /** Melodic / arpeggio motif scale degrees in MIDI note numbers */
  motifNotes: number[];
  /** Ambient birdsong or breeze shimmer level (0..1) */
  natureShimmer: number;
}

export interface CustomAudioTrack {
  id: string;
  name: string;
  dataUrl: string;
}

export interface AlarmItem {
  id: string;
  /** 24-hour "HH:MM" format */
  time: string;
  label: string;
  enabled: boolean;
  /** Empty array = one-time alarm; otherwise array of DayIndex (0..6) */
  repeatDays: DayIndex[];
  soundMode: AlarmSoundMode;
  /** Used when soundMode === AlarmSoundMode.FixedScore */
  fixedScoreId?: string;
  /** Used when soundMode === AlarmSoundMode.CustomUpload */
  customTrackId?: string;
  /** Gradual sunrise volume ramp in seconds */
  fadeInSeconds: number;
  /** Snooze duration in minutes */
  snoozeMinutes: number;
  /** Target alarm volume (0.2 .. 1.0) */
  volume: number;
}

export type WeeklyScoreMap = Record<DayIndex, string>;
