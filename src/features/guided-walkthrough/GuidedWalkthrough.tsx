import { useReducer } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { guidanceForPath, guidedWalkthroughSteps, type GuidedWalkthroughStep } from './guidedWalkthroughSteps';
import '../../styles/guided-walkthrough.css';

export type GuidedWalkthroughState = { open: boolean; view: 'page' | 'pathway'; stepIndex: number };
export type GuidedWalkthroughAction = { type: 'open' | 'close' | 'show-pathway' | 'show-page' | 'next' | 'back' };

export function guidedWalkthroughReducer(
  state: GuidedWalkthroughState,
  action: GuidedWalkthroughAction,
): GuidedWalkthroughState {
  if (action.type === 'open') return { open: true, view: 'page', stepIndex: 0 };
  if (action.type === 'close') return { ...state, open: false };
  if (action.type === 'show-pathway') return { ...state, view: 'pathway', stepIndex: 0 };
  if (action.type === 'show-page') return { ...state, view: 'page' };
  if (action.type === 'next') return { ...state, stepIndex: Math.min(state.stepIndex + 1, guidedWalkthroughSteps.length - 1) };
  return { ...state, stepIndex: Math.max(state.stepIndex - 1, 0) };
}

export function takeGuidedStepThere(step: GuidedWalkthroughStep, navigate: (route: string) => void): void {
  navigate(step.route);
}

export function GuidedWalkthrough({ initialOpen = false }: { initialOpen?: boolean } = {}): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, dispatch] = useReducer(guidedWalkthroughReducer, { open: initialOpen, view: 'page', stepIndex: 0 });
  const page = guidanceForPath(location.pathname);
  const step = state.view === 'page' ? page : guidedWalkthroughSteps[state.stepIndex];

  function takeMeThere(): void {
    dispatch({ type: 'close' });
    takeGuidedStepThere(step, navigate);
  }

  return <div className="guided-walkthrough">
    <button className="guided-walkthrough-trigger" type="button" onClick={() => dispatch({ type: 'open' })}>
      <span aria-hidden="true">🧭</span><span><strong>Guide Me</strong><small>Need help? I can guide you.</small></span>
    </button>
    {state.open ? <div className="guided-walkthrough-backdrop" role="presentation">
      <section className="guided-walkthrough-dialog" role="dialog" aria-modal="true" aria-labelledby="guided-walkthrough-title" aria-describedby="guided-walkthrough-message">
        <button className="guided-walkthrough-close" type="button" aria-label="Close guide" onClick={() => dispatch({ type: 'close' })}>×</button>
        <span className="guided-walkthrough-kicker">{state.view === 'page' ? 'You are here · Page guidance' : `Full pathway · Step ${state.stepIndex + 1} of ${guidedWalkthroughSteps.length}`}</span>
        <h2 id="guided-walkthrough-title">{step.title}</h2>
        <p id="guided-walkthrough-message">{step.message}</p>
        <p className="guided-walkthrough-safety">This guide does not award XP, complete lessons, submit assignments, or change your academic record.</p>
        <div className="guided-walkthrough-actions">
          {state.view === 'pathway' ? <>
            <button className="button button-secondary" type="button" disabled={state.stepIndex === 0} onClick={() => dispatch({ type: 'back' })}>Back</button>
            <button className="button button-secondary" type="button" disabled={state.stepIndex === guidedWalkthroughSteps.length - 1} onClick={() => dispatch({ type: 'next' })}>Next</button>
          </> : <button className="button button-secondary" type="button" onClick={() => dispatch({ type: 'show-pathway' })}>View full pathway</button>}
          <button className="button button-primary" type="button" onClick={takeMeThere}>Take me there · {step.action}</button>
          {state.view === 'page' ? <button className="button button-secondary guided-walkthrough-secondary-action" type="button" onClick={() => { dispatch({ type: 'close' }); navigate(page.secondaryRoute); }}>{page.secondaryAction}</button> : <button className="guided-walkthrough-text-button" type="button" onClick={() => dispatch({ type: 'show-page' })}>Back to page guidance</button>}
          <button className="guided-walkthrough-text-button" type="button" onClick={() => dispatch({ type: 'close' })}>Close</button>
        </div>
      </section>
    </div> : null}
  </div>;
}
