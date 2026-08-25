export const guitarStrings = [
  { name: 'Low E', short: 'E', midi: 40 }, { name: 'A', short: 'A', midi: 45 }, { name: 'D', short: 'D', midi: 50 },
  { name: 'G', short: 'G', midi: 55 }, { name: 'B', short: 'B', midi: 59 }, { name: 'High E', short: 'E', midi: 64 },
] as const;
export const fretNumbers = Array.from({ length: 13 }, (_, index) => index);
export const guitarSounds = ['Clean Guitar', 'Warm Acoustic', 'Bright Lead'] as const;
export type GuitarSound = typeof guitarSounds[number];
export const guitarGoals = ['Learn strings', 'Practice chord changes', 'Build a riff', 'Strum a progression'] as const;
export type GuitarGoal = typeof guitarGoals[number];
export const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const chordShapes = {
  G: [3, 2, 0, 0, 0, 3], C: [null, 3, 2, 0, 1, 0], D: [null, null, 0, 2, 3, 2], Em: [0, 2, 2, 0, 0, 0],
  Am: [null, 0, 2, 2, 1, 0], A: [null, 0, 2, 2, 2, 0], E: [0, 2, 2, 1, 0, 0],
} satisfies Record<string, (number | null)[]>;
export type ChordName = keyof typeof chordShapes;
export function midiFrequency(midi: number) { return 440 * 2 ** ((midi - 69) / 12); }
export function midiLabel(midi: number) { return `${noteNames[midi % 12]}${Math.floor(midi / 12) - 1}`; }
export const guitarHelpers = [
  ['Open strings', 'Play a string without pressing a fret.'],
  ['Frets', 'Each fret raises the note by one half step.'],
  ['Chord shapes', 'Finger patterns that create harmony.'],
  ['Strumming', 'Play several strings in a smooth motion.'],
  ['Switching chords', 'Move between shapes while keeping a steady pulse.'],
] as const;
