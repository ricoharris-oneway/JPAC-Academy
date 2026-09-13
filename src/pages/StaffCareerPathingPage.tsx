import { useState } from 'react';
import { Link } from 'react-router-dom';
import { careerCategories, careerPaths, type CareerCategory } from '../features/career-pathing/careerPathing';
import { CareerCatalog, CareerFilters, CareerTools, categoryLabel, focusCareerDetail } from '../features/career-pathing/CareerCatalog';
import { advisingForCareerPath } from '../features/career-pathing/careerAdvising';
import '../styles/career-pathing.css';

export function StaffCareerPathingPage(): JSX.Element {
  const [category, setCategory] = useState<'all' | CareerCategory>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(careerPaths[0].id);
  const query = search.trim().toLocaleLowerCase();
  const visiblePaths = careerPaths.filter(path => (category === 'all' || path.category === category) && [path.title, path.outcome, ...path.connectedPrograms].some(value => value.toLocaleLowerCase().includes(query)));
  const selectedPath = careerPaths.find(path => path.id === selectedId) ?? careerPaths[0];
  const guidance = advisingForCareerPath(selectedPath);
  return <div className="career-pathing-page career-experience-v2 career-staff-page">
    <header className="career-staff-hero"><span className="career-eyebrow">JPAC · Staff advising workspace</span><h1>Creative futures.<br/><em>Thoughtful guidance.</em></h1><p>Explore the full career catalog and make the next conversation meaningful.</p><span className="career-readonly-badge">Read-only catalog · {careerPaths.length} paths</span></header>
    <aside className="career-safety-note"><div><strong>Advising and coaching guidance only</strong><p>This page does not grant access, alter enrollment, or write to student records. Catalog status describes path development, not a learner’s progress. No student is assigned a path here.</p></div></aside>
    <section className="career-staff-summary" aria-label="Career catalog summary">{careerCategories.map(item => <article key={item.id}><strong>{item.id === 'all' ? careerPaths.length : careerPaths.filter(path => path.category === item.id).length}</strong><span>{item.id === 'all' ? 'Total career paths' : item.label}</span></article>)}</section>
    <section className="career-path-choice" aria-labelledby="career-staff-catalog-title"><div><span>Career Pathing Admin</span><h2 id="career-staff-catalog-title">A direction for every creative spark</h2><p>Search the catalog, then select a path for family conversations, coaching prompts, and evidence ideas.</p></div>
      <label className="career-search">Search by path title, program, or outcome<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Try Singing, Actor, or recording…"/></label>
      <CareerFilters category={category} onChange={setCategory}/><p className="career-results-count" role="status">Showing {visiblePaths.length} of {careerPaths.length} career paths</p>
      <CareerCatalog paths={visiblePaths} selectedId={selectedId} detailId="career-staff-detail" onSelect={id => { setSelectedId(id); focusCareerDetail('career-staff-detail'); }}/>
      {!visiblePaths.length && <div className="career-empty"><h3>No matching paths</h3><p>Try a broader term or another category.</p><button className="button button-secondary" onClick={() => { setSearch(''); setCategory('all'); }}>Reset filters</button></div>}
    </section>
    <section className="career-staff-detail" id="career-staff-detail" tabIndex={-1} aria-labelledby="career-staff-detail-title">
      <header><span className="career-eyebrow">Selected path · Advising notes</span><h2 id="career-staff-detail-title">{selectedPath.icon} {selectedPath.title}</h2><p className="career-detail-meta">{categoryLabel(selectedPath.category)} · {selectedPath.status}</p><p>{selectedPath.description}</p><h3>Outcome</h3><p>{selectedPath.outcome}</p>{!visiblePaths.some(path => path.id === selectedId) && <p className="career-roadmap-note">This selected path is outside the current filters. Select a matching card to change these notes.</p>}</header>
      <div className="career-advising-grid"><article><h3>Family-facing talking points</h3><ul>{guidance.family.map(text => <li key={text}>{text}</li>)}</ul></article><article><h3>Student coaching prompts</h3><ul>{guidance.coaching.map(text => <li key={text}>{text}</li>)}</ul></article><article><h3>Suggested portfolio evidence</h3><ul>{guidance.evidence.map(text => <li key={text}>{text}</li>)}</ul><p>Discuss scope, accessibility, and review with the teacher. These are conversation ideas, not assigned work or submission requirements.</p></article></div>
      <h3>Connected JPAC programs</h3><div className="career-program-list">{selectedPath.connectedPrograms.map(program => <span key={program}>{program}</span>)}</div><h3>Recommended Creator Tools</h3><CareerTools path={selectedPath}/>
    </section>
    <nav className="career-staff-links" aria-label="Related staff workspaces"><Link className="button button-secondary" to="/curriculum">Curriculum Studio</Link><Link className="button button-secondary" to="/staff/module-readiness">Module Readiness</Link><Link className="button button-secondary" to="/student-intelligence">Student Intelligence</Link><Link className="button button-secondary" to="/coach">JPAC Coach</Link></nav>
  </div>;
}
