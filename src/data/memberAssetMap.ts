// Homepage-only artwork ownership map. Every path is a checked-in public asset.
// The lobby image is the intentional JPAC-branded fallback when no subject-specific
// photograph exists; contact sheets and reference grids are never card artwork.
const creative = '/creative-assets/';
export const heroArtwork = `${creative}jpac-showcase-stage.webp`;

export const programArtwork: Record<string, string> = {
  singing: `${creative}jpac-singing-studio.webp`,
  acting: `${creative}jpac-showcase-stage.webp`,
  dance: `${creative}jpac-dance-studio.webp`,
  piano: `${creative}jpac-main-lobby.webp`,
  guitar: `${creative}jpac-main-lobby.webp`,
  'audio-engineering': `${creative}jpac-main-lobby.webp`,
  'music-production-songwriting': `${creative}jpac-main-lobby.webp`,
  'video-production': `${creative}jpac-video-editing-studio.webp`,
  'digital-ai-creator': `${creative}jpac-main-lobby.webp`,
  'music-business-artist-development': `${creative}jpac-main-lobby.webp`,
};

export const careerArtwork: Record<string, string> = {
  performance: `${creative}jpac-showcase-stage.webp`,
  'music-creation': `${creative}jpac-main-lobby.webp`,
  'stage-screen': `${creative}jpac-video-editing-studio.webp`,
  'creative-business': `${creative}jpac-main-lobby.webp`,
  'education-leadership': `${creative}jpac-main-lobby.webp`,
};

export const toolArtwork: Record<string, string> = {
  'JPAC Coach': `${creative}jpac-main-lobby.webp`,
  'Creative Studio': `${creative}jpac-main-lobby.webp`,
  'Practice Submissions': `${creative}jpac-singing-studio.webp`,
  'Career Pathing': `${creative}jpac-showcase-stage.webp`,
  'Video Finder Helper': `${creative}jpac-video-editing-studio.webp`,
  'Certificates & Portfolio': `${creative}jpac-main-lobby.webp`,
  Community: `${creative}jpac-main-lobby.webp`,
};

export const homepageMediaSlots = [
  { slotKey: 'hero:homepage', section: 'Homepage Hero', itemName: 'Create Your Future hero' },
  ...Object.keys(programArtwork).map((id) => ({ slotKey: `program:${id}`, section: 'Featured Programs / Premium Courses', itemName: id })),
  ...Object.keys(careerArtwork).map((id) => ({ slotKey: `career:${id}`, section: 'Career Paths', itemName: id })),
  ...Object.keys(toolArtwork).map((id) => ({ slotKey: `tool:${id}`, section: 'JPAC Tools', itemName: id })),
] as const;
