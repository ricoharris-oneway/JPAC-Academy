type WorkflowStep = { title: string; detail: string };

const workflows: Record<string, WorkflowStep[]> = {
  'Harmony Builder': [
    { title: 'Choose your goal', detail: 'Pick a key and musical style.' },
    { title: 'Try the tool', detail: 'Generate a chord progression.' },
    { title: 'Practice', detail: 'Play or read the chords in order.' },
    { title: 'Reflect', detail: 'Write one lyric or melody idea locally.' },
    { title: 'Next action', detail: 'Copy your progression and practice notes.' },
  ],
  'Virtual Piano': [
    { title: 'Choose your goal', detail: 'Select a sound and comfortable octave.' },
    { title: 'Try the tool', detail: 'Play a few notes on the keyboard.' },
    { title: 'Practice', detail: 'Try a chord pad and a short pattern.' },
    { title: 'Reflect', detail: 'Notice which notes or chords felt strongest.' },
    { title: 'Next action', detail: 'Reset and try the pattern again.' },
  ],
  'Smart Metronome': [
    { title: 'Choose your goal', detail: 'Set a tempo and time signature.' },
    { title: 'Try the tool', detail: 'Start the beat and clap or count.' },
    { title: 'Practice', detail: 'Keep your timing steady for a short round.' },
    { title: 'Reflect', detail: 'Notice where you rushed or slowed down.' },
    { title: 'Next action', detail: 'Raise or lower the tempo and repeat.' },
  ],
  'Notation Trainer Pro': [
    { title: 'Choose your goal', detail: 'Select a clef and practice mode.' },
    { title: 'Try the tool', detail: 'Answer the current challenge.' },
    { title: 'Practice', detail: 'Review the feedback and note explanation.' },
    { title: 'Reflect', detail: 'Add a simple note or rest to the score writer.' },
    { title: 'Next action', detail: 'Start another challenge round.' },
  ],
  'Loop Builder / Beat Lab': [
    { title: 'Choose your goal', detail: 'Pick a style or groove preset.' },
    { title: 'Try the tool', detail: 'Edit steps in the beat grid.' },
    { title: 'Practice', detail: 'Play the loop and follow the playhead.' },
    { title: 'Reflect', detail: 'Copy the pattern summary for local notes.' },
    { title: 'Next action', detail: 'Change one row to create a variation.' },
  ],
  'Smart Tuner': [
    { title: 'Choose your goal', detail: 'Choose Vocal or Instrument mode.' },
    { title: 'Try the tool', detail: 'Start the mic, then hold one steady note.' },
    { title: 'Practice', detail: 'Watch the sharp and flat feedback.' },
    { title: 'Reflect', detail: 'Adjust gently toward the center.' },
    { title: 'Next action', detail: 'Stop the mic when your round is complete.' },
  ],
  'Virtual Guitar / Instrument Studio': [
    { title: 'Choose your goal', detail: 'Select a guitar sound.' },
    { title: 'Try the tool', detail: 'Pick and strum a chord shape.' },
    { title: 'Practice', detail: 'Explore notes across the fretboard.' },
    { title: 'Reflect', detail: 'Notice which chord change needs more time.' },
    { title: 'Next action', detail: 'Practice one chord change slowly.' },
  ],
  'Choreo Mirror': [
    { title: 'Choose your goal', detail: 'Select a practice mode.' },
    { title: 'Try the tool', detail: 'Start the camera when you are ready.' },
    { title: 'Practice', detail: 'Follow the Reference Frame beside you.' },
    { title: 'Reflect', detail: 'Watch your Tracking Frame feedback.' },
    { title: 'Next action', detail: 'Stop the camera after your practice round.' },
  ],
};

export function WorkflowGuide({ toolTitle }: { toolTitle: string }) {
  const steps = workflows[toolTitle];
  if (!steps) return null;

  return <section className="creative-workflow-guide" aria-labelledby="creative-workflow-title">
    <div className="creative-workflow-heading">
      <div><div className="eyebrow">Creative Workflow</div><h2 id="creative-workflow-title">How to use this tool</h2></div>
      <small>Five local-practice steps</small>
    </div>
    <ol>{steps.map((step, index) => <li key={step.title}><span>{index + 1}</span><div><strong>{step.title}</strong><small>{step.detail}</small></div></li>)}</ol>
  </section>;
}
