export type GuidedWalkthroughStep = {
  title: string;
  message: string;
  action: string;
  route: string;
  what?: string;
  next?: string;
  owner?: string;
  where?: string;
  blocker?: string;
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

/** A deterministic, read-only operating guide. Aria never infers permissions or changes records. */
export const ariaWorkflowSteps: Record<string, readonly GuidedWalkthroughStep[]> = {
  student: [
    { title: 'Create your JPAC account', message: 'Create your account, then verify your email before your first login.', action: 'Open Account Settings', route: '/account', what: 'Account creation and verification', next: 'Verify your email, then sign in', owner: 'You', where: 'Account Settings', blocker: 'A missing email verification blocks sign-in.' },
    { title: 'Choose your career path', message: 'Choose one of the 14 paths to personalize your learning roadmap.', action: 'Go to Career Pathing', route: '/career-pathing', what: 'Career path selection', next: 'Review the roadmap and open your next step', owner: 'You', where: 'Career Pathing', blocker: 'No path selected yet.' },
    { title: 'Verify payment', message: 'Review your payment status and contact JPAC if a payment needs attention.', action: 'Open My Payments', route: '/account/payments', what: 'Payment verification', next: 'Wait for staff confirmation when payment is pending', owner: 'You, then JPAC staff', where: 'My Payments', blocker: 'A pending or failed payment may limit enrollment.' },
    { title: 'Review consent', message: 'Read each consent item and complete only what applies to you.', action: 'Open My Consents', route: '/account/consents', what: 'Consent review', next: 'Return to My Academy after the required items are complete', owner: 'You and your parent/guardian when required', where: 'My Consents', blocker: 'Required consent can block course access.' },
    { title: 'Open your course', message: 'Your approved enrollment determines which student courses you can open.', action: 'Go to My Academy', route: '/courses', what: 'Student course access', next: 'Open the next published lesson', owner: 'You', where: 'My Academy', blocker: 'Enrollment or payment approval may still be pending.' },
    { title: 'Submit an assignment', message: 'Use Practice Submissions only when a lesson asks for work. Aria cannot submit it for you.', action: 'Open Practice Submissions', route: '/practice-coach', what: 'Assignment submission', next: 'Wait for teacher review and check feedback', owner: 'You', where: 'Practice Submissions', blocker: 'The assignment must be ready and published.' },
  ],
  parent: [
    { title: 'Review your student’s consent', message: 'Open the consent area to review items that require a parent or guardian.', action: 'Review consent', route: '/account/consents', what: 'Consent review', next: 'Complete or discuss the outstanding item', owner: 'Parent/guardian', where: 'Consents', blocker: 'Missing consent can pause enrollment.' },
    { title: 'Check payment status', message: 'Review payment information and contact JPAC staff with questions.', action: 'View payment status', route: '/account/payments', what: 'Payment verification', next: 'Wait for staff confirmation', owner: 'Parent/guardian and JPAC staff', where: 'Payments', blocker: 'Pending verification can delay course access.' },
    { title: 'See what happens next', message: 'Your student’s teacher or enrollment staff can explain the next approved step.', action: 'Open JPAC Coach', route: '/coach', what: 'Student journey guidance', next: 'Ask the teacher for a status update', owner: 'Parent/guardian and teacher', where: 'JPAC Coach', blocker: 'Aria does not expose private academic records.' },
  ],
  teacher: [
    { title: 'Review the approval queue', message: 'Review submitted work and leave feedback; Aria does not approve work.', action: 'Open Practice Submissions', route: '/practice-coach', what: 'Approval queue', next: 'Review, give feedback, and approve when appropriate', owner: 'Teacher', where: 'Practice Submissions', blocker: 'Only assigned or submitted work appears.' },
    { title: 'Manage enrollment', message: 'Use Enrollment Manager to confirm approved course access.', action: 'Open Enrollment Manager', route: '/staff/course-enrollment', what: 'Enrollment manager', next: 'Confirm the student’s eligible course', owner: 'Teacher or admin', where: 'Enrollment Manager', blocker: 'Payment or consent may need resolution first.' },
    { title: 'Check the payment ledger', message: 'Use the ledger as the operational source for payment verification.', action: 'Open Payment Ledger', route: '/staff/payment-ledger', what: 'Payment verification', next: 'Coordinate with admin when a record needs attention', owner: 'Teacher or admin', where: 'Payment Ledger', blocker: 'Aria cannot alter ledger records.' },
  ],
  admin: [
    { title: 'Review the payment ledger', message: 'Confirm payment status before enrollment access is granted.', action: 'Open Payment Ledger', route: '/staff/payment-ledger', what: 'Payment verification', next: 'Resolve exceptions or hand off to enrollment staff', owner: 'Admin', where: 'Payment Ledger', blocker: 'A missing transaction needs a verified source.' },
    { title: 'Manage enrollment access', message: 'Use Enrollment Manager to coordinate approved student course access.', action: 'Open Enrollment Manager', route: '/staff/course-enrollment', what: 'Enrollment manager', next: 'Confirm access and notify the student', owner: 'Admin', where: 'Enrollment Manager', blocker: 'Consent or payment may be incomplete.' },
    { title: 'Review consent records', message: 'Check the consent ledger when an enrollment decision is blocked.', action: 'Open Consent Ledger', route: '/staff/consent-ledger', what: 'Consent review', next: 'Coordinate with the student or parent', owner: 'Admin', where: 'Consent Ledger', blocker: 'Only authorized staff should resolve records.' },
  ],
  developer: [],
};

ariaWorkflowSteps.developer = ariaWorkflowSteps.admin;

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

export const ariaOnboardingSteps: readonly GuidedWalkthroughStep[] = [
  { title: 'Welcome to JPAC Academy', message: 'Hi, I’m Aria, your JPAC Guide. I’ll help you find your path, continue your lessons, practice your skills, and build your portfolio.', action: 'Start with Career Pathing', route: '/career-pathing' },
  { title: 'Choose your creative path', message: 'Career Pathing helps you choose the creative direction you want to grow into. Your path connects your learning, practice tools, and portfolio goals.', action: 'Go to Career Pathing', route: '/career-pathing' },
  { title: 'Continue your learning', message: 'My Academy is where you continue your course, open your next mission, and follow your lesson steps.', action: 'Go to My Academy', route: '/courses' },
  { title: 'Practice your skills', message: 'Creative Studio gives you tools and practice games that help you build confidence before submitting work.', action: 'Go to Creative Studio', route: '/studio' },
  { title: 'Submit when assigned', message: 'Practice tools help you improve, but assignments should be submitted only when your lesson asks for them.', action: 'Go to Practice Submissions', route: '/practice-coach' },
  { title: 'Build your portfolio', message: 'Your reviewed work, progress, and achievements help prepare your portfolio and certificate readiness.', action: 'Go to Portfolio', route: '/certificates' },
  { title: 'You’re ready to begin', message: 'Start with Career Pathing, then continue your course. Aria will stay here when you need help.', action: 'Start now', route: '/career-pathing' },
] as const;
