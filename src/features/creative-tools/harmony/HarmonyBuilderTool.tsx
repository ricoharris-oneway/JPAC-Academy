import { useMemo, useState } from 'react';
import { ToolShell } from '../shared/ToolShell';
import { buildProgression, harmonyKeys, harmonyStyles, type HarmonyKey, type HarmonyStyle } from './harmonyTheory';

export function HarmonyBuilderTool() {
  const [keyName, setKeyName] = useState<HarmonyKey>('C');
  const [style, setStyle] = useState<HarmonyStyle>('Pop');
  const [version, setVersion] = useState(0);
  const [copyMessage, setCopyMessage] = useState('');
  const progression = useMemo(() => buildProgression(keyName, style), [keyName, style, version]);

  async function copy() {
    try { await navigator.clipboard.writeText(`${keyName} ${style}: ${progression.roman.join(' – ')} | ${progression.chords.join(' – ')}`); setCopyMessage('Progression copied.'); }
    catch { setCopyMessage('Copy is unavailable in this browser.'); }
  }

  return <ToolShell title="Harmony Builder" eyebrow="JPAC Creator Tool" description="Explore chord progressions and hear how musical moods are built.">
    <section className="premium-tool-panel">
      <div className="premium-control-grid">
        <label>Key<select value={keyName} onChange={(e) => setKeyName(e.target.value as HarmonyKey)}>{harmonyKeys.map((key) => <option key={key}>{key}</option>)}</select></label>
        <label>Mood / style<select value={style} onChange={(e) => setStyle(e.target.value as HarmonyStyle)}>{harmonyStyles.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <div className="premium-action-row"><button className="button button-primary" type="button" onClick={() => { setVersion((v) => v + 1); setCopyMessage(''); }}>Generate progression</button><button className="button button-secondary" type="button" onClick={() => { setKeyName('C'); setStyle('Pop'); setCopyMessage(''); }}>Reset</button></div>
      <div className="harmony-result" key={version}>
        <div><small>Roman numerals</small><strong>{progression.roman.join(' · ')}</strong></div>
        <div><small>Chord names</small><strong>{progression.chords.join(' · ')}</strong></div>
      </div>
      <div className="premium-learning-grid"><article><h2>What this teaches</h2><p>{progression.lesson}</p></article><article><h2>Try this next</h2><p>{progression.prompt}</p></article></div>
      <div className="premium-action-row"><button className="button button-secondary" type="button" onClick={() => void copy()}>Copy progression</button>{copyMessage ? <span role="status">{copyMessage}</span> : null}</div>
    </section>
  </ToolShell>;
}
