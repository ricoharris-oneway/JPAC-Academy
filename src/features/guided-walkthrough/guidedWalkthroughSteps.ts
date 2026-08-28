export type GuidedWalkthroughStep = {
  title: string;
  message: string;
  action: string;
  route: string;
};

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
