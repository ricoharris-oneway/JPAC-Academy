import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyConsentStatus, type ConsentStatus } from '../lib/consentLedger';

export function ConsentReminder() {
  const [status, setStatus] = useState<ConsentStatus | 'missing' | null>(null);
  useEffect(() => { let active = true; void getMyConsentStatus().then((record) => { if (active) setStatus(record?.consent_status || 'missing'); }).catch(() => { if (active) setStatus(null); }); return () => { active = false; }; }, []);
  if (!status || status === 'complete') return null;
  const message = status === 'revoked' ? 'Your consent record was revoked. Please review and submit updated permissions.' : status === 'needs_review' ? 'JPAC staff marked your consent record for review. Please check your information.' : 'Required policies and consent are not complete yet.';
  return <div className="consent-reminder" role="status"><div><strong>Policies &amp; consent needed</strong><span>{message}</span></div><Link className="button button-secondary" to="/account/consents">Review consents</Link></div>;
}
