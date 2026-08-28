import { renderToStaticMarkup } from 'react-dom/server';
import {
  AIInstructorPreviewDebugPage,
  LIVE_AI_PREVIEW_DEBUG_ROUTE,
  runLiveAIPreviewDiagnostic,
} from '../../../pages/AIInstructorPreviewDebugPage';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export async function runLiveAIPreviewDebugTests(): Promise<number> {
  let calls = 0;
  const disabled = renderToStaticMarkup(<AIInstructorPreviewDebugPage
    liveAIEnabled={false}
    buildMode="production"
    runDiagnostic={async () => {
      calls += 1;
      return { requestSent: false, responseType: 'fallback', fallbackReason: 'ai_disabled', fallbackTitle: 'Phase 1 JPAC Coach is active', errorLabel: null };
    }}
  />);
  const enabled = renderToStaticMarkup(<AIInstructorPreviewDebugPage liveAIEnabled buildMode="production" />);
  assert(LIVE_AI_PREVIEW_DEBUG_ROUTE === '/ai-instructor-preview-debug', 'Diagnostic must use the direct internal route.');
  assert(disabled.includes('Client flag detected</dt><dd>no'), 'Diagnostic must show the client flag no state.');
  assert(disabled.includes('Live AI panel should render</dt><dd>no'), 'Disabled flag must not claim the panel should render.');
  assert(enabled.includes('Client flag detected</dt><dd>yes'), 'Diagnostic must show the client flag yes state.');
  assert(enabled.includes('Test lesson_explanation API fallback'), 'Diagnostic must expose only the manual fallback test button.');
  assert(calls === 0, 'Rendering the diagnostic route must not call the API.');
  assert(!disabled.includes('access_token') && !disabled.includes('API_KEY'), 'Diagnostic markup must not expose tokens or API keys.');

  let capturedRequest: unknown;
  const status = await runLiveAIPreviewDiagnostic('test-token', async (request) => {
    capturedRequest = request;
    return {
      usedLiveAI: false,
      fallbackRequired: true,
      reason: 'provider_config_missing',
      response: {
        ok: true,
        schemaVersion: 'phase-2a-v1',
        source: 'phase_1_deterministic_fallback',
        mode: 'lesson_explanation',
        liveAIEnabled: false,
        advisoryOnly: true,
        teacherReviewRequired: true,
        completenessCheckOnly: true,
        labels: ['JPAC Coach guidance', 'Teacher review required', 'Completeness check only', 'This does not award XP or update progress'],
        headline: 'Phase 1 JPAC Coach is active',
        guidance: 'not displayed',
        nextStep: 'not displayed',
        fallbackReason: 'provider_config_missing',
      },
    };
  });
  assert(JSON.stringify(capturedRequest) === JSON.stringify({ mode: 'lesson_explanation' }), 'Manual test must send lesson_explanation only.');
  assert(status.requestSent && status.responseType === 'fallback', 'Manual test must report a sent fallback request safely.');
  assert(status.fallbackReason === 'provider_config_missing', 'Safe fallback reason must be available to the diagnostic.');
  assert(status.fallbackTitle === 'Phase 1 JPAC Coach is active', 'Only the deterministic fallback title may be summarized.');
  assert(!JSON.stringify(status).includes('not displayed'), 'Diagnostic status must omit full guidance and next-step content.');
  return 12;
}
