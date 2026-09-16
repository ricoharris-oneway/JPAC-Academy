import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LocalOnlyNotice } from './LocalOnlyNotice';
import { WorkflowGuide } from './WorkflowGuide';
import { JPACCoachPanel } from '../../ai-instructor/components/JPACCoachPanel';
import { buildToolCoachContext } from '../../ai-instructor/contextBuilder';
import { getToolActivities } from '../creativeToolRegistry';

export function ToolShell({ title, eyebrow, description, children }: { title: string; eyebrow: string; description: string; children: ReactNode }) {
  const activities = getToolActivities(title);
  return <main className="premium-tool-page">
    <header className="premium-tool-hero">
      <div className="premium-tool-hero-copy">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
        <span className="premium-tool-hero-badge">Local practice studio</span>
      </div>
      <div className="premium-tool-hero-mark" aria-hidden="true"><span>JPAC</span><strong>✦</strong></div>
      <Link className="button button-secondary" to="/studio">Back to Creative Studio</Link>
    </header>
    <LocalOnlyNotice />
    <JPACCoachPanel context={buildToolCoachContext(title, description)} compact />
    <WorkflowGuide toolTitle={title} />
    <section className="tool-activities" aria-labelledby="tool-activities-title">
      <div className="tool-activities-heading"><div><div className="eyebrow">Free member practice prompts</div><h2 id="tool-activities-title">20 ways to explore {title}</h2></div><span className="tool-activities-count">20 prompts</span></div>
      <p className="muted">These lightweight prompts are local engagement only. They never grant course credit, XP, mastery, enrollment, or certificates.</p>
      <ol>{activities.map((activity) => <li key={activity.id}><strong>{activity.title}</strong><span>{activity.prompt}</span></li>)}</ol>
    </section>
    {children}
  </main>;
}
