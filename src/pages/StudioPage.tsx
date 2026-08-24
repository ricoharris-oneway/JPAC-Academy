import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { premiumCreatorTools } from '../features/creative-tools/creativeToolRegistry';
import '../styles/jpac-premium-tools.css';
import{supabase}from'../lib/supabase';
import{useAuth}from'../context/AuthContext';
import{loadMyCourses}from'../lib/studentAccess';
type Tool={id:string;name:string;description:string;category:string;launch_url:string|null;estimated_minutes:number;xp_reward:number};type ToolCourseLink={lab_tool_id:string;course_id:string};

const guidedPracticeTemplates = [
  ['Vocal Practice Planner', 'Plan warm-ups, song sections, breath goals, and reflection.'],
  ['Performance Prep Checklist', 'Prepare for a recording, showcase, audition, or class performance.'],
  ['Assignment Practice Builder', 'Break an assignment into watch, practice, record, reflect, and submit stages.'],
  ['Script & Scene Rehearsal Tool', 'Plan character choices, emotion, movement, and delivery.'],
  ['Dance Rehearsal Tracker', 'Track counts, choreography sections, repetitions, and confidence.'],
  ['Songwriting Idea Pad', 'Organize a song concept, hook, verse ideas, mood, and message.'],
  ['Video Shot Planner', 'Plan clips, camera angles, an intro, outro, and edit notes.'],
  ['Portfolio Builder Checklist', 'Choose work samples, reflect on growth, and prepare showcase items.'],
] as const;

export function StudioPage() {
  const { profile } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!supabase || !profile) { setLoading(false); return; }
      setLoading(true);
      const [{ data: toolData, error: toolError }, { data: linkData, error: linkError }, entitled] = await Promise.all([
        supabase.from('lab_tools').select('id,name,description,category,launch_url,estimated_minutes,xp_reward').eq('status', 'ready').order('sort_order'),
        supabase.from('lab_tool_courses').select('lab_tool_id,course_id'),
        loadMyCourses(),
      ]);
      const availableTools = (toolData as Tool[]) || [];
      if (profile.role === 'student') {
        const courseIds = new Set(entitled.data.map((item) => item.course_id));
        const allowed = new Set(((linkData as ToolCourseLink[]) || []).filter((item) => courseIds.has(item.course_id)).map((item) => item.lab_tool_id));
        setTools(availableTools.filter((item) => allowed.has(item.id)));
      } else setTools(availableTools);
      setMessage(toolError?.message || linkError?.message || entitled.error || '');
      setLoading(false);
    }
    void load();
  }, [profile]);

  return <div className="creative-studio-page">
    <div className="page-hero"><div><div className="eyebrow">JPAC Creator Lab</div><h1 className="page-title">Creative Studio</h1><p className="muted">Practice, plan, and build your creative work with JPAC studio tools.</p></div></div>
    {message ? <div className="admin-message">{message}</div> : null}

    <section className="studio-premium-section" aria-labelledby="jpac-creator-tools-title">
      <div className="studio-premium-heading"><div><div className="eyebrow">Premium local practice</div><h2 id="jpac-creator-tools-title">JPAC Creator Tools</h2></div><small>No uploads, recording, XP, or assignment submission.</small></div>
      <div className="studio-premium-grid">{premiumCreatorTools.map((tool) => <Link className="studio-premium-card" to={`/studio/tools/${tool.slug}`} key={tool.slug}><span className="icon" aria-hidden="true">{tool.icon}</span><strong>{tool.title}</strong><span>{tool.description}</span><b>Open tool →</b></Link>)}</div>
    </section>

    <section className="studio-assigned-tools" aria-labelledby="assigned-tools-title">
      <div className="studio-premium-heading"><div><div className="eyebrow">Connected course tools</div><h2 id="assigned-tools-title">Assigned Studio Tools</h2></div></div>
      {loading ? <section className="card card-pad"><p>Loading assigned tools…</p></section> : tools.length ? <div className="grid grid-3">{tools.map((tool) => <article className="card card-pad" key={tool.id}><div className="eyebrow">{tool.category}</div><h2>{tool.name}</h2><p>{tool.description}</p><small>{tool.estimated_minutes} minutes · {tool.xp_reward} configured XP</small>{tool.launch_url ? <a className="button button-primary" href={tool.launch_url} target="_blank" rel="noreferrer">Open tool</a> : <p className="muted">This tool is published but does not yet have a launch URL.</p>}</article>)}</div> : <section className="card card-pad"><h2>No published tools are assigned yet.</h2><p className="muted">Tools appear here only when they are linked to one of your entitled courses.</p></section>}
    </section>

    <section className="studio-guided-section" aria-labelledby="guided-practice-title">
      <div className="studio-premium-heading"><div><div className="eyebrow">Plan your practice</div><h2 id="guided-practice-title">Guided Practice Templates</h2></div><small>Session-only planning prompts.</small></div>
      <div className="studio-guided-grid">{guidedPracticeTemplates.map(([title, description]) => <article className="card card-pad" key={title}><h3>{title}</h3><p>{description}</p><small>Use this template locally, then return to the correct assignment page when ready.</small></article>)}</div>
    </section>
  </div>;
}
