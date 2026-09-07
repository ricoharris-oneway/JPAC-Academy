import { useEffect, useState } from 'react';
import { getMyPaymentLedger, paymentMethodLabels, paymentStatusLabels, purchaseTypeLabels, type PaymentLedgerEntry } from '../lib/paymentLedger';
import '../styles/payment-ledger.css';

function money(entry: PaymentLedgerEntry) {
  if (entry.amount === null) return 'Not recorded';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: entry.currency }).format(entry.amount);
}

export function MyPaymentsPage() {
  const [entries, setEntries] = useState<PaymentLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { void getMyPaymentLedger().then(setEntries).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load payment records.')).finally(() => setLoading(false)); }, []);

  return <div className="payment-ledger-page">
    <header className="page-hero"><div><div className="eyebrow">Account</div><h1 className="page-title">My Payments &amp; Course Access</h1><p className="muted">This page shows your JPAC Academy course access and payment records. For questions about a payment or course access, contact JPAC staff.</p></div></header>
    {error && <div className="admin-message error" role="alert">{error}</div>}
    {loading ? <section className="card card-pad"><p className="muted">Loading payment records…</p></section> : entries.length === 0 ? <section className="card card-pad"><h2>No payment records yet</h2><p className="muted">JPAC staff can help if you expected a payment or course access record here.</p></section> : <div className="ledger-list">{entries.map((entry) => <article className="card card-pad ledger-entry" key={entry.id}>
      <div className="ledger-entry-heading"><div><div className="eyebrow">{purchaseTypeLabels[entry.purchase_type]}</div><h2>{entry.course_title || 'Course not linked'}</h2></div><span className={`ledger-status status-${entry.payment_status}`}>{paymentStatusLabels[entry.payment_status]}</span></div>
      <dl className="ledger-details"><div><dt>Payment method</dt><dd>{paymentMethodLabels[entry.payment_method]}</dd></div><div><dt>Amount</dt><dd>{money(entry)}</dd></div><div><dt>Payment date</dt><dd>{entry.payment_date}</dd></div><div><dt>Enrollment status</dt><dd>{entry.enrollment_status || 'Not linked'}</dd></div><div><dt>Access starts</dt><dd>{entry.access_start_date || 'Not recorded'}</dd></div><div><dt>Access ends</dt><dd>{entry.access_end_date || 'No end date'}</dd></div>{entry.reference_number && <div><dt>Reference</dt><dd>{entry.reference_number}</dd></div>}</dl>
      {entry.student_visible_note && <p className="ledger-note">{entry.student_visible_note}</p>}
    </article>)}</div>}
  </div>;
}
