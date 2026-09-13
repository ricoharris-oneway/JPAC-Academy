import { useState } from 'react';
import { Link } from 'react-router-dom';
import { careerMoveForDate, careerPaths, careerPracticeTools, type CareerCategory } from '../features/career-pathing/careerPathing';
import { CareerCatalog, CareerFilters, CareerTools, categoryLabel, focusCareerDetail } from '../features/career-pathing/CareerCatalog';
import '../styles/career-pathing.css';

const journey = [
  ['Discover', 'Notice what inspires you. Explore a direction that feels worth trying.'],
  ['Build Skills', 'Connect your goal to published lessons you are already authorized to access.'],
  ['Practice', 'Try a focused exercise with a recommended Creator Tool.'],
  ['Create Portfolio Evidence', 'Choose original work that shows a creative choice and your growth.'],
  ['Teacher Review', 'Ask for feedback, reflect, and make one thoughtful revision.'],
  ['Showcase / Next Opportunity', 'Discuss an appropriate way to share your work and a possible next step with your teacher.'],
];

export function CareerPathingPage(): JSX.Element {
  const [category, setCategory] = useState<'all' | CareerCategory>('all');
  const [selectedPathId, setSelectedPathId] = useState(careerPaths[0].id);
  const [paused, setPaused] = useState(false);
  const visiblePaths = careerPaths.filter(path => category === 'all' || path.category === category);
  const selectedPath = careerPaths.find(path => path.id === selectedPathId) ?? careerPaths[0];
  return <div className={`career-pathing-page career-experience-v2${paused ? ' career-motion-paused' : ''}`}>
    <header className="career-pathing-hero">
      <div className="career-hero-copy"><span>JPAC Academy · Your next chapter</span><h1>Choose Your<br/><em>Creative Future</em></h1><p>One spark. Many possibilities. Explore {careerPaths.length} creative paths and turn curiosity into your next purposeful practice.</p><div className="career-pathing-actions"><a className="button button-primary" href="#career-path-choice-title">Explore the paths ↓</a><button className="button button-secondary" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Resume motion' : 'Pause motion'}</button></div></div>
      <div className="career-orbit" aria-hidden="true"><div className="career-orbit-ring"/><div className="career-orbit-ring inner"/><div className="career-orbit-core"><b>✦</b><strong>Your potential.<br/>Your direction.</strong></div><i className="career-float one">♬</i><i className="career-float two">◐</i><i className="career-float three">✎</i></div>
      <article className="career-daily-move"><span>Today’s Career Move</span><strong>{careerMoveForDate(new Date())}</strong></article>
    </header>
    <section className="career-path-choice" aria-labelledby="career-path-choice-title">
      <div><span>14 paths · 5 creative directions</span><h2 id="career-path-choice-title">Find a future that sounds like you</h2><p>Every path is here to explore, including those still being developed. Selecting one only changes this page.</p></div>
      <CareerFilters category={category} onChange={setCategory}/>
      <p className="career-results-count" aria-live="polite">Showing {visiblePaths.length} of {careerPaths.length} career paths</p>
      <CareerCatalog paths={visiblePaths} selectedId={selectedPathId} detailId="career-selected-path" onSelect={id => { setSelectedPathId(id); focusCareerDetail('career-selected-path'); }}/>
    </section>
    <section className="career-path-roadmap" id="career-selected-path" tabIndex={-1} aria-labelledby="career-roadmap-title">
      <div><span>Your creative roadmap</span><h2 id="career-roadmap-title">{selectedPath.icon} {selectedPath.title}</h2><p className="career-detail-meta">{categoryLabel(selectedPath.category)} · {selectedPath.status}</p><p>{selectedPath.description}</p><strong>{selectedPath.outcome}</strong><h3>Connected JPAC programs</h3><div className="career-program-list">{selectedPath.connectedPrograms.map(program => <span key={program}>{program}</span>)}</div><p className="career-roadmap-note">An exploration journey—not a record of completed steps. Your teacher can help you choose a starting point.</p></div>
      <ol className="career-journey-rail">{journey.map(([title, description], index) => <li key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{title}</strong><small>{description}</small></div></li>)}</ol>
    </section>
    <section className="career-tools-section"><div className="section-head"><div><span>Recommended for {selectedPath.title}</span><h2>Your tools for the next step</h2></div><Link to="/studio">View all Creator Tools →</Link></div><CareerTools path={selectedPath}/></section>
    <section className="career-all-tools"><h2>Every tool connects to a creative future</h2><div>{careerPracticeTools.map(tool => <span key={tool.slug}>{tool.icon} {tool.title} · {tool.skills}</span>)}</div></section>
    <aside className="career-safety-note"><div><strong>Career guidance only</strong><p>Career guidance helps guide practice. It does not change enrollment, payment, grades, XP, or academic records.</p></div><Link className="button button-secondary" to="/coach">Ask JPAC Coach for your next step</Link></aside>
  </div>;
}
