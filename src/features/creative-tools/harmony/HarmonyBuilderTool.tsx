import { useMemo, useState } from 'react';
import { ExtraCreditPanel } from '../shared/ExtraCreditPanel';
import { InstructorActivityPanel } from '../shared/InstructorActivityPanel';
import { LocalProjectPanel } from '../shared/LocalProjectPanel';
import { projectAsText, type LocalToolProject } from '../shared/projectStorage';
import { ToolShell } from '../shared/ToolShell';
import { buildProgression, harmonyActivities, harmonyGoals, harmonyHelpers, harmonyKeys, harmonyStyles, type HarmonyGoal, type HarmonyKey, type HarmonyStyle } from './harmonyTheory';

type HarmonyProject = { creative_goal: HarmonyGoal; instructor_activity: string; selected_key: HarmonyKey; selected_style: HarmonyStyle; suggested_song_section: string; emotional_description: string; progression: string[]; roman_numerals: string[]; lyric_or_melody_idea: string };

export function HarmonyBuilderTool() {
  const [keyName, setKeyName] = useState<HarmonyKey>('C');
  const [style, setStyle] = useState<HarmonyStyle>('Pop');
  const [version, setVersion] = useState(0);
  const [copyMessage, setCopyMessage] = useState('');
  const [goal, setGoal] = useState<HarmonyGoal>('Build a chorus');
  const [selectedActivityId, setSelectedActivityId] = useState(harmonyActivities[0].id);
  const [idea, setIdea] = useState('');
  const [generated, setGenerated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [keyChosen, setKeyChosen] = useState(false);
  const [styleChosen, setStyleChosen] = useState(false);
  const [guidePanel,setGuidePanel]=useState<'quick'|'coach'|'theory'|'save'|'extra'|null>('quick');
  const progression = useMemo(() => buildProgression(keyName, style, version), [keyName, style, version]);
  const selectedActivity = harmonyActivities.find((activity) => activity.id === selectedActivityId) ?? harmonyActivities[0];
  const snapshot = useMemo<HarmonyProject>(() => ({ creative_goal: goal, instructor_activity: selectedActivity.title, selected_key: keyName, selected_style: style, suggested_song_section: progression.suggestedUse, emotional_description: progression.emotion, progression: progression.chords, roman_numerals: progression.roman, lyric_or_melody_idea: idea }), [goal, idea, keyName, progression, selectedActivity.title, style]);
  const extraCreditSummary = projectAsText({ title: `${keyName} ${style} ${goal}`, notes: `Coach activity: ${selectedActivity.title}. Reflection: ${selectedActivity.reflectionPrompt}`, savedAt: new Date().toISOString(), data: snapshot }, 'Harmony Builder');

  async function copy() {
    try { await navigator.clipboard.writeText(`${keyName} ${style} · ${progression.suggestedUse}\n${progression.roman.join(' – ')}\n${progression.chords.join(' – ')}\nIdea: ${idea || 'Add your lyric or melody idea'}`); setCopyMessage('Project idea copied.'); }
    catch { setCopyMessage('Copy is unavailable in this browser.'); }
  }

  function loadProject(project: LocalToolProject<HarmonyProject>) { const data = project.data; setGoal(data.creative_goal); setSelectedActivityId(harmonyActivities.find((activity) => activity.title === data.instructor_activity)?.id ?? harmonyActivities[0].id); setKeyName(data.selected_key); setStyle(data.selected_style); setIdea(data.lyric_or_melody_idea); setKeyChosen(true); setStyleChosen(true); setGenerated(true); setCopyMessage(''); }

  return <ToolShell title="Harmony Builder" eyebrow="JPAC Song Lab" description="Build the feeling. Shape the chords. Start the song." immersive>
    <section className="premium-tool-panel songwriting-lab harmony-app-shell">
      <div className="harmony-app-toolbar">
        <div className="harmony-brand-lockup"><span>HARMONY BUILDER</span><strong>{goal}</strong><small>{keyName} · {style}</small></div>
        <div className="harmony-toolbar-actions">
          <button className="harmony-generate-primary" type="button" onClick={()=>{setKeyChosen(true);setStyleChosen(true);setGenerated(true);setVersion(0);setCopyMessage('')}}>✦ Generate</button>
          <button type="button" onClick={()=>{setKeyChosen(true);setStyleChosen(true);setVersion(value=>value+1);setGenerated(true);setCopyMessage('Another feel generated.')}}>↻ New Feel</button>
          <button type="button" onClick={()=>void copy()}>⧉ Copy</button>
          <button type="button" onClick={()=>{setKeyName('C');setStyle('Pop');setGoal('Build a chorus');setVersion(0);setIdea('');setKeyChosen(false);setStyleChosen(false);setGenerated(false);setSaved(false);setCopyMessage('')}}>Reset</button>
        </div>
      </div>

      <div className="harmony-goal-rail" aria-label="Choose creative goal">
        {harmonyGoals.map(item=><button type="button" key={item} className={goal===item?'active':''} aria-pressed={goal===item} onClick={()=>setGoal(item)}>{item}</button>)}
      </div>

      <section className="harmony-creative-stage" aria-label="Harmony creation workspace">
        <aside className="harmony-control-tower">
          <div className="harmony-select-card">
            <span>KEY</span>
            <select value={keyName} onChange={e=>{setKeyName(e.target.value as HarmonyKey);setKeyChosen(true);setGenerated(false)}}>{harmonyKeys.map(key=><option key={key}>{key}</option>)}</select>
          </div>
          <div className="harmony-select-card">
            <span>STYLE / MOOD</span>
            <select value={style} onChange={e=>{setStyle(e.target.value as HarmonyStyle);setStyleChosen(true);setGenerated(false)}}>{harmonyStyles.map(item=><option key={item}>{item}</option>)}</select>
          </div>
          <div className="harmony-direction-card">
            <span>FEEL</span>
            <strong>{progression.emotion}</strong>
            <small>{progression.suggestedUse}</small>
          </div>
          <button className="harmony-coach-cue" type="button" onClick={()=>setGuidePanel('coach')}>✦ Open Coach Cue</button>
        </aside>

        <div className="harmony-chord-stage" key={version}>
          <div className="harmony-stage-heading"><span>CURRENT PROGRESSION</span><strong>{progression.roman.join('  ·  ')}</strong></div>
          <div className="harmony-chord-pads">
            {progression.chords.map((chord,index)=><article key={chord+'-'+index}><small>{progression.roman[index]}</small><strong>{chord}</strong><span>{index+1}</span></article>)}
          </div>
          <div className="harmony-energy-line" aria-hidden="true"><i/><i/><i/><i/></div>
          <label className="harmony-hook-pad"><span>HOOK / MELODY IDEA</span><textarea maxLength={1000} value={idea} onChange={event=>setIdea(event.target.value)} placeholder="Drop a lyric, melody shape, title, or hook idea here…"/></label>
          <div className="harmony-stage-actions">
            <button type="button" className="button button-primary" onClick={()=>{setKeyChosen(true);setStyleChosen(true);setGenerated(true);setVersion(value=>value+1)}}>MAKE ANOTHER VERSION</button>
            <button type="button" className="button button-secondary" onClick={()=>setGuidePanel('theory')}>WHY THESE CHORDS?</button>
          </div>
        </div>
      </section>

      {copyMessage?<div className="harmony-status-toast" role="status">{copyMessage}</div>:null}

      <div className="creator-guide-dock harmony-guide-dock" aria-label="Harmony Builder guide">
        <button type="button" onClick={()=>setGuidePanel('quick')}><span>?</span><strong>Guide</strong></button>
        <button type="button" onClick={()=>setGuidePanel('coach')}><span>✦</span><strong>Coach</strong></button>
        <button type="button" onClick={()=>setGuidePanel('theory')}><span>♬</span><strong>Theory</strong></button>
        <button type="button" onClick={()=>setGuidePanel('save')}><span>◇</span><strong>Save</strong></button>
        <button type="button" onClick={()=>setGuidePanel('extra')}><span>★</span><strong>Extra</strong></button>
      </div>

      {guidePanel&&<div className="creator-guide-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setGuidePanel(null)}}>
        <aside className="creator-guide-panel" role="dialog" aria-modal="true" aria-label="Harmony Builder guidance">
          <button type="button" className="creator-guide-close" aria-label="Close guide" onClick={()=>setGuidePanel(null)}>×</button>
          {guidePanel==='quick'&&<div className="creator-guide-content"><span className="premium-kicker">Quick Start</span><h2>Build first. Learn while you create.</h2><div className="creator-guide-steps">
            <button type="button" onClick={()=>setGuidePanel(null)}><b>1</b><span><strong>Pick your goal</strong><small>Verse, chorus, bridge, mood, or creative direction.</small></span></button>
            <button type="button" onClick={()=>setGuidePanel(null)}><b>2</b><span><strong>Choose key + style</strong><small>Set the musical world before generating.</small></span></button>
            <button type="button" onClick={()=>{setGenerated(true);setGuidePanel(null)}}><b>3</b><span><strong>Generate and react</strong><small>Keep it, reshape it, or create another feel.</small></span></button>
            <button type="button" onClick={()=>setGuidePanel('save')}><b>4</b><span><strong>Capture the idea</strong><small>Add a hook or melody idea, then save it locally.</small></span></button>
          </div></div>}
          {guidePanel==='coach'&&<div className="creator-guide-content"><InstructorActivityPanel activities={harmonyActivities} selectedId={selectedActivityId} onSelect={setSelectedActivityId}/></div>}
          {guidePanel==='theory'&&<div className="creator-guide-content"><span className="premium-kicker">Harmony Insight</span><h2>Why this progression works</h2><div className="creator-guide-cards"><article><strong>Roman numerals</strong><p>{progression.roman.join(' · ')}</p></article><article><strong>Chord names</strong><p>{progression.chords.join(' · ')}</p></article><article><strong>What this teaches</strong><p>{progression.lesson}</p></article><article><strong>Try this next</strong><p>{progression.prompt}</p></article>{harmonyHelpers.map(([title,text])=><article key={title}><strong>{title}</strong><p>{text}</p></article>)}</div></div>}
          {guidePanel==='save'&&<div className="creator-guide-content"><LocalProjectPanel toolType="harmony-builder" toolLabel="Harmony Builder" snapshot={snapshot} onLoad={loadProject} onSaved={()=>setSaved(true)}/></div>}
          {guidePanel==='extra'&&<div className="creator-guide-content"><ExtraCreditPanel summary={extraCreditSummary}/></div>}
        </aside>
      </div>}
    </section>
  </ToolShell>;
}
