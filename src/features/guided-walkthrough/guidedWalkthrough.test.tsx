import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { GuidedWalkthrough, guidedWalkthroughReducer, takeGuidedStepThere } from './GuidedWalkthrough';
import { guidedWalkthroughSteps } from './guidedWalkthroughSteps';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function runGuidedWalkthroughTests(): number {
  const closedMarkup = renderToStaticMarkup(<MemoryRouter><GuidedWalkthrough /></MemoryRouter>);
  const openMarkup = renderToStaticMarkup(<MemoryRouter><GuidedWalkthrough initialOpen /></MemoryRouter>);
  const opened = guidedWalkthroughReducer({ open: false, stepIndex: 3 }, { type: 'open' });
  const next = guidedWalkthroughReducer(opened, { type: 'next' });
  const back = guidedWalkthroughReducer(next, { type: 'back' });
  const closed = guidedWalkthroughReducer(back, { type: 'close' });
  let destination = '';
  takeGuidedStepThere(guidedWalkthroughSteps[4], (route) => { destination = route; });

  assert(closedMarkup.includes('Guide Me') && closedMarkup.includes('Need help? I can guide you.'), 'Student guide trigger must render.');
  assert(!closedMarkup.includes('role="dialog"'), 'Guide must not open automatically.');
  assert(openMarkup.includes('role="dialog"') && openMarkup.includes('Choose your creative career path'), 'Open action must reveal the first guided step.');
  assert(opened.open && opened.stepIndex === 0, 'Open action must reset the walkthrough to step one.');
  assert(next.stepIndex === 1, 'Next action must advance one step.');
  assert(back.stepIndex === 0, 'Back action must return one step.');
  assert(!closed.open, 'Close action must dismiss the walkthrough.');
  assert(destination === '/practice-coach', 'Take me there must use the configured existing route.');
  assert(openMarkup.includes('This guide does not award XP, complete lessons, submit assignments, or change your academic record.'), 'Safety copy must remain visible.');
  assert(openMarkup.includes('Take me there'), 'Open guide must provide explicit navigation control.');
  assert(guidedWalkthroughSteps.every((step) => step.route.startsWith('/')), 'Every guide target must be an internal route.');
  return 11;
}
