import type { InstructorActivity } from '../shared/InstructorActivityPanel';

export const loopRows = ['Kick', 'Snare', 'Hi-Hat', 'Clap', 'Bass'] as const;
export type LoopRow = typeof loopRows[number];
export type Pattern = Record<LoopRow, boolean[]>;
export type GrooveName = 'Pop' | 'Hip-Hop' | 'R&B' | 'Gospel' | 'Country' | 'JPAC Showcase';
export const loopGoals = ['Build a beat', 'Practice rhythm', 'Make a hook groove', 'Create a performance track'] as const;
export type LoopGoal = typeof loopGoals[number];

const steps = (...active: number[]) => Array.from({ length: 16 }, (_, index) => active.includes(index + 1));
export const emptyPattern = (): Pattern => ({ Kick: steps(), Snare: steps(), 'Hi-Hat': steps(), Clap: steps(), Bass: steps() });
export const groovePresets: Record<GrooveName, Pattern> = {
  Pop: { Kick: steps(1, 9, 11), Snare: steps(5, 13), 'Hi-Hat': steps(1, 3, 5, 7, 9, 11, 13, 15), Clap: steps(5, 13), Bass: steps(1, 4, 9, 12) },
  'Hip-Hop': { Kick: steps(1, 7, 10), Snare: steps(5, 13), 'Hi-Hat': steps(1, 3, 5, 7, 9, 11, 12, 13, 15, 16), Clap: steps(13), Bass: steps(1, 7, 10, 15) },
  'R&B': { Kick: steps(1, 8, 11), Snare: steps(5, 13), 'Hi-Hat': steps(1, 3, 5, 7, 9, 11, 13, 15), Clap: steps(5, 13), Bass: steps(1, 6, 9, 11, 15) },
  Gospel: { Kick: steps(1, 7, 9, 15), Snare: steps(5, 13), 'Hi-Hat': steps(1, 3, 5, 7, 9, 11, 13, 15), Clap: steps(5, 13), Bass: steps(1, 4, 7, 9, 12, 15) },
  Country: { Kick: steps(1, 9), Snare: steps(5, 13), 'Hi-Hat': steps(1, 3, 5, 7, 9, 11, 13, 15), Clap: steps(), Bass: steps(1, 5, 9, 13) },
  'JPAC Showcase': { Kick: steps(1, 4, 9, 11, 15), Snare: steps(5, 13), 'Hi-Hat': steps(1, 3, 5, 7, 9, 11, 13, 15), Clap: steps(5, 13, 16), Bass: steps(1, 4, 8, 9, 11, 15) },
};
export const grooveNames = Object.keys(groovePresets) as GrooveName[];
export function clonePattern(pattern: Pattern): Pattern { return Object.fromEntries(loopRows.map((row) => [row, [...pattern[row]]])) as Pattern; }
export function randomPattern(): Pattern {
  const pattern = emptyPattern();
  loopRows.forEach((row) => { const chance = row === 'Hi-Hat' ? .48 : row === 'Bass' ? .28 : .22; pattern[row] = pattern[row].map((_, index) => index === 0 && row === 'Kick' ? true : Math.random() < chance); });
  return pattern;
}
export function createVariation(pattern: Pattern): Pattern {
  const next = clonePattern(pattern);
  const safeToggles: Record<LoopRow, number[]> = { Kick: [10], Snare: [], 'Hi-Hat': [8, 16], Clap: [12], Bass: [7] };
  loopRows.forEach((row) => safeToggles[row].forEach((step) => { next[row][step - 1] = !next[row][step - 1]; }));
  next.Kick[0] = true;
  next.Snare[4] = true;
  next.Snare[12] = true;
  return next;
}
export function countActiveSteps(pattern: Pattern) { return loopRows.reduce((total, row) => total + pattern[row].filter(Boolean).length, 0); }
export function summarizePattern(pattern: Pattern) {
  const parts = loopRows.map((row) => { const active = pattern[row].flatMap((on, index) => on ? [index + 1] : []); return active.length ? `${row} on ${active.join(', ')}` : `${row} is resting`; });
  return parts.join('; ');
}
export function serializePattern(pattern: Pattern, bpm: number) { return [`JPAC Loop Builder · ${bpm} BPM`, ...loopRows.map((row) => `${row}: ${pattern[row].map((on, index) => on ? index + 1 : '').filter(Boolean).join(', ') || 'rest'}`)].join('\n'); }

export const loopHelpers = [
  ['Kick, snare, hi-hat', 'Kick builds the foundation, snare marks the backbeat, and hi-hat divides the pulse.'],
  ['Tempo', 'BPM controls how quickly the beat moves. Start slower when accuracy matters.'],
  ['Loop grid', 'Each row is a sound and each column is one step in the repeating pattern.'],
  ['Variation', 'A small planned change keeps a repeated groove interesting without losing its pulse.'],
] as const;

export const loopActivities: readonly InstructorActivity[] = [
  { id: 'clean-groove', title: 'Clean 4-Bar Groove', coachFocus: 'Build a steady pulse with clear musical roles.', task: 'Create a groove that can repeat cleanly for four bars.', steps: ['Choose Pop or JPAC Showcase.', 'Start with kick and snare.', 'Add an even hi-hat pulse.', 'Play the loop and remove clutter.'], successTarget: 'The beat repeats steadily and every sound has a purpose.', nextMove: 'Use Variation, then compare the original and changed groove.', reflectionPrompt: 'Which sound made your groove feel steady?' },
  { id: 'hook-rhythm', title: 'Create a Hook Rhythm', coachFocus: 'Use repetition to make a rhythm memorable.', task: 'Build one short rhythmic idea that listeners could clap back.', steps: ['Choose Hip-Hop or R&B.', 'Place a simple kick pattern.', 'Add one clap or bass surprise.', 'Play it twice and simplify if needed.'], successTarget: 'You can clap the main rhythm after hearing it once.', nextMove: 'Move one bass or clap step to create a response.', reflectionPrompt: 'What makes your rhythm easy to remember?' },
  { id: 'performance-loop', title: 'Performance Backing Loop', coachFocus: 'Leave musical space for a singer, dancer, or actor.', task: 'Create a supportive track for a short performance moment.', steps: ['Choose a creative goal.', 'Set a comfortable tempo.', 'Build a clear downbeat.', 'Mute busy steps by turning them off.', 'Practice over the loop.'], successTarget: 'The loop supports the performer without overpowering them.', nextMove: 'Try the same pattern 8 BPM faster or slower.', reflectionPrompt: 'Where did you leave space for the performance?' },
  { id: 'timing', title: 'Kick/Snare Timing', coachFocus: 'Feel the relationship between the downbeat and backbeat.', task: 'Practice a strong kick-and-snare foundation.', steps: ['Clear the pattern.', 'Place kick on steps 1 and 9.', 'Place snare on steps 5 and 13.', 'Add hi-hat only after the pulse feels solid.'], successTarget: 'You can count four steady beats while the pattern loops.', nextMove: 'Add one extra kick without moving the main snare hits.', reflectionPrompt: 'Did the kick or snare help you count most?' },
  { id: 'showcase', title: 'JPAC Showcase Beat', coachFocus: 'Shape an exciting but controlled performance groove.', task: 'Customize the JPAC Showcase preset for your creative style.', steps: ['Load JPAC Showcase.', 'Choose your performance tempo.', 'Change one instrument row.', 'Create one variation.', 'Save the strongest version locally.'], successTarget: 'The groove has a clear opening, energy, and room for a performer.', nextMove: 'Copy the summary and describe how the beat should be performed.', reflectionPrompt: 'What change made this beat sound like you?' },
];
