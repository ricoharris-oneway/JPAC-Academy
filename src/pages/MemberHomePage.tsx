import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { careerPaths } from '../features/career-pathing/careerPathing';
import { memberPrograms, memberTools, enrollmentRequestUrl, courseLockedMessage } from '../data/memberPrograms';
import { useMemberJourney } from '../context/MemberJourneyContext';
import { supabase } from '../lib/supabase';
import '../styles/member-launch.css';

export function MemberRow({ title, children }: { title: string; children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  return <section className="member-section"><header><h2>{title}</h2><div className="rail-controls"><button aria-label={`Scroll ${title} left`} onClick={() => rail.current?.scrollBy({ left: -330 })}>←</button><button aria-label={`Scroll ${title} right`} onClick={() => rail.current?.scrollBy({ left: 330 })}>→</button></div></header><div className="member-rail" ref={rail} tabIndex={0} role="region" aria-label={title}>{children}</div></section>;
}

export function EnrollmentOffer() {
  return <section className="member-upgrade" id="enroll"><div><span className="member-kicker">YOUR AMBITION. YOUR NEXT LEVEL.</span><h2>Upgrade for Full Academy Access</h2><p>Choose your program with JPAC staff. Access is granted after payment or approved access is verified.</p><ul>{['Full course access', 'Guided career path tools', 'Creative practice tools', 'Portfolio building', 'Instructor/staff support', 'Community features — coming soon'].map(benefit => <li key={benefit}>{benefit}</li>)}</ul><a className="button button-primary" href={enrollmentRequestUrl}>Request Enrollment or Upgrade Now ↗</a><small>Opens your email app. Staff will confirm your selected courses and availability.</small></div><span className="upgrade-star" aria-hidden="true">✦</span></section>;
}

export function MemberHomePage() {
  const { selectedPath } = useMemberJourney();
  const path = careerPaths.find((item) => item.id === selectedPath);
  const [access, setAccess] = useState<Array<{ course_id: string; title: string; slug: string }>>([]);
  useEffect(() => { let active = true; void supabase?.rpc('jpac_my_academy_courses').then(({ data, error }) => { if (active && !error) setAccess(data || []); }); return () => { active = false; }; }, []);
  return <div className="member-launch">
    <header className="member-hero"><div className="hero-copy"><span className="member-kicker">JPAC ACADEMY · YOUR CREATIVE WORLD</span><h1>Create Your Future<br />at <em>JPAC Academy</em></h1><p>Explore programs, choose your career path, use creative tools, and unlock full courses after enrollment approval.</p><div className="member-actions"><Link className="button button-primary" to="/choose-career-path">Choose Career Path ↗</Link><Link className="button button-secondary" to="/programs">Explore Programs</Link></div><div className="member-benefits">{['Real Skills', 'Real Opportunities', 'Build Your Future', 'Creative Community'].map(tag => <span key={tag}>{tag}</span>)}</div></div><div className="hero-caption"><span>THE STAGE IS YOURS</span><b>Imagine. Create. Become.</b></div></header>
    <div className="member-welcome"><span className="member-pill">FREE MEMBERSHIP · WELCOME IN</span><p>Your direction: <strong>{path?.title || 'Your creative future'}</strong></p><Link to="/courses">My Learning →</Link></div>
    <MemberRow title="Featured Programs">{memberPrograms.map((program, i) => <Link className="member-program" to={`/programs#${program.slug}`} key={program.slug}><img src={`/creative-assets/${program.image}`} alt="" loading="lazy" /><div><span>{program.category}</span><h3>{program.title}</h3><p>Explore program <b>↗</b></p></div><span className="program-number">{String(i + 1).padStart(2, '0')}</span></Link>)}</MemberRow>
    <MemberRow title="Career Paths">{careerPaths.map(path => <Link className="member-career" to="/career-pathing" key={path.id}><span aria-hidden="true">{path.icon}</span><small>YOUR FUTURE IN FOCUS</small><h3>{path.title}</h3><p>{path.outcome}</p><b>Explore your path ↗</b></Link>)}</MemberRow>
    <MemberRow title="JPAC Tools">{memberTools.map(tool => <Link className="member-tool" to={tool.to} key={tool.title}><span aria-hidden="true">{tool.icon}</span><h3>{tool.title}</h3><p>{tool.description}</p><b>Explore →</b></Link>)}</MemberRow>
    <MemberRow title="Unlock Premium Courses">{memberPrograms.map(program => { const enrolled = access.find(course => course.slug === program.slug || course.title.toLowerCase() === program.title.toLowerCase()); return <Link className="member-locked" to={enrolled ? `/courses/${enrolled.course_id}` : `/programs#${program.slug}`} key={program.slug}><img src={`/creative-assets/${program.image}`} alt="" loading="lazy" /><div><span className="member-pill">{enrolled ? '✓ Enrolled · Open course' : '🔒 Locked until enrolled'}</span><h3>{program.title}</h3><p>{enrolled ? 'Continue your Academy learning.' : 'Staff verification required'}</p><small>{enrolled ? 'Your approved program' : 'Payment or approved access required'}</small></div></Link>; })}</MemberRow>
    <EnrollmentOffer />
    <section className="member-community"><span aria-hidden="true">◎</span><div><span className="member-kicker">CREATE TOGETHER</span><h2>Your creative community is coming soon.</h2><p>A place for connection, inspiration, and celebrating the work you are becoming known for.</p></div><span className="member-pill">COMING SOON</span></section>
  </div>;
}

export function ExploreProgramsPage() {
  return <div className="member-launch"><header className="member-page-heading"><span className="member-kicker">FIND YOUR NEXT CHAPTER</span><h1>Explore Programs</h1><p>Start with your curiosity. Enrollment is approved for each course by JPAC staff.</p></header><div className="member-program-grid">{memberPrograms.map(program => <article className="member-program-detail" id={program.slug} key={program.slug}><img src={`/creative-assets/${program.image}`} alt="" loading="lazy" /><div><span className="member-kicker">{program.category}</span><h2>{program.title}</h2><p>{program.description}</p><p className="member-note">{courseLockedMessage}</p><a className="button button-secondary" href={`${enrollmentRequestUrl}&body=${encodeURIComponent(`I would like to learn about enrollment in ${program.title}.`)}`}>Ask about this program ↗</a></div></article>)}</div><EnrollmentOffer /></div>;
}

export function MemberToolsPage() {
  return <div className="member-launch"><header className="member-page-heading"><span className="member-kicker">IDEAS INTO EXPRESSION</span><h1>Your JPAC Tools</h1><p>Explore creative possibilities while you prepare for your first enrolled program.</p></header><div className="member-program-grid">{memberTools.map(tool => <article className="member-tool" key={tool.title}><span aria-hidden="true">{tool.icon}</span><h2>{tool.title}</h2><p>{tool.description}</p>{tool.to.startsWith('/tools') ? <p className="member-note" id={tool.title === 'JPAC Coach' ? 'coach' : 'video-finder'}>{tool.title === 'JPAC Coach' ? 'Coaching connected to coursework becomes available with approved enrollment.' : 'JPAC staff curates instructional resources. Member video discovery is coming soon.'}</p> : <Link className="button button-secondary" to={tool.to}>Explore →</Link>}</article>)}</div></div>;
}

export function MemberCommunityPage() {
  return <div className="member-launch"><section className="member-hero"><span className="member-kicker">CREATIVE COMMUNITY · COMING SOON</span><h1>Find your people.<br /><em>Create together.</em></h1><p>Your JPAC community space is on its way. Explore programs and tools while we prepare a place to connect.</p><Link className="button button-primary" to="/studio">Explore Creative Studio</Link></section></div>;
}
