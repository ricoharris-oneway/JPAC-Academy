export const pianoSounds = ['Classic Piano', 'Soft Keys', 'Bright Pop'] as const;
export type PianoSound = typeof pianoSounds[number];
export const pianoGoals = ['Learn notes', 'Practice chords', 'Build a melody', 'Warm up fingers'] as const;
export type PianoGoal = typeof pianoGoals[number];
export const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const whiteNotes = [0, 2, 4, 5, 7, 9, 11];
export const chordPads = [
  { name: 'C', notes: [0, 4, 7] }, { name: 'Dm', notes: [2, 5, 9] }, { name: 'Em', notes: [4, 7, 11] },
  { name: 'F', notes: [5, 9, 12] }, { name: 'G', notes: [7, 11, 14] }, { name: 'Am', notes: [9, 12, 16] },
];
export type TrainerStep = { midis: readonly number[]; label: string; beats: number; measure: number; beat: number };
export const beginnerTrainerPattern = { name: 'C Major First Pattern', instruction: 'Play C, D, E, then finish with a C major chord.', steps: [
  { midis: [60], label: 'C4', beats: 1, measure: 1, beat: 1 }, { midis: [62], label: 'D4', beats: 1, measure: 1, beat: 2 },
  { midis: [64], label: 'E4', beats: 1, measure: 1, beat: 3 }, { midis: [60, 64, 67], label: 'C major chord', beats: 2, measure: 1, beat: 4 },
] as readonly TrainerStep[] };
export function addActiveNotes(current: ReadonlySet<number>, midis: readonly number[]) { return new Set([...current, ...midis]); }
export function removeActiveNotes(current: ReadonlySet<number>, midis: readonly number[]) { const next = new Set(current); midis.forEach((midi) => next.delete(midi)); return next; }
export function pianoKeyClass(midi: number, active: ReadonlySet<number>) { return `piano-key ${whiteNotes.includes(midi % 12) ? 'white' : 'black'} ${active.has(midi) ? 'played' : ''}`.trim(); }
export function midiFrequency(midi: number) { return 440 * 2 ** ((midi - 69) / 12); }
export const pianoHelpers = [
  ['White keys', 'Play the musical alphabet: A through G.'],
  ['Black keys', 'Play sharps and flats between most white keys.'],
  ['Octave', 'The same note family repeated higher or lower.'],
  ['Chord pads', 'Play several notes together with one tap.'],
  ['Sustain', 'Lets notes ring longer after you play them.'],
] as const;
