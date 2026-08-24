import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToolShell } from '../shared/ToolShell';
import { clonePattern, emptyPattern, grooveNames, groovePresets, loopRows, randomPattern, serializePattern, summarizePattern, type LoopRow, type Pattern } from './loopTheory';

export function LoopBuilderTool() {
  const [pattern, setPattern] = useState<Pattern>(() => clonePattern(groovePresets.Pop)); const [bpm, setBpm] = useState(100); const [running, setRunning] = useState(false); const [playhead, setPlayhead] = useState(-1); const [copyMessage, setCopyMessage] = useState(''); const [audioError, setAudioError] = useState('');
  const audioRef = useRef<AudioContext | null>(null); const timerRef = useRef<number | null>(null); const stepRef = useRef(0); const patternRef = useRef(pattern); patternRef.current = pattern;

  const playVoice = useCallback((row: LoopRow) => {
    const context = audioRef.current; if (!context) return; const now = context.currentTime; const gain = context.createGain(); gain.connect(context.destination);
    if (row === 'Kick') { const oscillator = context.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(145, now); oscillator.frequency.exponentialRampToValueAtTime(48, now + .18); gain.gain.setValueAtTime(.5, now); gain.gain.exponentialRampToValueAtTime(.001, now + .2); oscillator.connect(gain); oscillator.start(now); oscillator.stop(now + .21); return; }
    if (row === 'Bass') { const oscillator = context.createOscillator(); oscillator.type = 'triangle'; oscillator.frequency.value = 65.41; gain.gain.setValueAtTime(.24, now); gain.gain.exponentialRampToValueAtTime(.001, now + .28); oscillator.connect(gain); oscillator.start(now); oscillator.stop(now + .3); return; }
    const duration = row === 'Hi-Hat' ? .06 : row === 'Clap' ? .11 : .16; const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate); const data = buffer.getChannelData(0); for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource(); source.buffer = buffer; const filter = context.createBiquadFilter(); filter.type = row === 'Hi-Hat' ? 'highpass' : 'bandpass'; filter.frequency.value = row === 'Hi-Hat' ? 6500 : row === 'Clap' ? 1700 : 1200; gain.gain.setValueAtTime(row === 'Hi-Hat' ? .12 : .22, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration); source.connect(filter).connect(gain); source.start(now);
  }, []);

  useEffect(() => {
    if (!running) return;
    const tick = () => { const step = stepRef.current; setPlayhead(step); loopRows.forEach((row) => { if (patternRef.current[row][step]) playVoice(row); }); stepRef.current = (step + 1) % 16; };
    tick(); timerRef.current = window.setInterval(tick, 60000 / bpm / 4);
    return () => { if (timerRef.current !== null) window.clearInterval(timerRef.current); timerRef.current = null; };
  }, [bpm, playVoice, running]);
  useEffect(() => () => { if (timerRef.current !== null) window.clearInterval(timerRef.current); void audioRef.current?.close(); audioRef.current = null; }, []);

  async function start() {
    try { const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AudioCtor) throw new Error('Web Audio is not supported by this browser.'); const context = audioRef.current || new AudioCtor(); audioRef.current = context; if (context.state === 'suspended') await context.resume(); stepRef.current = 0; setAudioError(''); setRunning(true); }
    catch (error) { setAudioError(error instanceof Error ? error.message : 'Audio could not start. Select Start to try again.'); }
  }
  function stop() { setRunning(false); setPlayhead(-1); stepRef.current = 0; }
  function toggle(row: LoopRow, step: number) { setPattern((current) => ({ ...current, [row]: current[row].map((on, index) => index === step ? !on : on) })); setCopyMessage(''); }
  async function copyPattern() { try { await navigator.clipboard.writeText(serializePattern(pattern, bpm)); setCopyMessage('Pattern copied.'); } catch { setCopyMessage('Copy is unavailable in this browser.'); } }
  const summary = useMemo(() => summarizePattern(pattern), [pattern]);

  return <ToolShell title="Loop Builder / Beat Lab" eyebrow="JPAC Creator Tool" description="Turn on steps, shape a groove, and hear how rhythm patterns work together.">
    <section className="premium-tool-panel loop-builder">
      <div className="loop-transport"><button type="button" className="button button-primary" onClick={() => running ? stop() : void start()}>{running ? 'Stop' : 'Start'}</button><label>BPM <input type="range" min="60" max="180" value={bpm} onChange={(event) => setBpm(Number(event.target.value))} /><input aria-label="Beats per minute" type="number" min="60" max="180" value={bpm} onChange={(event) => setBpm(Math.max(60, Math.min(180, Number(event.target.value) || 60)))} /></label><div className="loop-beat-display" aria-live="polite"><small>Beat</small><strong>{playhead < 0 ? '—' : `${Math.floor(playhead / 4) + 1}.${playhead % 4 + 1}`}</strong></div></div>
      {audioError ? <div className="premium-audio-error" role="alert">{audioError}</div> : null}
      <div className="loop-preset-row"><span>Genre grooves</span>{grooveNames.map((name) => <button type="button" key={name} onClick={() => { setPattern(clonePattern(groovePresets[name])); setCopyMessage(''); }}>{name}</button>)}<button type="button" onClick={() => { setPattern(randomPattern()); setCopyMessage(''); }}>🎲 Random groove</button><button type="button" onClick={() => { setPattern(emptyPattern()); setCopyMessage(''); }}>Clear pattern</button></div>
      <div className="sequencer-scroll"><div className="loop-sequencer" role="group" aria-label="16-step beat sequencer"><div className="loop-corner">Instrument</div>{Array.from({ length: 16 }, (_, step) => <div className={`loop-step-number ${playhead === step ? 'playing' : ''}`} key={step}>{step + 1}</div>)}{loopRows.map((row) => <div className="loop-row" key={row}><strong>{row}</strong>{pattern[row].map((on, step) => <button type="button" className={`${on ? 'active' : ''} ${playhead === step ? 'playing' : ''}`} aria-pressed={on} aria-label={`${row}, step ${step + 1}, ${on ? 'on' : 'off'}`} key={step} onClick={() => toggle(row, step)}><span /></button>)}</div>)}</div></div>
      <section className="loop-summary"><div><div className="eyebrow">Pattern summary</div><p>{summary}</p></div><button type="button" className="button button-secondary" onClick={() => void copyPattern()}>Copy pattern</button>{copyMessage ? <span role="status">{copyMessage}</span> : null}</section>
      <div className="premium-learning-grid"><article><h2>What this teaches</h2><p>A loop is a repeating musical idea. Placing kick, snare, hi-hat, clap, and bass on different steps teaches pulse, backbeat, subdivision, and arrangement.</p></article><article><h2>Try this next</h2><p>Start with Pop. Remove one sound at a time and listen to its job, then move one kick or bass step to create your own groove.</p></article></div>
    </section>
  </ToolShell>;
}
