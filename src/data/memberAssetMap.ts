// Homepage-only artwork ownership map. Every path is a checked-in public asset.
// The lobby image is the intentional JPAC-branded fallback when no subject-specific
// photograph exists; contact sheets and reference grids are never card artwork.
const creative = '/creative-assets/';
export const heroArtwork = `${creative}jpac-showcase-stage.webp`;

export const homepageVisualGuide = [
  {
    label: 'Hero banner',
    description: 'The cinematic first impression for the homepage.',
    categories: ['hero banner', 'tagline moment', 'creative community', 'campus life', 'join the community', 'stay connected', 'find your path', 'news and updates', 'contact us', 'help and support'],
  },
  {
    label: 'Creative disciplines',
    description: 'Subject-specific imagery for programs and creative practice.',
    categories: ['film and video', 'music production', 'acting', 'dance', 'songwriting', 'audio engineering', 'visual arts', 'photography', 'podcasting', 'radio and voiceover'],
  },
  {
    label: 'Programs and journeys',
    description: 'Discovery and future-facing program navigation.',
    categories: ['explore programs', 'career pathing', 'learn anywhere', 'portfolio building', 'find your path', 'creative entrepreneur', 'music business', 'brand building', 'content creator', 'creative tech'],
  },
  {
    label: 'JPAC tools and making',
    description: 'Tools, workspaces, and production-oriented learning moments.',
    categories: ['JPAC tools', 'production studios', 'practice spaces', 'creative lounge', 'collaboration', 'networking', 'live sessions', 'masterclasses', 'set design', 'game and interactive'],
  },
  {
    label: 'Community and people',
    description: 'People-centered imagery for belonging and support.',
    categories: ['student spotlight', 'success stories', 'instructors', 'events', 'community event', 'student life', 'wellness', 'parent support', 'testimonials', 'alumni success'],
  },
  {
    label: 'Industry and opportunity',
    description: 'Career, business, and recognition-oriented imagery.',
    categories: ['industry insights', 'creative business', 'merch and brand', 'monetization', 'industry partners', 'awards and recognition', 'touring and live events', 'social media growth', 'career pathing', 'creative entrepreneur'],
  },
  {
    label: 'Performance and production',
    description: 'Stage, screen, and live production visual language.',
    categories: ['location shoots', 'drone media', 'animation and VFX', 'live streaming', 'costume and style', 'makeup and hair', 'film and video', 'acting', 'dance', 'music production'],
  },
  {
    label: 'Connection and communication',
    description: 'Ways students, families, and the wider community stay connected.',
    categories: ['creative community', 'collaboration', 'networking', 'parent support', 'admissions', 'contact us', 'help and support', 'mobile app', 'radio and voiceover', 'podcasting'],
  },
  {
    label: 'Growth and visibility',
    description: 'Building a visible creative practice and public presence.',
    categories: ['student spotlight', 'success stories', 'portfolio building', 'content creator', 'social media growth', 'monetization', 'brand building', 'merch and brand', 'awards and recognition', 'industry partners'],
  },
  {
    label: 'Internal planning only',
    description: 'A planning taxonomy for admins, never a student-facing image.',
    categories: ['hero banner', 'tagline moment', 'explore programs', 'career pathing', 'JPAC tools', 'student spotlight', 'events', 'creative business', 'community event', 'find your path'],
  },
] as const;

export type HomepageVisualCategory = (typeof homepageVisualGuide)[number]['categories'][number];

const homepageCategoryArtwork: Record<HomepageVisualCategory, string> = {
  'hero banner': heroArtwork,
  'tagline moment': heroArtwork,
  'creative community': `${creative}jpac-main-lobby.webp`,
  'film and video': `${creative}jpac-video-editing-studio.webp`,
  'music production': `${creative}jpac-singing-studio.webp`,
  acting: `${creative}jpac-showcase-stage.webp`,
  dance: `${creative}jpac-dance-studio.webp`,
  songwriting: `${creative}jpac-singing-studio.webp`,
  'audio engineering': `${creative}jpac-singing-studio.webp`,
  'visual arts': `${creative}jpac-main-lobby.webp`,
  'explore programs': heroArtwork,
  'career pathing': heroArtwork,
  'JPAC tools': `${creative}jpac-main-lobby.webp`,
  'learn anywhere': `${creative}jpac-main-lobby.webp`,
  'student spotlight': `${creative}jpac-showcase-stage.webp`,
  'success stories': `${creative}jpac-showcase-stage.webp`,
  instructors: `${creative}jpac-main-lobby.webp`,
  'live sessions': `${creative}jpac-showcase-stage.webp`,
  events: `${creative}jpac-showcase-stage.webp`,
  masterclasses: `${creative}jpac-main-lobby.webp`,
  'portfolio building': `${creative}jpac-main-lobby.webp`,
  collaboration: `${creative}jpac-main-lobby.webp`,
  networking: `${creative}jpac-main-lobby.webp`,
  'industry insights': `${creative}jpac-main-lobby.webp`,
  'creative business': `${creative}jpac-main-lobby.webp`,
  'merch and brand': `${creative}jpac-main-lobby.webp`,
  'parent support': `${creative}jpac-main-lobby.webp`,
  admissions: `${creative}jpac-main-lobby.webp`,
  testimonials: `${creative}jpac-showcase-stage.webp`,
  'mobile app': `${creative}jpac-main-lobby.webp`,
  'production studios': `${creative}jpac-video-editing-studio.webp`,
  'practice spaces': `${creative}jpac-singing-studio.webp`,
  'creative lounge': `${creative}jpac-main-lobby.webp`,
  'campus life': `${creative}jpac-main-lobby.webp`,
  'content creator': `${creative}jpac-video-editing-studio.webp`,
  'social media growth': `${creative}jpac-video-editing-studio.webp`,
  monetization: `${creative}jpac-main-lobby.webp`,
  'industry partners': `${creative}jpac-showcase-stage.webp`,
  'awards and recognition': `${creative}jpac-showcase-stage.webp`,
  'community event': `${creative}jpac-showcase-stage.webp`,
  wellness: `${creative}jpac-main-lobby.webp`,
  'student life': `${creative}jpac-main-lobby.webp`,
  'alumni success': `${creative}jpac-showcase-stage.webp`,
  'creative tech': `${creative}jpac-video-editing-studio.webp`,
  'set design': `${creative}jpac-showcase-stage.webp`,
  'costume and style': `${creative}jpac-showcase-stage.webp`,
  'makeup and hair': `${creative}jpac-showcase-stage.webp`,
  'location shoots': `${creative}jpac-video-editing-studio.webp`,
  'drone media': `${creative}jpac-video-editing-studio.webp`,
  'animation and VFX': `${creative}jpac-video-editing-studio.webp`,
  'game and interactive': `${creative}jpac-video-editing-studio.webp`,
  podcasting: `${creative}jpac-singing-studio.webp`,
  'live streaming': `${creative}jpac-video-editing-studio.webp`,
  'radio and voiceover': `${creative}jpac-singing-studio.webp`,
  photography: `${creative}jpac-main-lobby.webp`,
  'brand building': `${creative}jpac-main-lobby.webp`,
  'creative entrepreneur': `${creative}jpac-main-lobby.webp`,
  'music business': `${creative}jpac-main-lobby.webp`,
  'touring and live events': `${creative}jpac-showcase-stage.webp`,
  'join the community': `${creative}jpac-main-lobby.webp`,
  'stay connected': `${creative}jpac-main-lobby.webp`,
  'news and updates': `${creative}jpac-main-lobby.webp`,
  'contact us': `${creative}jpac-main-lobby.webp`,
  'help and support': `${creative}jpac-main-lobby.webp`,
  'find your path': heroArtwork,
};

export const homepageSlotCategories: Record<string, HomepageVisualCategory> = {
  'hero:homepage': 'hero banner',
  'program:singing': 'music production',
  'program:acting': 'acting',
  'program:dance': 'dance',
  'program:piano': 'music production',
  'program:guitar': 'music production',
  'program:audio-engineering': 'audio engineering',
  'program:music-production-songwriting': 'songwriting',
  'program:video-production': 'film and video',
  'program:digital-ai-creator': 'content creator',
  'program:music-business-artist-development': 'creative business',
  'career:performance': 'career pathing',
  'career:music-creation': 'career pathing',
  'career:stage-screen': 'career pathing',
  'career:creative-business': 'creative entrepreneur',
  'career:education-leadership': 'career pathing',
  'tool:JPAC Coach': 'JPAC tools',
  'tool:Creative Studio': 'creative lounge',
  'tool:Practice Submissions': 'practice spaces',
  'tool:Career Pathing': 'career pathing',
  'tool:Video Finder Helper': 'JPAC tools',
  'tool:Certificates & Portfolio': 'portfolio building',
  'tool:Community': 'creative community',
};

export function artworkForHomepageCategory(category: HomepageVisualCategory) {
  return homepageCategoryArtwork[category] || `${creative}jpac-main-lobby.webp`;
}

export const programArtwork: Record<string, string> = {
  singing: artworkForHomepageCategory('music production'),
  acting: artworkForHomepageCategory('acting'),
  dance: artworkForHomepageCategory('dance'),
  piano: `${creative}jpac-main-lobby.webp`,
  guitar: `${creative}jpac-main-lobby.webp`,
  'audio-engineering': artworkForHomepageCategory('audio engineering'),
  'music-production-songwriting': artworkForHomepageCategory('songwriting'),
  'video-production': artworkForHomepageCategory('film and video'),
  'digital-ai-creator': artworkForHomepageCategory('content creator'),
  'music-business-artist-development': artworkForHomepageCategory('creative business'),
};

export const careerArtwork: Record<string, string> = {
  performance: artworkForHomepageCategory('career pathing'),
  'music-creation': artworkForHomepageCategory('career pathing'),
  'stage-screen': artworkForHomepageCategory('career pathing'),
  'creative-business': artworkForHomepageCategory('creative entrepreneur'),
  'education-leadership': artworkForHomepageCategory('career pathing'),
};

export const toolArtwork: Record<string, string> = {
  'JPAC Coach': artworkForHomepageCategory('JPAC tools'),
  'Creative Studio': artworkForHomepageCategory('creative lounge'),
  'Practice Submissions': artworkForHomepageCategory('practice spaces'),
  'Career Pathing': artworkForHomepageCategory('career pathing'),
  'Video Finder Helper': artworkForHomepageCategory('JPAC tools'),
  'Certificates & Portfolio': artworkForHomepageCategory('portfolio building'),
  Community: artworkForHomepageCategory('creative community'),
};

export const homepageMediaSlots = [
  { slotKey: 'hero:homepage', section: 'Homepage Hero', itemName: 'Create Your Future hero', category: homepageSlotCategories['hero:homepage'] },
  ...Object.keys(programArtwork).map((id) => ({ slotKey: `program:${id}`, section: 'Featured Programs / Premium Courses', itemName: id, category: homepageSlotCategories[`program:${id}`] })),
  ...Object.keys(careerArtwork).map((id) => ({ slotKey: `career:${id}`, section: 'Career Paths', itemName: id, category: homepageSlotCategories[`career:${id}`] })),
  ...Object.keys(toolArtwork).map((id) => ({ slotKey: `tool:${id}`, section: 'JPAC Tools', itemName: id, category: homepageSlotCategories[`tool:${id}`] })),
] as const;
