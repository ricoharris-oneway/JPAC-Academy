import { useState } from 'react';

export function ExtraCreditPanel({ summary }: { summary: string }) {
  const [message, setMessage] = useState('');
  async function copy() { try { await navigator.clipboard.writeText(summary); setMessage('Extra-credit summary copied.'); } catch { setMessage('Copy was blocked by this browser.'); } }
  return <section className="extra-credit-panel"><div><span className="premium-kicker">Teacher-reviewed pathway</span><h2>Prepare for Extra Credit</h2><p>Submit this to your teacher when extra credit submission opens.</p><small>This has not been submitted. It does not award XP, grades, mastery, progress, or certificates.</small></div><button type="button" className="button button-secondary" onClick={() => void copy()}>Copy project summary</button>{message ? <span role="status">{message}</span> : null}</section>;
}
