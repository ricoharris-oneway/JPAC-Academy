import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { GuidedWalkthrough, guidedWalkthroughReducer, takeGuidedStepThere } from './GuidedWalkthrough';
import { ariaOnboardingSteps, guidanceForPath, guidedWalkthroughSteps } from './guidedWalkthroughSteps';
import { GuidedAvatar } from './GuidedAvatar';
import { ARIA_ONBOARDING_PROMPT_DISMISSED_KEY, ARIA_ONBOARDING_PROMPT_DISMISSED_VALUE, dismissAriaOnboardingPrompt, isAriaOnboardingPromptDismissed } from './ariaOnboardingPromptStorage';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function runGuidedWalkthroughTests(): number {
  const closedMarkup = renderToStaticMarkup(<MemoryRouter><GuidedWalkthrough /></MemoryRouter>);
  const openMarkup = renderToStaticMarkup(<MemoryRouter><GuidedWalkthrough initialOpen /></MemoryRouter>);
  const onboardingMarkup = renderToStaticMarkup(<MemoryRouter><GuidedWalkthrough initialOpen initialView="onboarding" /></MemoryRouter>);
  const promptMarkup = renderToStaticMarkup(<MemoryRouter><GuidedWalkthrough initialPromptVisible /></MemoryRouter>);
  const fallbackMarkup = renderToStaticMarkup(<GuidedAvatar forceFallback />);
  const opened = guidedWalkthroughReducer({ open: false, view: 'page', stepIndex: 0 }, { type: 'open' });
  const pathway = guidedWalkthroughReducer({ open: true, view: 'page', stepIndex: 0 }, { type: 'show-pathway' });
  const onboarding = guidedWalkthroughReducer({ open: true, view: 'page', stepIndex: 0 }, { type: 'show-onboarding' });
  const onboardingNext = guidedWalkthroughReducer(onboarding, { type: 'next' });
  const onboardingBack = guidedWalkthroughReducer(onboardingNext, { type: 'back' });
  const onboardingClosed = guidedWalkthroughReducer(onboardingBack, { type: 'close' });
  const next = guidedWalkthroughReducer(pathway, { type: 'next' });
  const back = guidedWalkthroughReducer(next, { type: 'back' });
  const closed = guidedWalkthroughReducer(back, { type: 'close' });
  let destination = '';
  const stored = new Map<string, string>();
  const storage = { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => { stored.set(key, value); } };
  const unavailableStorage = { getItem: () => { throw new Error('unavailable'); }, setItem: () => { throw new Error('unavailable'); } };
  takeGuidedStepThere(guidedWalkthroughSteps[4], (route) => { destination = route; });

  assert(closedMarkup.includes('Open Aria, your JPAC Guide'), 'Aria avatar button must have an accessible student label.');
  assert(closedMarkup.includes('Aria, your JPAC Guide'), 'Aria name and label must render.');
  assert(closedMarkup.includes('Need help? I can guide you.'), 'Aria speech bubble must render.');
  assert(closedMarkup.includes('src="/images/aria/aria-guide.png"'), 'Aria must use the approved image asset as the primary avatar.');
  assert(fallbackMarkup.includes('<svg') && fallbackMarkup.includes('aria-label="Aria, your JPAC Guide"'), 'SVG fallback must retain an accessible Aria label.');
  assert(opened.open && opened.view === 'page', 'Click-triggered open action must reveal the Guided Pop-Up Coach.');
  assert(!closedMarkup.includes('role="dialog"'), 'Guide must not open automatically.');
  assert(openMarkup.includes('role="dialog"') && openMarkup.includes('Start your JPAC journey'), 'Open action must reveal page guidance.');
  assert(openMarkup.includes('Hi, I’m Aria, your JPAC Guide. I’ll show you what to do next.'), 'Open guide must include Aria’s introduction.');
  assert(openMarkup.includes('Start JPAC Tour'), 'Page guide must offer the manual Start JPAC Tour action.');
  assert(promptMarkup.includes('Welcome to JPAC Academy. Want me to show you around?'), 'First-login prompt must render when dismissal is absent.');
  assert(promptMarkup.includes('Start JPAC Tour') && promptMarkup.includes('Maybe later'), 'Prompt must offer start and dismiss actions.');
  assert(promptMarkup.includes('src="/images/aria/aria-guide.png"'), 'Prompt must use the approved Aria image.');
  assert(!isAriaOnboardingPromptDismissed(storage), 'Prompt must be eligible when the dismissal key is absent.');
  assert(dismissAriaOnboardingPrompt(storage), 'Maybe later must write the local dismissal state.');
  assert(isAriaOnboardingPromptDismissed(storage), 'Prompt must remain hidden when the dismissal key is present.');
  assert(stored.size === 1 && stored.get(ARIA_ONBOARDING_PROMPT_DISMISSED_KEY) === ARIA_ONBOARDING_PROMPT_DISMISSED_VALUE, 'Only the approved key and true value may be stored.');
  assert(!isAriaOnboardingPromptDismissed(unavailableStorage) && !dismissAriaOnboardingPrompt(unavailableStorage), 'Unavailable localStorage must not crash the guide.');
  assert(onboarding.view === 'onboarding' && onboarding.stepIndex === 0, 'Start JPAC Tour action must open onboarding at step one.');
  assert(onboardingMarkup.includes('JPAC Welcome Tour · Step 1 of 7'), 'Onboarding must show progress as Step 1 of 7.');
  assert(onboardingMarkup.includes('src="/images/aria/aria-guide.png"'), 'Onboarding header must use the approved Aria image.');
  assert(onboardingNext.stepIndex === 1 && onboardingBack.stepIndex === 0, 'Onboarding Next and Back controls must move one step.');
  assert(!onboardingClosed.open, 'Onboarding Close action must dismiss the guide.');
  assert(ariaOnboardingSteps.length === 7, 'Onboarding must contain exactly seven reviewed steps.');
  assert(ariaOnboardingSteps.map((step) => step.route).join(',') === '/career-pathing,/career-pathing,/courses,/studio,/practice-coach,/certificates,/career-pathing', 'Onboarding Take me there routes must match existing JPAC destinations.');
  assert(guidanceForPath('/').title === 'Start your JPAC journey', 'Dashboard route must use dashboard guidance.');
  assert(guidanceForPath('/career-pathing').title === 'Choose your creative path', 'Career route must use Career Pathing guidance.');
  assert(guidanceForPath('/courses').title === 'Continue your course', 'My Academy route must use course guidance.');
  assert(guidanceForPath('/courses/course-1/lessons/lesson-1').title === 'Complete the lesson flow', 'Lesson route must use lesson guidance.');
  assert(guidanceForPath('/studio/tools/smart-tuner').title === 'Practice with Creator Tools', 'Studio route must use Creator Tools guidance.');
  assert(guidanceForPath('/practice-coach').title === 'Submit work for teacher review', 'Submission route must use submission guidance.');
  assert(guidanceForPath('/certificates').title === 'Build your portfolio', 'Portfolio route must use portfolio guidance.');
  assert(guidanceForPath('/coach').title === 'Use your coach guidance', 'Coach route must use coach guidance.');
  assert(pathway.view === 'pathway' && pathway.stepIndex === 0, 'Full pathway must begin at step one.');
  assert(next.stepIndex === 1, 'Next action must advance one step.');
  assert(back.stepIndex === 0, 'Back action must return one step.');
  assert(!closed.open, 'Close action must dismiss the walkthrough.');
  assert(destination === '/practice-coach', 'Take me there must use the configured existing route.');
  assert(openMarkup.includes('This guide does not award XP, complete lessons, submit assignments, or change your academic record.'), 'Safety copy must remain visible.');
  assert(openMarkup.includes('Take me there'), 'Open guide must provide explicit navigation control.');
  assert(guidedWalkthroughSteps.every((step) => step.route.startsWith('/')), 'Every guide target must be an internal route.');
  assert(['/career-pathing', '/courses', '/studio', '/practice-coach', '/certificates'].includes(guidanceForPath('/courses/course-1/lessons/lesson-1').route), 'Page guidance must use an existing safe route.');
  return 42;
}
