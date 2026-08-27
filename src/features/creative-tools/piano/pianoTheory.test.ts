import { addActiveNotes, beginnerTrainerPattern, chordPads, pianoKeyClass, removeActiveNotes } from './pianoTheory';
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
let active = addActiveNotes(new Set<number>(), [60, 64]);
assert(active.size === 2 && [60, 64].every((midi) => pianoKeyClass(midi, active).includes('played')), 'Multiple notes should track and highlight.');
const chord = chordPads[0].notes.map((offset) => 60 + offset); active = addActiveNotes(active, chord);
assert(chord.every((midi) => active.has(midi)), 'Chord pads should highlight every tone.');
active = removeActiveNotes(active, [60]); assert(!active.has(60) && active.has(64) && active.has(67), 'Releasing one note should preserve others.');
const trainer = beginnerTrainerPattern.steps.at(-1)?.midis || []; active = addActiveNotes(new Set(), trainer);
assert(trainer.every((midi) => active.has(midi)), 'Trainer notes should highlight.'); active = removeActiveNotes(active, trainer); assert(active.size === 0, 'Trainer stop should clear highlights.');
console.log('Virtual Piano trainer tests passed.');
