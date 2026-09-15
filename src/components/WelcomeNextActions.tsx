import { useState } from 'react';
import { Link } from 'react-router-dom';
import { welcomeEmail } from '../lib/welcomeEmail';

export function WelcomeNextActions({ firstName }: { firstName: string }) {
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(welcomeEmail(firstName));
      setMessage('Welcome email copied. Paste it into your email app to send.');
    } catch { setMessage('Clipboard is unavailable. Select and copy the welcome email below.'); }
  }
  return <section className="card card-pad"><div className="eyebrow">Student record created · Next actions</div><h2>Welcome {firstName} to JPAC</h2><p>The admissions record does not grant course access. The member can create a free account or use their existing login; staff verifies enrollment separately.</p><div className="welcome-actions"><button className="button button-primary" onClick={() => void copy()}>Copy Welcome Email</button><Link className="button button-secondary" to="/staff/course-enrollment">Continue to Enrollment Manager</Link><Link className="button button-secondary" to="/staff/course-enrollment#payment-ledger">Record payment</Link><Link className="button button-secondary" to="/legal/consent">Review consent instructions</Link></div>{message && <p role="status">{message}</p>}<details><summary>Preview welcome email</summary><textarea className="welcome-copy" aria-label="Welcome email ready to copy" readOnly value={welcomeEmail(firstName)} /></details></section>;
}
