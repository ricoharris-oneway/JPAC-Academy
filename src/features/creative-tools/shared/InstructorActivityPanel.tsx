export type InstructorActivity = {
  id: string;
  title: string;
  coachFocus: string;
  task: string;
  steps: string[];
  successTarget: string;
  nextMove: string;
  reflectionPrompt: string;
};

type Props = {
  activities: readonly InstructorActivity[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function InstructorActivityPanel({ activities, selectedId, onSelect }: Props) {
  const selected = activities.find((activity) => activity.id === selectedId) ?? activities[0];
  if (!selected) return null;

  return <section className="instructor-activity-panel" aria-labelledby="instructor-activity-title">
    <header>
      <div><span className="premium-kicker">JPAC Coach</span><h2 id="instructor-activity-title">Instructor-Led Activity</h2><p>Choose a guided activity. Your coach card updates instantly, but completion is not saved to your account.</p></div>
      <span className="local-only-chip">Local selection</span>
    </header>
    <div className="instructor-activity-tabs" role="group" aria-label="Choose an instructor-led activity">
      {activities.map((activity) => <button type="button" key={activity.id} className={activity.id === selected.id ? 'active' : ''} aria-pressed={activity.id === selected.id} onClick={() => onSelect(activity.id)}>{activity.title}</button>)}
    </div>
    <div className="instructor-coach-grid">
      <article><span>Coach Focus</span><strong>{selected.coachFocus}</strong></article>
      <article><span>Today’s Activity</span><strong>{selected.task}</strong></article>
      <article className="instructor-steps"><span>Step-by-Step Coaching</span><ol>{selected.steps.map((step) => <li key={step}>{step}</li>)}</ol></article>
      <article><span>Success Target</span><strong>{selected.successTarget}</strong></article>
      <article><span>Next Move</span><strong>{selected.nextMove}</strong></article>
      <article><span>Reflection Prompt</span><strong>{selected.reflectionPrompt}</strong></article>
    </div>
  </section>;
}
