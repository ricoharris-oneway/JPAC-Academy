import type { CareerCategory, CareerPath } from './careerPathing';

const evidenceByCategory: Record<CareerCategory, string[]> = {
  performance: ['A short performance sample with a clear rehearsal goal.', 'A before-and-after practice reflection explaining one technical or expressive change.'],
  'music-creation': ['An original audio sketch, song, or production excerpt with notes about creative choices.', 'A revision log comparing an early version with a refined version.'],
  'stage-screen': ['A scene, voice sample, storyboard, or short visual sequence suited to the selected path.', 'Preparation notes explaining audience, character, or storytelling choices.'],
  'creative-business': ['A sample creative project plan describing the audience, purpose, and practical steps.', 'A reflection on responsible collaboration, communication, and use of original work.'],
  'education-leadership': ['A rehearsal or lesson outline with a clear goal and an accessible explanation.', 'A reflection on a teacher-authorized demonstration or leadership exercise.'],
};

export function advisingForCareerPath(path: CareerPath) {
  return {
    family: [
      `${path.title} connects creative interests with a possible direction for practice: ${path.outcome}`,
      `Connected programs include ${path.connectedPrograms.join(', ')}. Staff should confirm current availability and the learner’s existing access before discussing next steps.`,
      `The catalog status is ${path.status}. This is an exploration guide, not a promise of a complete program, employment, or a credential.`,
    ],
    coaching: [
      `What interests you most about the ${path.title} path, and what would you like to explore first?`,
      `Which skill from ${path.connectedPrograms[0]} could you practice through your already authorized learning?`,
      'What small piece of work could show your thinking, and what feedback would help you revise it?',
    ],
    evidence: evidenceByCategory[path.category],
  };
}
