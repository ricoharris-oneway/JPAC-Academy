import { ApprovalQueue } from '../components/ApprovalQueue';

export function ApprovalQueuePage() {
  return <main className="page-shell"><header className="page-hero"><div><div className="eyebrow">Staff operations</div><h1 className="page-title">Approval Queue</h1><p className="muted">Read-only view of existing enrollment, payment, consent, submission, and admissions items that need attention.</p></div></header><ApprovalQueue /></main>;
}
