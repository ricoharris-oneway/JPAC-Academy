export const pianoSounds = ['Classic Piano', 'Soft Keys', 'Bright Pop'] as const;
export type PianoSound = typeof pianoSounds[number];
export const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const whiteNotes = [0, 2, 4, 5, 7, 9, 11];
export const chordPads = [
  { name: 'C', notes: [0, 4, 7] }, { name: 'Dm', notes: [2, 5, 9] }, { name: 'Em', notes: [4, 7, 11] },
  { name: 'F', notes: [5, 9, 12] }, { name: 'G', notes: [7, 11, 14] }, { name: 'Am', notes: [9, 12, 16] },
];
export function midiFrequency(midi: number) { return 440 * 2 ** ((midi - 69) / 12); }
