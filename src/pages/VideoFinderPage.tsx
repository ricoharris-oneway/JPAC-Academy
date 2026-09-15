import { useState } from 'react';
import { memberPrograms } from '../data/memberPrograms';

export function VideoFinderPage() {
  const [program, setProgram] = useState('Singing');
  const [topic, setTopic] = useState('');
  return <section className="card card-pad"><div className="eyebrow">Staff resource discovery</div><h1>Video Finder Helper</h1><p>Find candidate resources for staff review. Opening a search does not add media to a course or change module readiness.</p><div className="policy-editor"><label>Program<select value={program} onChange={e => setProgram(e.target.value)}>{memberPrograms.map(item => <option key={item.slug}>{item.title}</option>)}</select></label><label>Learning topic<input value={topic} maxLength={200} placeholder="For example: beginner breath support" onChange={e => setTopic(e.target.value)} /></label><a className="button button-primary" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${program} ${topic.trim()} tutorial`)}`} target="_blank" rel="noreferrer">Search video resources ↗</a></div><p>Review accuracy, age suitability, accessibility, and usage permission before using your existing curriculum approval workflow.</p></section>;
}
