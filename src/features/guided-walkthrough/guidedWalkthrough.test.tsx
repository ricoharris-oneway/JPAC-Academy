import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { GuidedWalkthrough, guidedWalkthroughReducer, takeGuidedStepThere } from './GuidedWalkthrough';
import { guidanceForPath, guidedWalkthroughSteps } from './guidedWalkthroughSteps';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function runGuidedWalkthroughTests(): number {
  const closedMarkup = renderToStaticMarkup(<MemoryRouter><GuidedWalkthrough /></MemoryRouter>);
  const openMarkup = renderToStaticMarkup(<MemoryRouter><GuidedWalkthrough initialOpen /></MemoryRouter>);
  const pathway = guidedWalkthroughReducer({ open: true, view: 'page', stepIndex: 0 }, { type: 'show-pathway' });
  const next = guidedWalkthroughReducer(pathway, { type: 'next' });
  const back = guidedWalkthroughReducer(next, { type: 'back' });
  const closed = guidedWalkthroughReducer(back, { type: 'close' });
  let destination = '';
  takeGuidedStepThere(guidedWalkthroughSteps[4], (route) => { destination = route; });

  assert(closedMarkup.includes('Guide Me') && closedMarkup.includes('Need help? I can guide you.'), 'Student guide trigger must render.');
  assert(!closedMarkup.includes('role="dialog"'), 'Guide must not open automatically.');
  assert(openMarkup.includes('role="dialog"') && openMarkup.includes('Start your JPAC journey'), 'Open action must reveal page guidance.');
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
  return 20;
}
