import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { careerPaths } from '../features/career-pathing/careerPathing';
import { memberPrograms, memberTools, enrollmentRequestUrl, courseLockedMessage } from '../data/memberPrograms';
import { careerArtwork, programArtwork, toolArtwork } from '../data/memberAssetMap';
import { useMemberJourney } from '../context/MemberJourneyContext';
import { supabase } from '../lib/supabase';
import { loadHomepageMediaOverrides, resolveHomepageMediaUrl } from '../lib/homepageMedia';
import { loadMyCourses } from '../lib/studentAccess';
import '../styles/member-launch.css';
import '../styles/program-info-modal.css';

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
  const [media, setMedia] = useState<Map<string, import('../lib/homepageMedia').HomepageMediaOverride>>(new Map());
  useEffect(() => { let active = true; void supabase?.rpc('jpac_my_academy_courses').then(({ data, error }) => { if (active && !error) setAccess(data || []); }); return () => { active = false; }; }, []);
  useEffect(() => { let active = true; void loadHomepageMediaOverrides().then((overrides) => { if (active) setMedia(overrides); }); return () => { active = false; }; }, []);
  const artwork = (slotKey: string, fallback: string) => resolveHomepageMediaUrl(slotKey, media) || fallback;
  return <div className="member-launch">
    <header className="member-hero" style={{ '--member-hero-image': `url("${artwork('hero:homepage', '/creative-assets/jpac-showcase-stage.webp')}")` } as CSSProperties}><div className="hero-copy"><span className="member-kicker">JPAC ACADEMY · YOUR CREATIVE WORLD</span><h1>Create Your Future<br />at <em>JPAC Academy</em></h1><p>Explore programs, choose your career path, use creative tools, and unlock full courses after enrollment approval.</p><div className="member-actions"><Link className="button button-primary" to="/choose-career-path">Choose Career Path ↗</Link><Link className="button button-secondary" to="/programs">Explore Programs</Link></div><div className="member-benefits">{['Real Skills', 'Real Opportunities', 'Build Your Future', 'Creative Community'].map(tag => <span key={tag}>{tag}</span>)}</div></div><div className="hero-caption"><span>THE STAGE IS YOURS</span><b>Imagine. Create. Become.</b></div></header>
    <div className="member-welcome"><span className="member-pill">FREE MEMBERSHIP · WELCOME IN</span><p>Your direction: <strong>{path?.title || 'Your creative future'}</strong></p><Link to="/courses">My Learning →</Link></div>
    <MemberRow title="Featured Programs">{memberPrograms.map((program, i) => <Link className="member-program" to={`/programs#${program.slug}`} key={program.slug}><img src={artwork(`program:${program.slug}`, programArtwork[program.slug])} alt="" loading="lazy" /><div><span>{program.category}</span><h3>{program.title}</h3><p>Explore program <b>↗</b></p></div><span className="program-number">{String(i + 1).padStart(2, '0')}</span></Link>)}</MemberRow>
    <MemberRow title="Career Paths">{careerPaths.map(path => <Link className="member-career" to="/career-pathing" key={path.id}><img src={artwork(`career:${path.category}`, careerArtwork[path.category])} alt="" loading="lazy" /><span className="career-symbol" aria-hidden="true">{path.icon}</span><small>YOUR FUTURE IN FOCUS</small><h3>{path.title}</h3><p>{path.outcome}</p><b>Explore your path ↗</b></Link>)}</MemberRow>
    <MemberRow title="JPAC Tools">{memberTools.map(tool => <Link className="member-tool" to={tool.to} key={tool.title}><div className="tool-preview" aria-hidden="true"><img src={artwork(`tool:${tool.title}`, toolArtwork[tool.title])} alt="" loading="lazy" /><span>{tool.icon}</span></div><h3>{tool.title}</h3><p>{tool.description}</p><b>Explore →</b></Link>)}</MemberRow>
    <MemberRow title="Unlock Premium Courses">{memberPrograms.map(program => { const enrolled = access.find(course => course.slug === program.slug || course.title.toLowerCase() === program.title.toLowerCase()); return <Link className="member-locked" to={enrolled ? `/courses/${enrolled.course_id}` : `/programs#${program.slug}`} key={program.slug}><img src={artwork(`program:${program.slug}`, programArtwork[program.slug])} alt="" loading="lazy" /><div><span className="member-pill">{enrolled ? '✓ Enrolled · Open course' : '🔒 Locked until enrolled'}</span><h3>{program.title}</h3><p>{enrolled ? 'Continue your Academy learning.' : 'Staff verification required'}</p><small>{enrolled ? 'Your approved program' : 'Payment or approved access required'}</small></div></Link>; })}</MemberRow>
    <EnrollmentOffer />
    <section className="member-community"><span aria-hidden="true">◎</span><div><span className="member-kicker">CREATE TOGETHER</span><h2>Your creative community is coming soon.</h2><p>A place for connection, inspiration, and celebrating the work you are becoming known for.</p></div><span className="member-pill">COMING SOON</span></section>
  </div>;
}

export function ExploreProgramsPage() {
  const navigate = useNavigate();
  const [selectedProgram, setSelectedProgram] = useState<(typeof memberPrograms)[number] | null>(null);
  const [authorizedCourses, setAuthorizedCourses] = useState<Array<{ course_id: string; title: string; slug: string }>>([]);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    void loadMyCourses().then(({ data }) => { if (active) setAuthorizedCourses(data); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedProgram) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedProgram(null); };
    document.addEventListener('keydown', closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedProgram]);

  useEffect(() => {
    if (selectedProgram) modalRef.current?.focus();
    else triggerRef.current?.focus();
  }, [selectedProgram]);

  const openProgram = (program: (typeof memberPrograms)[number], button: HTMLButtonElement) => {
    triggerRef.current = button;
    setSelectedProgram(program);
  };
  const enrolledCourse = selectedProgram && authorizedCourses.find(course => course.slug === selectedProgram.slug || course.title.toLowerCase() === selectedProgram.title.toLowerCase());
  const connectedCareers = selectedProgram ? careerPaths.filter(path => path.connectedPrograms.some(program => program.toLowerCase() === selectedProgram.title.toLowerCase() || selectedProgram.title.toLowerCase().includes(program.toLowerCase()))).slice(0, 4) : [];
  const askAria = () => {
    if (!selectedProgram) return;
    navigate('/coach', { state: { program: selectedProgram } });
    setSelectedProgram(null);
  };

  return <div className="member-launch"><header className="member-page-heading"><span className="member-kicker">FIND YOUR NEXT CHAPTER</span><h1>Explore Programs</h1><p>Start with your curiosity. Enrollment is approved for each course by JPAC staff.</p></header><div className="member-program-grid">{memberPrograms.map(program => <article className="member-program-detail" id={program.slug} key={program.slug}><img src={programArtwork[program.slug]} alt="" loading="lazy" /><div><span className="member-kicker">{program.category}</span><h2>{program.title}</h2><p>{program.description}</p><p className="member-note">{courseLockedMessage}</p><button className="button button-secondary" type="button" aria-haspopup="dialog" aria-controls="program-info-dialog" onClick={(event) => openProgram(program, event.currentTarget)}>Ask about this program <span aria-hidden="true">↗</span></button></div></article>)}</div><EnrollmentOffer />{selectedProgram && <div className="program-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProgram(null); }}><section id="program-info-dialog" ref={modalRef} className="program-modal" role="dialog" aria-modal="true" aria-labelledby="program-modal-title" aria-describedby="program-modal-description" tabIndex={-1}><button className="program-modal-close" type="button" aria-label={`Close ${selectedProgram.title} program details`} onClick={() => setSelectedProgram(null)}>×</button><span className="member-kicker">{selectedProgram.category}</span><h2 id="program-modal-title">{selectedProgram.title}</h2><p id="program-modal-description" className="program-modal-description">{selectedProgram.description}</p><div className="program-modal-grid"><section><h3>What students learn</h3><p>{selectedProgram.description} JPAC staff can confirm the current course scope and learning sequence before enrollment.</p></section><section><h3>Level 1–4 overview</h3><ol className="program-levels"><li><strong>Level 1 · Foundations</strong><span>Build core vocabulary, habits, and safety foundations for the program.</span></li><li><strong>Level 2 · Development</strong><span>Develop technique and apply guided practice to creative work.</span></li><li><strong>Level 3 · Application</strong><span>Apply program skills in increasingly independent projects and practice.</span></li><li><strong>Level 4 · Portfolio readiness</strong><span>Refine work toward reviewed, career-connected outcomes.</span></li></ol></section><section><h3>Software and tools</h3><p>Software requirements will be confirmed by JPAC staff before enrollment.</p></section><section><h3>Equipment</h3><p>Equipment needs may vary by program and will be confirmed by JPAC staff.</p></section><section><h3>Enrollment and access</h3><p className={enrolledCourse ? 'program-status program-status-open' : 'program-status'}>{enrolledCourse ? 'Enrollment verified · Course access available.' : 'Enrollment pending staff verification · Course access is locked.'}</p>{!enrolledCourse && <p className="program-lock-note">{courseLockedMessage}</p>}</section><section><h3>Connected career paths</h3>{connectedCareers.length ? <ul className="program-careers">{connectedCareers.map(path => <li key={path.id}>{path.title}</li>)}</ul> : <p>Explore Career Pathing with JPAC staff to connect this program to your goals.</p>}</section></div><div className="program-modal-actions"><button className="button button-primary" type="button" onClick={askAria}>Ask Aria about this program</button><a className="button button-secondary" href={`${enrollmentRequestUrl}&body=${encodeURIComponent(`I would like to learn about enrollment in ${selectedProgram.title}.` )}`}>Ask Admissions Team</a><button className="button button-secondary" type="button" onClick={() => setSelectedProgram(null)}>Close</button></div></section></div>}</div>;
}

export function MemberToolsPage() {
  return <div className="member-launch"><header className="member-page-heading"><span className="member-kicker">IDEAS INTO EXPRESSION</span><h1>Your JPAC Tools</h1><p>Explore creative possibilities while you prepare for your first enrolled program.</p></header><div className="member-program-grid">{memberTools.map(tool => <article className="member-tool" key={tool.title}><span aria-hidden="true">{tool.icon}</span><h2>{tool.title}</h2><p>{tool.description}</p>{tool.to.startsWith('/tools') ? <p className="member-note" id={tool.title === 'JPAC Coach' ? 'coach' : 'video-finder'}>{tool.title === 'JPAC Coach' ? 'Coaching connected to coursework becomes available with approved enrollment.' : 'JPAC staff curates instructional resources. Member video discovery is coming soon.'}</p> : <Link className="button button-secondary" to={tool.to}>Explore →</Link>}</article>)}</div></div>;
}

export function MemberCommunityPage() {
  return <div className="member-launch"><section className="member-hero"><span className="member-kicker">CREATIVE COMMUNITY · COMING SOON</span><h1>Find your people.<br /><em>Create together.</em></h1><p>Your JPAC community space is on its way. Explore programs and tools while we prepare a place to connect.</p><Link className="button button-primary" to="/studio">Explore Creative Studio</Link></section></div>;
}
