import { Link } from 'react-router-dom';
import { careerCategories, toolsForCareerPath, type CareerCategory, type CareerPath } from './careerPathing';

export const categoryLabel = (category: CareerCategory) => careerCategories.find(item => item.id === category)?.label ?? category;

export function CareerFilters({ category, onChange }: { category: 'all' | CareerCategory; onChange: (value: 'all' | CareerCategory) => void }) {
  return <div className="career-category-filters" role="group" aria-label="Filter career paths by creative direction">
    {careerCategories.map(item => <button type="button" key={item.id} aria-pressed={category === item.id} onClick={() => onChange(item.id)}>{item.label}</button>)}
  </div>;
}

export function CareerCatalog({ paths, selectedId, onSelect, detailId }: { paths: CareerPath[]; selectedId: string; onSelect: (id: string) => void; detailId: string }) {
  return <div className="career-path-grid">{paths.map(path => <article key={path.id} className={selectedId === path.id ? 'active' : ''}>
    <div className="career-path-card-top"><span aria-hidden="true">{path.icon}</span><small>{path.status}</small></div>
    <span className="career-card-category">{categoryLabel(path.category)}</span>
    <h3>{path.title}</h3><p>{path.outcome}</p>
    <div className="career-program-list" aria-label={`Connected programs for ${path.title}`}>{path.connectedPrograms.map(program => <span key={program}>{program}</span>)}</div>
    <button type="button" aria-pressed={selectedId === path.id} aria-controls={detailId} aria-label={`Explore ${path.title}`} onClick={() => onSelect(path.id)}>{selectedId === path.id ? 'Selected path ✓' : 'Explore this path →'}</button>
  </article>)}</div>;
}

export function CareerTools({ path }: { path: CareerPath }) {
  return <div className="career-tool-grid">{toolsForCareerPath(path.id).map(tool => <Link key={tool.slug} to={`/studio/tools/${tool.slug}`}><span aria-hidden="true">{tool.icon}</span><strong>{tool.title}</strong><small>{tool.skills}</small></Link>)}</div>;
}

export function focusCareerDetail(id: string) {
  requestAnimationFrame(() => {
    const element = document.getElementById(id);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  });
}
