import heroSanctuaryImg from '../assets/images/hero_morning_sanctuary_1793247238406.jpg';
import acousticPianoImg from '../assets/images/score_acoustic_piano_1793247239765.jpg';
import harpStringsImg from '../assets/images/score_harp_strings_1793247241619.jpg';
import ambientDawnImg from '../assets/images/score_ambient_dawn_1793247240706.jpg';
import { DailyScore, DayIndex, InstrumentTimbre, WeeklyScoreMap } from '../types/alarm';

export const HERO_SANCTUARY_IMAGE = heroSanctuaryImg;

/**
 * Seven original acoustic & ambient morning compositions — one crafted for each day of the week.
 * MIDI note reference: 60 = C4, 62 = D4, 64 = E4, 65 = F4, 67 = G4, 69 = A4, 71 = B4, 72 = C5
 */
export const DAILY_SCORES: DailyScore[] = [
  {
    id: 'score-monday-piano',
    defaultDay: DayIndex.Monday,
    dayName: 'Monday',
    shortDay: 'Mon',
    title: 'First Light in D',
    subtitle: 'Unhurried felt-damped chords and bowed cello bass to ease into the week',
    keySignature: 'D Major',
    bpm: 72,
    instrumentation: 'Felt Piano & Cello',
    moodNote: 'Warm wool hammers with long sustain',
    timbre: InstrumentTimbre.FeltPiano,
    imageUrl: acousticPianoImg,
    imageAlt: 'Macro view of upright felt piano hammers and warm brass strings in morning light',
    chords: [
      [50, 57, 62, 66, 69, 76], // Dmaj9
      [47, 54, 59, 62, 66, 73], // Bm9
      [43, 50, 55, 59, 62, 69], // Gmaj9
      [45, 52, 57, 62, 64, 73], // A6sus4
    ],
    motifNotes: [74, 76, 78, 81, 78, 76, 74, 69],
    natureShimmer: 0.15,
  },
  {
    id: 'score-tuesday-harp',
    defaultDay: DayIndex.Tuesday,
    dayName: 'Tuesday',
    shortDay: 'Tue',
    title: 'Cedar & Dew',
    subtitle: 'Cascading chamber harp arpeggios paired with soft wooden flute harmonics',
    keySignature: 'F Major',
    bpm: 80,
    instrumentation: 'Chamber Harp & Alto Flute',
    moodNote: 'Clear plucked spruce resonance',
    timbre: InstrumentTimbre.ConcertHarp,
    imageUrl: harpStringsImg,
    imageAlt: 'Artisanal wooden concert harp soundboard and bronze strings illuminated by golden light',
    chords: [
      [41, 48, 53, 57, 60, 64], // Fmaj7
      [50, 57, 60, 64, 69, 72], // Dm9
      [46, 53, 58, 62, 65, 72], // Bbmaj9
      [48, 55, 60, 62, 64, 69], // C6/9
    ],
    motifNotes: [65, 69, 72, 76, 77, 76, 72, 69],
    natureShimmer: 0.25,
  },
  {
    id: 'score-wednesday-rhodes',
    defaultDay: DayIndex.Wednesday,
    dayName: 'Wednesday',
    shortDay: 'Wed',
    title: 'Glass Harbor',
    subtitle: 'Velvet vintage tine electric piano voicings and delicate celesta bells',
    keySignature: 'Eb Major',
    bpm: 68,
    instrumentation: 'Electric Tine Piano & Celesta',
    moodNote: 'Mellow bell-tone harmonic warmth',
    timbre: InstrumentTimbre.VintageRhodes,
    imageUrl: ambientDawnImg,
    imageAlt: 'Still alpine lake reflecting soft amber horizon light at daybreak',
    chords: [
      [51, 58, 63, 67, 70, 77], // Ebmaj9
      [48, 55, 60, 63, 67, 74], // Cm9
      [44, 51, 56, 60, 63, 70], // Abmaj9
      [46, 53, 58, 63, 65, 72], // Bb9sus4
    ],
    motifNotes: [75, 77, 79, 82, 79, 75, 70, 74],
    natureShimmer: 0.1,
  },
  {
    id: 'score-thursday-guitar',
    defaultDay: DayIndex.Thursday,
    dayName: 'Thursday',
    shortDay: 'Thu',
    title: 'Sunbeam Etude',
    subtitle: 'Fingerpicked classical nylon strings woven with warm thumb-piano overtones',
    keySignature: 'A Major',
    bpm: 86,
    instrumentation: 'Nylon Guitar & Kalimba',
    moodNote: 'Intimate sunlit acoustic fingerpicking',
    timbre: InstrumentTimbre.NylonGuitar,
    imageUrl: heroSanctuaryImg,
    imageAlt: 'Sunlit linen curtains framing misty hills at sunrise from a serene bedroom window',
    chords: [
      [45, 52, 57, 61, 64, 71], // Amaj9
      [42, 49, 54, 57, 61, 68], // F#m9
      [50, 57, 62, 66, 69, 73], // Dmaj7
      [40, 47, 52, 56, 59, 66], // Eadd9
    ],
    motifNotes: [69, 73, 76, 80, 81, 76, 73, 71],
    natureShimmer: 0.3,
  },
  {
    id: 'score-friday-marimba',
    defaultDay: DayIndex.Friday,
    dayName: 'Friday',
    shortDay: 'Fri',
    title: 'Golden Meridian',
    subtitle: 'Buoyant rosewood marimba patterns lifted by warm brass-string swells',
    keySignature: 'G Major',
    bpm: 92,
    instrumentation: 'Rosewood Marimba & Warm Pad',
    moodNote: 'Bright rhythmic momentum for Friday',
    timbre: InstrumentTimbre.RosewoodMarimba,
    imageUrl: harpStringsImg,
    imageAlt: 'Warm wooden acoustic soundboard glowing in golden morning light',
    chords: [
      [43, 50, 55, 59, 62, 69], // Gmaj9
      [40, 47, 52, 55, 59, 66], // Em9
      [48, 55, 60, 64, 67, 74], // Cmaj9
      [50, 57, 60, 62, 67, 69], // D9sus4
    ],
    motifNotes: [67, 71, 74, 78, 79, 74, 71, 69],
    natureShimmer: 0.2,
  },
  {
    id: 'score-saturday-ambient',
    defaultDay: DayIndex.Saturday,
    dayName: 'Saturday',
    shortDay: 'Sat',
    title: 'Slow Horizon',
    subtitle: 'Spacious bowed glass harmonics, dawn mist swells, and distant meadow birdsong',
    keySignature: 'C Major',
    bpm: 62,
    instrumentation: 'Bowed Glass & Dawn Chorale',
    moodNote: 'Weightless weekend awakening',
    timbre: InstrumentTimbre.BowedGlass,
    imageUrl: ambientDawnImg,
    imageAlt: 'Tranquil mountain lake reflection under soft morning mist',
    chords: [
      [48, 55, 60, 64, 67, 71], // Cmaj7
      [45, 52, 57, 60, 64, 71], // Am9
      [41, 48, 53, 57, 60, 67], // Fmaj9
      [43, 50, 55, 59, 62, 67], // G6
    ],
    motifNotes: [72, 76, 79, 83, 84, 79, 76, 74],
    natureShimmer: 0.55,
  },
  {
    id: 'score-sunday-vibraphone',
    defaultDay: DayIndex.Sunday,
    dayName: 'Sunday',
    shortDay: 'Sun',
    title: 'Sanctuary Bells',
    subtitle: 'Shimmering motor-vibraphone chords resting on a cathedral flute-organ bed',
    keySignature: 'Bb Major',
    bpm: 66,
    instrumentation: 'Vibraphone & Flute Organ',
    moodNote: 'Restorative Sunday stillness',
    timbre: InstrumentTimbre.WarmVibraphone,
    imageUrl: acousticPianoImg,
    imageAlt: 'Warm acoustic hammers and resonant strings in soft Sunday daylight',
    chords: [
      [46, 53, 58, 62, 65, 72], // Bbmaj9
      [43, 50, 55, 58, 62, 69], // Gm9
      [51, 58, 63, 67, 70, 74], // Ebmaj7
      [41, 48, 53, 58, 60, 67], // F9sus4
    ],
    motifNotes: [70, 74, 77, 81, 82, 77, 74, 72],
    natureShimmer: 0.35,
  },
];

/** Ordered Monday -> Sunday for editorial 7-day display */
export const ORDERED_WEEK_DAYS: DayIndex[] = [
  DayIndex.Monday,
  DayIndex.Tuesday,
  DayIndex.Wednesday,
  DayIndex.Thursday,
  DayIndex.Friday,
  DayIndex.Saturday,
  DayIndex.Sunday,
];

export const DEFAULT_WEEKLY_SCORE_MAP: WeeklyScoreMap = {
  [DayIndex.Monday]: 'score-monday-piano',
  [DayIndex.Tuesday]: 'score-tuesday-harp',
  [DayIndex.Wednesday]: 'score-wednesday-rhodes',
  [DayIndex.Thursday]: 'score-thursday-guitar',
  [DayIndex.Friday]: 'score-friday-marimba',
  [DayIndex.Saturday]: 'score-saturday-ambient',
  [DayIndex.Sunday]: 'score-sunday-vibraphone',
};

export function getScoreById(scoreId: string): DailyScore {
  return DAILY_SCORES.find((s) => s.id === scoreId) ?? DAILY_SCORES[0];
}

export function getScoreForDay(day: DayIndex, weeklyMap: WeeklyScoreMap): DailyScore {
  const assignedId = weeklyMap[day];
  return getScoreById(assignedId);
}
