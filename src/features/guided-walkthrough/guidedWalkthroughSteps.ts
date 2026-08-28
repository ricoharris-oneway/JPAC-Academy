export type GuidedWalkthroughStep = {
  title: string;
  message: string;
  action: string;
  route: string;
};

export type PageGuidance = GuidedWalkthroughStep & {
  id: 'dashboard' | 'career' | 'academy' | 'lesson' | 'studio' | 'submissions' | 'portfolio' | 'coach';
  secondaryAction: string;
  secondaryRoute: string;
};

const pageGuidance: Record<PageGuidance['id'], PageGuidance> = {
  dashboard: { id: 'dashboard', title: 'Start your JPAC journey', message: 'Start with your career path, then continue your course.', action: 'Go to Career Pathing', route: '/career-pathing', secondaryAction: 'Go to My Academy', secondaryRoute: '/courses' },
  career: { id: 'career', title: 'Choose your creative path', message: 'Choose the creative path you want to grow into.', action: 'Explore Career Paths', route: '/career-pathing', secondaryAction: 'Go to My Academy', secondaryRoute: '/courses' },
  academy: { id: 'academy', title: 'Continue your course', message: 'This is where you continue your course and next mission.', action: 'Continue Course', route: '/courses', secondaryAction: 'Go to Creative Studio', secondaryRoute: '/studio' },
  lesson: { id: 'lesson', title: 'Complete the lesson flow', message: 'Complete the lesson steps in order: watch, practice, create, and mastery.', action: 'Continue Lesson', route: '/courses', secondaryAction: 'Go to Creative Studio', secondaryRoute: '/studio' },
  studio: { id: 'studio', title: 'Practice with Creator Tools', message: 'Use these tools to practice before submitting work.', action: 'Open Creative Studio', route: '/studio', secondaryAction: 'Go to Practice Submissions', secondaryRoute: '/practice-coach' },
  submissions: { id: 'submissions', title: 'Submit work for teacher review', message: 'Submit work here only when your assignment asks for it.', action: 'View Submissions', route: '/practice-coach', secondaryAction: 'Go to Portfolio', secondaryRoute: '/certificates' },
  portfolio: { id: 'portfolio', title: 'Build your portfolio', message: 'This is where your completed work and certificate readiness come together.', action: 'View Portfolio', route: '/certificates', secondaryAction: 'Go to Career Pathing', secondaryRoute: '/career-pathing' },
  coach: { id: 'coach', title: 'Use your coach guidance', message: 'I can help you understand your next step.', action: 'Go to My Academy', route: '/courses', secondaryAction: 'Go to Career Pathing', secondaryRoute: '/career-pathing' },
};

export function guidanceForPath(pathname: string): PageGuidance {
  if (pathname === '/career-pathing') return pageGuidance.career;
  if (/^\/courses\/[^/]+\/(modules|lessons)\//.test(pathname)) return pageGuidance.lesson;
  if (pathname === '/courses' || pathname.startsWith('/courses/')) return pageGuidance.academy;
  if (pathname === '/studio' || pathname.startsWith('/studio/')) return pageGuidance.studio;
  if (pathname === '/practice-coach') return pageGuidance.submissions;
  if (pathname === '/certificates') return pageGuidance.portfolio;
  if (pathname === '/coach') return pageGuidance.coach;
  return pageGuidance.dashboard;
}

export const guidedWalkthroughSteps: readonly GuidedWalkthroughStep[] = [
  {
    title: 'Choose your creative career path',
    message: 'Start by choosing the creative path you want to grow into. Your path helps connect your lessons, practice games, submissions, and portfolio.',
    action: 'Go to Career Pathing',
    route: '/career-pathing',
  },
  {
    title: 'Continue your course',
    message: 'Your course gives you the skills behind your creative path. Open My Academy and continue the next available mission.',
    action: 'Go to My Academy',
    route: '/courses',
  },
  {
    title: 'Complete the lesson steps',
    message: 'Work through the lesson, video, practice, create, and mastery steps in order. The app will show what is complete and what is still ready.',
    action: 'Continue course',
    route: '/courses',
  },
  {
    title: 'Practice with Creator Tools',
    message: 'Use the practice games and Creator Tools to build your skills before submitting work.',
    action: 'Go to Creative Studio',
    route: '/studio',
  },
  {
    title: 'Submit or review your work',
    message: 'When your assignment asks for work, use the submission area so your teacher can review it.',
    action: 'Go to Practice Submissions',
    route: '/practice-coach',
  },
  {
    title: 'Build your portfolio',
    message: 'Completed work and teacher-reviewed progress help prepare your portfolio and certificate readiness.',
    action: 'Go to Certificates & Portfolio',
    route: '/certificates',
  },
] as const;
