export type Clef = 'Treble' | 'Bass';
export type PracticeMode = 'Note Names' | 'Staff Position' | 'Rhythm Values';
export type NoteChallenge = { id: string; name: string; position: number; location: string; explanation: string };

export const noteAnswers = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const positionAnswers = ['Line 1', 'Space 1', 'Line 2', 'Space 2', 'Line 3', 'Space 3', 'Line 4', 'Space 4', 'Line 5'];
export const notesByClef: Record<Clef, NoteChallenge[]> = {
  Treble: [
    { id: 'treble-e4', name: 'E', position: 0, location: 'Line 1', explanation: 'E sits on the bottom line of the treble staff.' }, { id: 'treble-f4', name: 'F', position: 1, location: 'Space 1', explanation: 'F is in the first space. Treble spaces spell F-A-C-E.' },
    { id: 'treble-g4', name: 'G', position: 2, location: 'Line 2', explanation: 'G sits on the second line, which curls through the treble-clef symbol.' }, { id: 'treble-a4', name: 'A', position: 3, location: 'Space 2', explanation: 'A is the second space in the F-A-C-E pattern.' },
    { id: 'treble-b4', name: 'B', position: 4, location: 'Line 3', explanation: 'B is on the middle line of the treble staff.' }, { id: 'treble-c5', name: 'C', position: 5, location: 'Space 3', explanation: 'C is the third treble-clef space.' },
    { id: 'treble-d5', name: 'D', position: 6, location: 'Line 4', explanation: 'D sits on the fourth line of the treble staff.' }, { id: 'treble-e5', name: 'E', position: 7, location: 'Space 4', explanation: 'E completes the treble-space word F-A-C-E.' },
    { id: 'treble-f5', name: 'F', position: 8, location: 'Line 5', explanation: 'F sits on the top line of the treble staff.' },
  ],
  Bass: [
    { id: 'bass-g2', name: 'G', position: 0, location: 'Line 1', explanation: 'G sits on the bottom line of the bass staff.' }, { id: 'bass-a2', name: 'A', position: 1, location: 'Space 1', explanation: 'A is in the first space of the bass staff.' },
    { id: 'bass-b2', name: 'B', position: 2, location: 'Line 2', explanation: 'B sits on the second bass-clef line.' }, { id: 'bass-c3', name: 'C', position: 3, location: 'Space 2', explanation: 'C is in the second space of the bass staff.' },
    { id: 'bass-d3', name: 'D', position: 4, location: 'Line 3', explanation: 'D sits on the middle line of the bass staff.' }, { id: 'bass-e3', name: 'E', position: 5, location: 'Space 3', explanation: 'E is in the third bass-clef space.' },
    { id: 'bass-f3', name: 'F', position: 6, location: 'Line 4', explanation: 'F sits on the fourth line between the bass-clef dots.' }, { id: 'bass-g3', name: 'G', position: 7, location: 'Space 4', explanation: 'G is in the top space of the bass staff.' },
    { id: 'bass-a3', name: 'A', position: 8, location: 'Line 5', explanation: 'A sits on the top line of the bass staff.' },
  ],
};
export const rhythms = [
  { name: 'Quarter note', symbol: '♩', beats: '1 beat', explanation: 'A quarter note usually lasts for one steady beat.' }, { name: 'Half note', symbol: '𝅗𝅥', beats: '2 beats', explanation: 'A half note lasts for two steady beats.' },
  { name: 'Whole note', symbol: '𝅝', beats: '4 beats', explanation: 'A whole note fills four beats in common time.' }, { name: 'Eighth note', symbol: '♪', beats: '½ beat', explanation: 'Two eighth notes fit into one quarter-note beat.' },
  { name: 'Quarter rest', symbol: '𝄽', beats: '1 beat of silence', explanation: 'A quarter rest means stay silent for one beat.' },
] as const;
export function randomItem<T>(items: readonly T[], previous?: T) { if (items.length < 2) return items[0]; let next = items[Math.floor(Math.random() * items.length)]; while (next === previous) next = items[Math.floor(Math.random() * items.length)]; return next; }
