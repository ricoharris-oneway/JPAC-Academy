// Reference file for Wix Classic Velo.
// Create this as Backend > jpac-thin-bridge.web.js in Wix.
// Keep all business logic in JPAC Academy (Vercel + Supabase).

import { fetch } from 'wix-fetch';
import { elevate } from 'wix-auth';
import { secrets } from 'wix-secrets-backend.v2';

const getSecretValue = elevate(secrets.getSecretValue);
const JPAC_API_BASE = 'https://jpac-academy.vercel.app';

async function getSyncSecret() {
  const result = await getSecretValue('JPAC_WIX_SYNC_SECRET');
  if (!result?.value) {
    throw new Error('JPAC_WIX_SYNC_SECRET is missing from Wix Secrets Manager.');
  }
  return result.value;
}

async function postToJpac(path, payload) {
  const secret = await getSyncSecret();
  const response = await fetch(`${JPAC_API_BASE}${path}`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'x-jpac-sync-secret': secret,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { ok: false, error: text || `HTTP ${response.status}` };
  }

  if (!response.ok || !body.ok) {
    throw new Error(body.error || `JPAC API request failed with HTTP ${response.status}`);
  }

  return body;
}

export async function testJpacConnection() {
  return postToJpac('/api/wix-bridge-test', {
    eventId: `wix-bridge-test-${Date.now()}`,
    site: 'jmonespac.org',
    environment: 'production',
    sentAt: new Date().toISOString(),
  });
}

export async function syncJpacEvent(payload) {
  return postToJpac('/api/wix-sync', payload);
}
