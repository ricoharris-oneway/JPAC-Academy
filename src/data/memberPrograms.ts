// Marketing only. These cards never contain lessons or imply enrollment.
export const memberPrograms = [
  { slug: 'singing', title: 'Singing', category: 'FIND YOUR VOICE', description: 'Explore vocal technique, expression, and the confidence to own the stage.', image: 'jpac-singing-studio.webp' },
  { slug: 'acting', title: 'Acting', category: 'BECOME THE STORY', description: 'Discover character work, scene preparation, and expressive performance.', image: 'jpac-showcase-stage.webp' },
  { slug: 'dance', title: 'Dance', category: 'MOVE WITH PURPOSE', description: 'Explore rhythm, movement, choreography, and performance presence.', image: 'jpac-dance-studio.webp' },
  { slug: 'piano', title: 'Piano', category: 'PLAY YOUR POSSIBILITIES', description: 'Build a creative foundation through keys, harmony, and musical expression.', image: 'jpac-singing-studio.webp' },
  { slug: 'guitar', title: 'Guitar', category: 'FIND YOUR SOUND', description: 'Explore chords, rhythm, musicianship, and your own performance style.', image: 'jpac-showcase-stage.webp' },
  { slug: 'audio-engineering', title: 'Audio Engineering', category: 'SHAPE THE SOUND', description: 'Discover recording, editing, mixing, and the craft behind clear audio.', image: 'jpac-video-editing-studio.webp' },
  { slug: 'music-production-songwriting', title: 'Music Production / Songwriting', category: 'MAKE SOMETHING ORIGINAL', description: 'Explore songcraft, arrangement, and turning creative ideas into tracks.', image: 'jpac-singing-studio.webp' },
  { slug: 'video-production', title: 'Video Production', category: 'FRAME YOUR VISION', description: 'Discover visual storytelling, camera work, and creative editing.', image: 'jpac-video-editing-studio.webp' },
  { slug: 'digital-ai-creator', title: 'Digital AI Creator', category: 'IMAGINE WHAT IS NEXT', description: 'Explore responsible AI-assisted creative workflows and digital storytelling.', image: 'jpac-creative-spaces-grid.webp' },
  { slug: 'music-business-artist-development', title: 'Music Business / Artist Development', category: 'BUILD YOUR NEXT CHAPTER', description: 'Explore artist identity, creative planning, and the business of your work.', image: 'jpac-main-lobby.webp' },
] as const;

export const memberTools = [
  { title: 'JPAC Coach', icon: '✦', description: 'Discover guidance for your creative practice.', to: '/tools#coach' },
  { title: 'Creative Studio', icon: '◫', description: 'Explore the JPAC creative tool collection.', to: '/studio' },
  { title: 'Practice Submissions', icon: '◉', description: 'Share course practice after enrollment approval.', to: '/practice-coach' },
  { title: 'Career Pathing', icon: '↗', description: 'Choose a direction and explore your creative future.', to: '/career-paths' },
  { title: 'Video Finder Helper', icon: '▷', description: 'Learn about curated learning resources.', to: '/tools#video-finder' },
  { title: 'Certificates & Portfolio', icon: '◇', description: 'Build toward verified work and course credentials.', to: '/certificates' },
  { title: 'Community', icon: '◎', description: 'Your next creative circle. Coming soon.', to: '/community' },
] as const;

export const enrollmentRequestUrl = 'mailto:admissions@jmonespac.org?subject=Request%20Enrollment%20at%20JPAC%20Academy';
export const courseLockedMessage = 'This course is locked until JPAC staff verifies enrollment and grants access.';
