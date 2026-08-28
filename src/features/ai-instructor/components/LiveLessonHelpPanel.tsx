import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { createLessonExplanationRequest, isLiveAIDebugRequested, isLiveAIRequested, requestLiveCoach, type LiveCoachAdvisoryResponse } from '../liveCoachClient';
import '../../../styles/live-lesson-help.css';

export function LiveAIClientFlagDiagnostic({
  debugEnabled = isLiveAIDebugRequested(),
  liveAIEnabled = isLiveAIRequested(),
  buildMode = import.meta.env.MODE,
}: {
  debugEnabled?: boolean;
  liveAIEnabled?: boolean;
  buildMode?: string;
} = {}): JSX.Element | null {
  if (!debugEnabled) return null;

  const detected = liveAIEnabled ? 'yes' : 'no';
  return <aside className="live-ai-client-diagnostic" aria-label="Live AI client flag diagnostic">
    <strong>Live AI client flag diagnostic</strong>
    <dl>
      <div><dt>Live AI client flag detected</dt><dd>{detected}</dd></div>
      <div><dt>Expected flag key</dt><dd>VITE_JPAC_LIVE_AI_ENABLED</dd></div>
      <div><dt>Expected value</dt><dd>true</dd></div>
      <div><dt>Panel should render</dt><dd>{detected}</dd></div>
      <div><dt>Current build mode</dt><dd>{buildMode || 'unknown'}</dd></div>
    </dl>
    {!liveAIEnabled ? <p>The client bundle does not see VITE_JPAC_LIVE_AI_ENABLED=true. Redeploy Preview after setting the variable.</p> : null}
  </aside>;
}

export function LiveLessonHelpPanel({ enabled = isLiveAIRequested() }: { enabled?: boolean } = {}): JSX.Element | null {
  const [response, setResponse] = useState<LiveCoachAdvisoryResponse | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!enabled) return null;

  async function askForExplanation(): Promise<void> {
    setLoading(true);
    setMessage('');
    setResponse(null);
    if (!supabase) {
      setLoading(false);
      setMessage('Lesson help is unavailable right now. Continue with JPAC Coach guidance.');
      return;
    }
    try {
      const { data, error } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (error || !accessToken) {
        setMessage('Sign in again to request lesson help. JPAC Coach guidance is still available.');
        return;
      }
      const result = await requestLiveCoach(createLessonExplanationRequest(), { accessToken });
      if (result.response) {
        setResponse(result.response);
        return;
      }
      setMessage('Live lesson help is unavailable. Continue with the JPAC Coach guidance above.');
    } catch {
      setMessage('Live lesson help is unavailable. Continue with the JPAC Coach guidance above.');
    } finally {
      setLoading(false);
    }
  }

  return <section className="live-lesson-help" aria-labelledby="live-lesson-help-title">
    <div className="live-lesson-help-heading"><div><span>Optional lesson support</span><h2 id="live-lesson-help-title">Live AI Lesson Help</h2><p>Ask for one advisory lesson explanation when you want another way to understand the material.</p></div><button className="button button-secondary" type="button" disabled={loading} onClick={() => void askForExplanation()}>{loading ? 'Preparing explanation…' : 'Ask for lesson explanation'}</button></div>
    <div className="live-lesson-help-safety" aria-label="Live AI lesson help boundaries"><strong>Advisory guidance only</strong><strong>Teacher review required</strong><strong>This does not award XP or update progress</strong></div>
    {loading ? <p role="status">Requesting safe lesson guidance…</p> : null}
    {message ? <p className="live-lesson-help-message" role="status">{message}</p> : null}
    {response ? <article className="live-lesson-help-response" aria-live="polite"><span>{response.liveAIEnabled ? 'Live advisory response' : 'Safe JPAC Coach fallback'}</span><h3>{response.headline}</h3><p>{response.guidance}</p><strong>Next step</strong><p>{response.nextStep}</p></article> : null}
  </section>;
}
