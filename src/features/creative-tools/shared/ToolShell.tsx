import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LocalOnlyNotice } from './LocalOnlyNotice';
import { WorkflowGuide } from './WorkflowGuide';
import { JPACCoachPanel } from '../../ai-instructor/components/JPACCoachPanel';
import { buildToolCoachContext } from '../../ai-instructor/contextBuilder';

export function ToolShell({ title, eyebrow, description, children }: { title: string; eyebrow: string; description: string; children: ReactNode }) {
  return <main className="premium-tool-page">
    <header className="premium-tool-hero">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <Link className="button button-secondary" to="/studio">Back to Creative Studio</Link>
    </header>
    <LocalOnlyNotice />
    <JPACCoachPanel context={buildToolCoachContext(title, description)} compact />
    <WorkflowGuide toolTitle={title} />
    {children}
  </main>;
}
