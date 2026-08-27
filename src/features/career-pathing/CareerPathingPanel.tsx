import{Link}from'react-router-dom';
import{careerMoveForDate}from'./careerPathing';
import'../../styles/career-pathing.css';

export function CareerPathingPanel():JSX.Element{const careerMove=careerMoveForDate(new Date());return <section className="career-pathing-panel" aria-labelledby="career-pathing-panel-title"><div className="career-pathing-panel-copy"><span>Start with your future</span><h2 id="career-pathing-panel-title">Choose Your Creative Career Path</h2><p>Pick the path you want to grow into. Your lessons, practice games, and submissions all build your creative future.</p><div className="career-pathing-actions"><Link className="button button-primary" to="/career-pathing">Explore career paths</Link><Link className="button button-secondary" to="/studio">Practice career skills</Link></div></div><article className="career-move-card"><span>Today’s Career Move</span><strong>{careerMove}</strong><p>Every practice session should connect to your path.</p></article></section>}
