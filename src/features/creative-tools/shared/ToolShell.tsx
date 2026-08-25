import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LocalOnlyNotice } from './LocalOnlyNotice';
import { WorkflowGuide } from './WorkflowGuide';

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
    <WorkflowGuide toolTitle={title} />
    {children}
  </main>;
}
