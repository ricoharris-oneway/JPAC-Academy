import { memberPrograms } from '../../data/memberPrograms';
import { careerPaths, type CareerPath } from './careerPathing';

export type CareerRoadmapStatus = 'completed' | 'current' | 'available' | 'locked' | 'unknown';
export type CareerRoadmapLevel = {
  level: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  status: CareerRoadmapStatus;
};
export type CareerRoadmapProgram = {
  slug: string;
  title: string;
  levels: CareerRoadmapLevel[];
};

const levelNames = ['Foundations', 'Core Practice', 'Portfolio Build', 'Professional Showcase'] as const;
const programSlugByLabel = new Map([
  ...memberPrograms.map((program) => [program.title, program.slug] as const),
  ['Music Business', 'music-business-artist-development'],
  ['Any approved artistic discipline', 'approved-artistic-discipline'],
]);

const classNamesByProgram: Record<string, string[]> = {
  singing: ['Vocal Foundations', 'Performance Technique', 'Recorded Performance Lab', 'Vocal Showcase'],
  acting: ['Acting Foundations', 'Character & Scene Study', 'Audition Repertoire Lab', 'Performance Reel'],
  dance: ['Movement Foundations', 'Technique & Musicality', 'Choreography Lab', 'Dance Reel'],
  piano: ['Keyboard Foundations', 'Harmony & Repertoire', 'Arrangement Lab', 'Performance Set'],
  guitar: ['Guitar Foundations', 'Chords & Rhythm', 'Arrangement Lab', 'Live Performance Set'],
  'audio-engineering': ['Audio Foundations', 'Recording & Editing', 'Mixing Lab', 'Engineering Portfolio'],
  'music-production-songwriting': ['Songcraft Foundations', 'Arrangement & Production', 'Original Track Lab', 'Release-Ready Portfolio'],
  'video-production': ['Visual Storytelling Foundations', 'Camera & Editing', 'Production Lab', 'Director Portfolio'],
  'digital-ai-creator': ['Responsible Digital Foundations', 'Creative Workflow Lab', 'Original Content Lab', 'Digital Portfolio'],
  'music-business-artist-development': ['Artist Development Foundations', 'Creative Business Practice', 'Release Planning Lab', 'Professional Brand Portfolio'],
  'approved-artistic-discipline': ['Discipline Foundations', 'Guided Practice', 'Teaching Demonstration Lab', 'Educator Evidence'],
};

const descriptionsByLevel = [
  'Start with the published foundations for this program.',
  'Build dependable skills through focused practice and reflection.',
  'Apply the skill in an original, portfolio-oriented project.',
  'Prepare a reviewed showcase appropriate to your direction.',
];

function roadmapProgram(programLabel: string): CareerRoadmapProgram {
  const slug = programSlugByLabel.get(programLabel) ?? programLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const classNames = classNamesByProgram[slug] ?? levelNames.map((name) => `${name} Lab`);
  return {
    slug,
    title: programLabel,
    levels: classNames.map((title, index) => ({
      level: (index + 1) as 1 | 2 | 3 | 4,
      title,
      description: descriptionsByLevel[index],
      status: 'unknown',
    })),
  };
}

const roadmapByPathId = new Map(
  careerPaths.map((path) => [path.id, path.connectedPrograms.map(roadmapProgram)] as const),
);

export function careerRoadmapForPath(path: CareerPath): CareerRoadmapProgram[] {
  return roadmapByPathId.get(path.id) ?? path.connectedPrograms.map(roadmapProgram);
}

export function careerRoadmapStatusLabel(status: CareerRoadmapStatus): string {
  return {
    completed: 'Completed',
    current: 'Current · You are here',
    available: 'Available',
    locked: 'Locked · Upcoming',
    unknown: 'Status unavailable · Not asserted',
  }[status];
}
