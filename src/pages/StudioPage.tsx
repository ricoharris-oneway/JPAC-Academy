import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { premiumCreatorTools } from '../features/creative-tools/creativeToolRegistry';
import '../styles/jpac-premium-tools.css';
import { loadMyCourses } from '../lib/studentAccess';
import { supabase } from '../lib/supabase';

type Tool = { id: string; name: string; description: string; category: string; launch_url: string | null; estimated_minutes: number; xp_reward: number };
type ToolCourseLink = { lab_tool_id: string; course_id: string };
type StudioCategory = 'All' | 'Singing' | 'Acting' | 'Dance' | 'Music' | 'Video' | 'Portfolio' | 'AI Creator';
type ToolVisual = 'singing' | 'showcase' | 'spaces' | 'acting' | 'dance' | 'music' | 'video' | 'portfolio';
type CreatorTool = {
  id: string;
  title: string;
  icon: string;
  purpose: string;
  bestFor: string;
  categories: Exclude<StudioCategory, 'All'>[];
  visual: ToolVisual;
  steps: string[];
};

const studioCategories: StudioCategory[] = ['All', 'Singing', 'Acting', 'Dance', 'Music', 'Video', 'Portfolio', 'AI Creator'];

const creatorTools: CreatorTool[] = [
  {
    id: 'vocal-practice-planner',
    title: 'Vocal Practice Planner',
    icon: '🎤',
    purpose: 'Plan warm-ups, song-section practice, breath goals, and reflection.',
    bestFor: 'Singing assignments',
    categories: ['Singing'],
    visual: 'singing',
    steps: ['Warm up for 5 minutes', 'Practice breath support', 'Sing the hardest line slowly', 'Record one short take', 'Listen back and write one improvement goal'],
  },
  {
    id: 'performance-prep-checklist',
    title: 'Performance Prep Checklist',
    icon: '✨',
    purpose: 'Prepare for a recording, showcase, audition, or class performance.',
    bestFor: 'Singing, Acting, and Dance',
    categories: ['Singing', 'Acting', 'Dance'],
    visual: 'showcase',
    steps: ['Know your beginning and ending position', 'Practice expression and confidence', 'Check sound, lighting, and background', 'Record a test take', 'Choose your strongest version for the correct assignment page'],
  },
  {
    id: 'assignment-practice-builder',
    title: 'Assignment Practice Builder',
    icon: '🧩',
    purpose: 'Break an assignment into clear watch, practice, record, reflect, and submit stages.',
    bestFor: 'All JPAC courses',
    categories: ['Singing', 'Acting', 'Dance', 'Music', 'Video', 'Portfolio', 'AI Creator'],
    visual: 'spaces',
    steps: ['Read the assignment instructions', 'Watch the lesson or example', 'Practice the skill in small parts', 'Record or create your work', 'Reflect on what improved', 'Submit through the correct course assignment page'],
  },
  {
    id: 'script-scene-rehearsal',
    title: 'Script & Scene Rehearsal Tool',
    icon: '🎭',
    purpose: 'Plan character choices, emotion, movement, and delivery before a scene run.',
    bestFor: 'Acting and Theater',
    categories: ['Acting'],
    visual: 'acting',
    steps: ['Name the character’s goal in the scene', 'Mark the emotional changes', 'Plan entrances, movement, and focus', 'Rehearse difficult lines slowly', 'Record one run and note one delivery improvement'],
  },
  {
    id: 'dance-rehearsal-tracker',
    title: 'Dance Rehearsal Tracker',
    icon: '💃',
    purpose: 'Track counts, choreography sections, repetitions, and confidence.',
    bestFor: 'Dance',
    categories: ['Dance'],
    visual: 'dance',
    steps: ['Divide the choreography into sections', 'Count through each section without music', 'Repeat the hardest section three times', 'Complete one full run with music', 'Rate your confidence and choose the next focus area'],
  },
  {
    id: 'songwriting-idea-pad',
    title: 'Songwriting Idea Pad',
    icon: '🎵',
    purpose: 'Organize a song title, concept, hook, verse ideas, mood, and message.',
    bestFor: 'Music Production and Songwriting',
    categories: ['Music'],
    visual: 'music',
    steps: ['Write the song concept in one sentence', 'Choose the mood and message', 'Draft three title or hook ideas', 'Outline the first verse', 'Read or sing it aloud and circle the strongest idea'],
  },
  {
    id: 'video-shot-planner',
    title: 'Video Shot Planner',
    icon: '🎬',
    purpose: 'Plan clips, camera angles, an intro and outro, and final edit notes.',
    bestFor: 'Video Production and AI Creator',
    categories: ['Video', 'AI Creator'],
    visual: 'video',
    steps: ['Decide the purpose of the video', 'Plan 3 to 5 shots', 'Choose camera angle and movement', 'Record clean audio', 'Review and edit before submitting'],
  },
  {
    id: 'portfolio-builder-checklist',
    title: 'Portfolio Builder Checklist',
    icon: '🏆',
    purpose: 'Choose work samples, reflect on growth, and prepare showcase items.',
    bestFor: 'Certificates and Portfolio',
    categories: ['Portfolio'],
    visual: 'portfolio',
    steps: ['Choose your strongest work', 'Add a short reflection', 'Check the title, name, and date', 'Make sure the file plays correctly', 'Prepare it for instructor review or showcase'],
  },
];

export function StudioPage() {
  const { profile } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<StudioCategory>('All');
  const [selectedId, setSelectedId] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(() => new Set());
  const [practicedTools, setPracticedTools] = useState<Set<string>>(() => new Set());
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    async function load() {
      if (!supabase || !profile) {
        setLoading(false);
        return;
      }
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
      } else {
        setTools(availableTools);
      }
      setMessage(toolError?.message || linkError?.message || entitled.error || '');
      setLoading(false);
    }
    void load();
  }, [profile]);

  const filteredTools = useMemo(
    () => category === 'All' ? creatorTools : creatorTools.filter((tool) => tool.categories.includes(category)),
    [category],
  );
  const selectedTool = creatorTools.find((tool) => tool.id === selectedId);

  function toggleStep(toolId: string, index: number) {
    const key = `${toolId}:${index}`;
    setCheckedSteps((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function markPracticed(toolId: string) {
    setPracticedTools((current) => new Set(current).add(toolId));
  }

  async function copyTemplate(tool: CreatorTool) {
    const note = notes[tool.id]?.trim();
    const template = [tool.title, tool.purpose, '', ...tool.steps.map((step, index) => `${checkedSteps.has(`${tool.id}:${index}`) ? '✓' : '○'} ${step}`), note ? `\nMy notes:\n${note}` : ''].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(template);
      setCopyStatus('Template copied.');
    } catch {
      setCopyStatus('Copy is unavailable in this browser. Your session notes are still here.');
    }
  }

  return <div className="creative-studio-page">
    <div className="page-hero">
      <div>
        <div className="eyebrow">JPAC Creator Lab</div>
        <h1 className="page-title">Creative Studio</h1>
        <p className="muted">Practice, plan, and build your creative work with guided JPAC studio tools.</p>
      </div>
    </div>

    {message ? <div className="admin-message">{message}</div> : null}

    <section className="studio-premium-section" aria-labelledby="jpac-creator-tools-title">
      <div className="studio-premium-heading">
        <div><div className="eyebrow">Premium local practice</div><h2 id="jpac-creator-tools-title">JPAC Creator Tools</h2></div>
        <small>No uploads, recording, XP, or assignment submission.</small>
      </div>
      <div className="studio-premium-grid">
        {premiumCreatorTools.map((tool) => <Link className="studio-premium-card" to={`/studio/tools/${tool.slug}`} key={tool.slug}>
          <span className="icon" aria-hidden="true">{tool.icon}</span><strong>{tool.title}</strong><span>{tool.description}</span><b>Open tool →</b>
        </Link>)}
      </div>
    </section>

    <section className="studio-lab-intro">
      <div><div className="eyebrow">Plan your practice</div><h2>Guided Practice Templates</h2></div>
      <p>Use these guided templates to practice, prepare assignments, and build creative confidence.</p>
    </section>

    <div className="studio-guided-heading"><div className="eyebrow">Eight guided workflows</div><h2>Choose a Guided Practice Template</h2></div>

    <div className="studio-category-filters" role="group" aria-label="Filter Creator Lab tools">
      {studioCategories.map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
    </div>

    <section className="studio-template-grid" aria-label="Guided Practice Templates">
      {filteredTools.map((tool) => <button
        type="button"
        className={`studio-template-card studio-visual-${tool.visual} ${selectedId === tool.id ? 'selected' : ''}`}
        key={tool.id}
        aria-pressed={selectedId === tool.id}
        onClick={() => {
          setSelectedId(tool.id);
          setCopyStatus('');
        }}
      >
        <span className="studio-tool-icon" aria-hidden="true">{tool.icon}</span>
        <span className="studio-tool-copy"><small>{tool.bestFor}</small><strong>{tool.title}</strong><span>{tool.purpose}</span></span>
        <b>{practicedTools.has(tool.id) ? 'Practiced ✓' : 'Open template →'}</b>
      </button>)}
    </section>

    {selectedTool ? <WorkflowPanel
      tool={selectedTool}
      notes={notes[selectedTool.id] || ''}
      checkedSteps={checkedSteps}
      practiced={practicedTools.has(selectedTool.id)}
      copyStatus={copyStatus}
      onClose={() => setSelectedId('')}
      onToggleStep={toggleStep}
      onNotesChange={(value) => setNotes((current) => ({ ...current, [selectedTool.id]: value }))}
      onPracticed={() => markPracticed(selectedTool.id)}
      onCopy={() => void copyTemplate(selectedTool)}
    /> : <div className="studio-template-invitation" role="status">Choose a Creator Tool to open its guided workflow.</div>}

    <section className="studio-assigned-tools" aria-labelledby="assigned-tools-title">
      <div className="studio-assigned-heading">
        <div><div className="eyebrow">Connected course tools</div><h2 id="assigned-tools-title">Assigned Studio tools</h2></div>
        <small>Assigned course tools will appear here when available.</small>
      </div>
      {loading ? <section className="card card-pad"><p>Loading assigned tools…</p></section> : tools.length ? <div className="grid grid-3 creative-studio-tools">
        {tools.map((tool) => <article className="card card-pad" key={tool.id}>
          <div className="eyebrow">{tool.category}</div>
          <h2>{tool.name}</h2>
          <p>{tool.description}</p>
          <small>{tool.estimated_minutes} minutes · {tool.xp_reward} configured XP</small>
          {tool.launch_url ? <a className="button button-primary" href={tool.launch_url} target="_blank" rel="noreferrer">Open tool</a> : <p className="muted">This tool is published but does not yet have a launch URL.</p>}
        </article>)}
      </div> : <section className="card card-pad creative-studio-empty">
        <h2>Your Creator Lab is ready.</h2>
        <p>Use the guided templates above to practice, prepare assignments, and build creative confidence.</p>
        <small>Assigned course tools will appear here when available.</small>
      </section>}
    </section>
  </div>;
}

function WorkflowPanel({ tool, notes, checkedSteps, practiced, copyStatus, onClose, onToggleStep, onNotesChange, onPracticed, onCopy }: {
  tool: CreatorTool;
  notes: string;
  checkedSteps: Set<string>;
  practiced: boolean;
  copyStatus: string;
  onClose: () => void;
  onToggleStep: (toolId: string, index: number) => void;
  onNotesChange: (value: string) => void;
  onPracticed: () => void;
  onCopy: () => void;
}) {
  return <section className={`studio-workflow-panel studio-visual-${tool.visual}`} aria-labelledby="studio-workflow-title">
    <header>
      <div><div className="eyebrow">Open workflow</div><h2 id="studio-workflow-title">{tool.title}</h2><p>{tool.purpose}</p></div>
      <button type="button" className="studio-close-button" onClick={onClose} aria-label="Close workflow template">×</button>
    </header>
    <div className="studio-workflow-layout">
      <div className="studio-workflow-checklist">
        <h3>Practice checklist</h3>
        {tool.steps.map((step, index) => {
          const key = `${tool.id}:${index}`;
          return <label key={key} className={checkedSteps.has(key) ? 'complete' : ''}>
            <input type="checkbox" checked={checkedSteps.has(key)} onChange={() => onToggleStep(tool.id, index)} />
            <span>{step}</span>
          </label>;
        })}
      </div>
      <div className="studio-workflow-notes">
        <label htmlFor={`studio-notes-${tool.id}`}>Student notes</label>
        <textarea id={`studio-notes-${tool.id}`} value={notes} maxLength={3000} onChange={(event) => onNotesChange(event.target.value)} placeholder="What felt strong? What will you practice next?" />
        <small>Notes and checklist progress are session-only and are not saved to JPAC or submitted to an instructor.</small>
      </div>
    </div>
    <footer>
      <p><strong>Use this for your next assignment.</strong> Practice here, then return to the correct course assignment page when you are ready.</p>
      <div>
        <button type="button" className="button button-secondary" onClick={onCopy}>Copy template</button>
        <button type="button" className="button button-primary" onClick={onPracticed}>{practiced ? 'Practiced ✓' : 'Mark as practiced'}</button>
      </div>
      {copyStatus ? <span role="status">{copyStatus}</span> : null}
    </footer>
  </section>;
}
