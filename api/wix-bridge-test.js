import {
  createServerSupabase,
  json,
  parseBody,
  requireIntegrationSecret,
} from './_lib/integration.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  if (!requireIntegrationSecret(req)) {
    return json(res, 401, { ok: false, error: 'Unauthorized' });
  }

  let supabase;
  try {
    supabase = createServerSupabase();
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Server configuration is incomplete',
    });
  }

  const body = parseBody(req);
  const eventId = String(body.eventId || `wix-bridge-test-${Date.now()}`);
  const payload = {
    source: 'wix-classic-velo',
    site: String(body.site || 'jmonespac.org'),
    environment: String(body.environment || 'production'),
    sentAt: body.sentAt || new Date().toISOString(),
  };

  const { error } = await supabase.from('integration_events').upsert(
    {
      provider: 'wix',
      external_event_id: eventId,
      event_type: 'bridge_connection_test',
      processing_status: 'processed',
      payload,
      processed_at: new Date().toISOString(),
    },
    { onConflict: 'provider,external_event_id' },
  );

  if (error) {
    return json(res, 500, { ok: false, error: error.message });
  }

  return json(res, 200, {
    ok: true,
    status: 'connected',
    eventId,
    receivedAt: new Date().toISOString(),
  });
}
