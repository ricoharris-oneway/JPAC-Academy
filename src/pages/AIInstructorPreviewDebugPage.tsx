import { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  createLessonExplanationRequest,
  isLiveAIRequested,
  requestLiveCoach,
  type LiveCoachClientResult,
  type LiveCoachRequest,
} from '../features/ai-instructor/liveCoachClient';
import '../styles/ai-instructor-preview-debug.css';

export const LIVE_AI_PREVIEW_DEBUG_ROUTE = '/ai-instructor-preview-debug' as const;

type DiagnosticRequester = (
  request: LiveCoachRequest,
  options: { accessToken?: string },
) => Promise<LiveCoachClientResult>;

export type LiveAIDiagnosticStatus = {
  requestSent: boolean;
  responseType: 'live response' | 'fallback';
  fallbackReason: string | null;
  fallbackTitle: string | null;
  errorLabel: string | null;
};

export async function runLiveAIPreviewDiagnostic(
  accessToken?: string,
  requester: DiagnosticRequester = requestLiveCoach,
): Promise<LiveAIDiagnosticStatus> {
  const result = await requester(createLessonExplanationRequest(), { accessToken });
  const requestSent = result.reason !== 'disabled' && result.reason !== 'authentication_required';
  if (result.usedLiveAI) {
    return { requestSent, responseType: 'live response', fallbackReason: null, fallbackTitle: null, errorLabel: null };
  }
  const fallbackTitle = result.response?.source === 'phase_1_deterministic_fallback'
    ? result.response.headline
    : null;
  const errorLabel = ['authentication_required', 'server_unavailable', 'invalid_response'].includes(result.reason)
    ? result.reason
    : null;
  return {
    requestSent,
    responseType: 'fallback',
    fallbackReason: result.response?.fallbackReason ?? result.reason,
    fallbackTitle,
    errorLabel,
  };
}

async function currentAccessToken(): Promise<string | undefined> {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
  return data.session?.access_token;
}

export function AIInstructorPreviewDebugPage({
  liveAIEnabled = isLiveAIRequested(),
  buildMode = import.meta.env.MODE,
  runDiagnostic = async () => runLiveAIPreviewDiagnostic(await currentAccessToken()),
}: {
  liveAIEnabled?: boolean;
  buildMode?: string;
  runDiagnostic?: () => Promise<LiveAIDiagnosticStatus>;
} = {}): JSX.Element {
  const [status, setStatus] = useState<LiveAIDiagnosticStatus | null>(null);
  const [busy, setBusy] = useState(false);

  async function testFallback(): Promise<void> {
    setBusy(true);
    setStatus(null);
    try {
      setStatus(await runDiagnostic());
    } catch {
      setStatus({ requestSent: false, responseType: 'fallback', fallbackReason: null, fallbackTitle: null, errorLabel: 'client_error' });
    } finally {
      setBusy(false);
    }
  }

  const detected = liveAIEnabled ? 'yes' : 'no';
  return <main className="live-ai-preview-debug">
    <section className="card card-pad" aria-labelledby="live-ai-preview-debug-title">
      <span className="eyebrow">Internal Preview validation only</span>
      <h1 id="live-ai-preview-debug-title">Live AI Preview Diagnostic</h1>
      <dl>
        <div><dt>Current route</dt><dd>{LIVE_AI_PREVIEW_DEBUG_ROUTE}</dd></div>
        <div><dt>Build mode</dt><dd>{buildMode || 'unknown'}</dd></div>
        <div><dt>Client flag key</dt><dd>VITE_JPAC_LIVE_AI_ENABLED</dd></div>
        <div><dt>Client flag detected</dt><dd>{detected}</dd></div>
        <div><dt>Expected value</dt><dd>true</dd></div>
        <div><dt>Live AI panel should render</dt><dd>{detected}</dd></div>
      </dl>
      <p className="live-ai-preview-debug-reminder">No secrets shown. No prompts, provider responses, tokens, student data, or lesson content are displayed.</p>
      <button className="button button-secondary" type="button" disabled={busy} onClick={() => void testFallback()}>
        {busy ? 'Testing safe fallback…' : 'Test lesson_explanation API fallback'}
      </button>
      {status ? <div className="live-ai-preview-debug-status" role="status">
        <strong>Safe diagnostic result</strong>
        <p>Request sent: {status.requestSent ? 'yes' : 'no'}</p>
        <p>Response type: {status.responseType}</p>
        {status.fallbackReason ? <p>Fallback reason: {status.fallbackReason}</p> : null}
        {status.fallbackTitle ? <p>Fallback title: {status.fallbackTitle}</p> : null}
        {status.errorLabel ? <p>HTTP/client error: {status.errorLabel}</p> : null}
      </div> : null}
    </section>
  </main>;
}
