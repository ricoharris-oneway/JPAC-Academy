export type RubricCriterion = { name: string; weight: number | null };

function criterion(value: unknown, fallbackName = ''): RubricCriterion | null {
  if (typeof value === 'string') return { name: value.trim(), weight: null };
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const name = String(row.name ?? row.title ?? row.criterion ?? fallbackName).trim();
  const rawWeight = row.weight ?? row.points ?? row.percentage;
  const weight = typeof rawWeight === 'number' && Number.isFinite(rawWeight) ? rawWeight : typeof rawWeight === 'string' && rawWeight.trim() !== '' && Number.isFinite(Number(rawWeight)) ? Number(rawWeight) : null;
  return name ? { name, weight } : null;
}

export function normalizeRubric(value: unknown): RubricCriterion[] {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? (value as { criteria?: unknown }).criteria ?? value : value;
  if (Array.isArray(source)) return source.map(item => criterion(item)).filter((item): item is RubricCriterion => Boolean(item));
  if (source && typeof source === 'object') return Object.entries(source).map(([name, weight]) => criterion({ name, weight }, name)).filter((item): item is RubricCriterion => Boolean(item));
  return [];
}

function evidenceKind(mediaType: string | null, mediaName: string | null, storagePath: string | null): 'audio' | 'video' | 'file' {
  const hint = `${mediaType || ''} ${mediaName || ''} ${storagePath || ''}`.toLowerCase();
  if (hint.includes('audio') || /\.(mp3|wav|m4a|aac|ogg)(?:\?|$)/.test(hint)) return 'audio';
  if (hint.includes('video') || /\.(mp4|webm|mov|m4v)(?:\?|$)/.test(hint)) return 'video';
  return 'file';
}

export function SubmissionReviewEvidence({ signedUrl, mediaName, mediaType, storagePath, rubric }: { signedUrl: string | null; mediaName: string | null; mediaType: string | null; storagePath: string | null; rubric: unknown }) {
  const criteria = normalizeRubric(rubric);
  const kind = evidenceKind(mediaType, mediaName, storagePath);
  return <div className="submission-review-detail">
    <section className="submission-evidence">
      <div className="eyebrow">Guided assessment workflow</div>
      <h4>Review this submission in four steps</h4>
      <ol style={{display:'grid',gap:8,paddingLeft:20,margin:'10px 0 18px'}}>
        <li><strong>Review the evidence.</strong> Play the student submission completely.</li>
        <li><strong>Compare it to the rubric.</strong> Use the mastery criteria shown beside the evidence.</li>
        <li><strong>Enter a score and feedback.</strong> Give the student a clear strength and a specific next step.</li>
        <li><strong>Complete the review.</strong> Choose <em>Approve</em> if mastery is met, or <em>Request revision</em> if another attempt is required.</li>
      </ol>
      <h4>Private submission evidence</h4>
      {mediaName && <p><strong>File:</strong> {mediaName}</p>}
      {signedUrl ? <>{kind === 'audio' && <audio controls preload="metadata" src={signedUrl} />}{kind === 'video' && <video controls preload="metadata" src={signedUrl} />}{kind === 'file' && <p>Evidence cannot be previewed here. Open it with the secure link below.</p>}<a className="button button-secondary" href={signedUrl} target="_blank" rel="noreferrer">Open secure evidence</a><small>This short-lived link is available only through the signed-in staff review.</small></> : <p>Evidence preview is unavailable. Refresh the classroom to generate a new secure evidence link.</p>}
    </section>
    <section className="submission-rubric"><h4>Rubric / mastery criteria</h4>{criteria.length ? <ul>{criteria.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name}</span>{item.weight !== null && <strong>{item.weight}%</strong>}</li>)}</ul> : <p>No rubric criteria are configured for this activity.</p>}</section>
  </div>;
}
