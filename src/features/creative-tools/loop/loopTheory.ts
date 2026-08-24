export const loopRows = ['Kick', 'Snare', 'Hi-Hat', 'Clap', 'Bass'] as const;
export type LoopRow = typeof loopRows[number];
export type Pattern = Record<LoopRow, boolean[]>;
export type GrooveName = 'Pop' | 'Hip-Hop' | 'R&B' | 'Gospel' | 'Country';

const steps = (...active: number[]) => Array.from({ length: 16 }, (_, index) => active.includes(index + 1));
export const emptyPattern = (): Pattern => ({ Kick: steps(), Snare: steps(), 'Hi-Hat': steps(), Clap: steps(), Bass: steps() });
export const groovePresets: Record<GrooveName, Pattern> = {
  Pop: { Kick: steps(1, 9, 11), Snare: steps(5, 13), 'Hi-Hat': steps(1, 3, 5, 7, 9, 11, 13, 15), Clap: steps(5, 13), Bass: steps(1, 4, 9, 12) },
  'Hip-Hop': { Kick: steps(1, 7, 10), Snare: steps(5, 13), 'Hi-Hat': steps(1, 3, 5, 7, 9, 11, 12, 13, 15, 16), Clap: steps(13), Bass: steps(1, 7, 10, 15) },
  'R&B': { Kick: steps(1, 8, 11), Snare: steps(5, 13), 'Hi-Hat': steps(1, 3, 5, 7, 9, 11, 13, 15), Clap: steps(5, 13), Bass: steps(1, 6, 9, 11, 15) },
  Gospel: { Kick: steps(1, 7, 9, 15), Snare: steps(5, 13), 'Hi-Hat': steps(1, 3, 5, 7, 9, 11, 13, 15), Clap: steps(5, 13), Bass: steps(1, 4, 7, 9, 12, 15) },
  Country: { Kick: steps(1, 9), Snare: steps(5, 13), 'Hi-Hat': steps(1, 3, 5, 7, 9, 11, 13, 15), Clap: steps(), Bass: steps(1, 5, 9, 13) },
};
export const grooveNames = Object.keys(groovePresets) as GrooveName[];
export function clonePattern(pattern: Pattern): Pattern { return Object.fromEntries(loopRows.map((row) => [row, [...pattern[row]]])) as Pattern; }
export function randomPattern(): Pattern {
  const pattern = emptyPattern();
  loopRows.forEach((row) => { const chance = row === 'Hi-Hat' ? .48 : row === 'Bass' ? .28 : .22; pattern[row] = pattern[row].map((_, index) => index === 0 && row === 'Kick' ? true : Math.random() < chance); });
  return pattern;
}
export function summarizePattern(pattern: Pattern) {
  const parts = loopRows.map((row) => { const active = pattern[row].flatMap((on, index) => on ? [index + 1] : []); return active.length ? `${row} on ${active.join(', ')}` : `${row} is resting`; });
  return parts.join('; ');
}
export function serializePattern(pattern: Pattern, bpm: number) { return [`JPAC Loop Builder · ${bpm} BPM`, ...loopRows.map((row) => `${row}: ${pattern[row].map((on, index) => on ? index + 1 : '').filter(Boolean).join(', ') || 'rest'}`)].join('\n'); }
