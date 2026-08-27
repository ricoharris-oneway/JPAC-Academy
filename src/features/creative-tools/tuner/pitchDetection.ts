import type { InstructorActivity } from '../shared/InstructorActivityPanel';

export const referencePitches = [
  { note: 'C4', frequency: 261.63 }, { note: 'D4', frequency: 293.66 }, { note: 'E4', frequency: 329.63 }, { note: 'F4', frequency: 349.23 },
  { note: 'G4', frequency: 392 }, { note: 'A4', frequency: 440 }, { note: 'B4', frequency: 493.88 }, { note: 'C5', frequency: 523.25 },
];
const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const tunerGoals = ['Match pitch', 'Warm up voice', 'Tune an instrument', 'Improve pitch control', 'Practice steady notes'] as const;
export type TunerGoal = typeof tunerGoals[number];

export const tunerHelpers = [
  ['Pitch', 'Pitch tells you how high or low a note sounds.'],
  ['Sharp / flat', 'Sharp means slightly high; flat means slightly low compared with the nearest note.'],
  ['Cents', 'Cents measure small pitch differences. Zero cents is the center target.'],
  ['Reference tone', 'A reference tone gives your ear a clear note to match before you sing or play.'],
  ['Steady note', 'A steady note holds its pitch without large jumps or wobbles.'],
] as const;

export const tunerActivities: readonly InstructorActivity[] = [
  { id: 'middle-c', title: 'Match Middle C', coachFocus: 'Connect your ear, voice or instrument, and the tuner display.', task: 'Listen to C4 and match it with one comfortable note.', steps: ['Choose Vocal or Instrument mode.', 'Play the C4 reference.', 'Start the microphone.', 'Sing or play C4 steadily.', 'Adjust toward Centered, then stop.'], successTarget: 'The tuner recognizes C4 and the cents reading moves close to center.', nextMove: 'Repeat three times with a relaxed start.', reflectionPrompt: 'What helped you move closer to the center?' },
  { id: 'steady-note', title: 'Hold a Steady Note', coachFocus: 'Control one pitch without forcing the sound.', task: 'Hold one comfortable note steadily for several seconds.', steps: ['Choose a comfortable pitch.', 'Start the microphone.', 'Breathe or prepare before sounding.', 'Watch for a stable note name.', 'Stop before you feel strain.'], successTarget: 'The note name remains consistent and the feedback recognizes steadiness.', nextMove: 'Repeat softly, then at a comfortable performance volume.', reflectionPrompt: 'What changed when your note became steadier?' },
  { id: 'comfortable-pitch', title: 'Find a Comfortable Pitch', coachFocus: 'Explore pitch safely within an easy range.', task: 'Find a note that feels relaxed and repeatable.', steps: ['Select Vocal mode.', 'Start with a gentle hum.', 'Notice the detected note.', 'Repeat without reaching or pushing.', 'Stop and record the note name in your project.'], successTarget: 'You identify one easy note without tension or strain.', nextMove: 'Use its reference tone and match it again.', reflectionPrompt: 'How did you know the pitch felt comfortable?' },
  { id: 'instrument-note', title: 'Tune One Instrument Note', coachFocus: 'Make small controlled adjustments to one string or instrument note.', task: 'Bring one sustained instrument note toward center.', steps: ['Select Instrument mode.', 'Choose a target reference pitch.', 'Start the microphone.', 'Play one clean sustained note.', 'Adjust gently, then stop the microphone.'], successTarget: 'The reading is steady and moves closer to zero cents.', nextMove: 'Check the same note again after a short pause.', reflectionPrompt: 'Was the note initially sharp, flat, or centered?' },
  { id: 'smooth-control', title: 'Smooth Pitch Control', coachFocus: 'Make small pitch changes while keeping tone steady.', task: 'Approach the center without sudden pitch jumps.', steps: ['Choose one target note.', 'Start the microphone.', 'Hold the sound steadily.', 'Adjust a little at a time.', 'Stop after your best centered attempt.'], successTarget: 'Your cents reading changes smoothly and reaches the center zone.', nextMove: 'Try the same control on a neighboring note.', reflectionPrompt: 'Which adjustment was easiest to control?' },
];

export type PitchDetectionOptions={minimumFrequency?:number;maximumFrequency?:number;quietThreshold?:number;confidenceThreshold?:number};
export type PitchDetectionResult={frequency:number|null;confidence:number;inputLevel:number};

export function calculateInputLevel(buffer:Float32Array):number{
  if(!buffer.length)return 0;
  let sum=0;for(let index=0;index<buffer.length;index+=1)sum+=buffer[index]*buffer[index];
  return Math.sqrt(sum/buffer.length);
}

export function detectPitch(buffer:Float32Array,sampleRate:number,options:PitchDetectionOptions={}):PitchDetectionResult{
  const inputLevel=calculateInputLevel(buffer);const quietThreshold=options.quietThreshold??.008;
  if(buffer.length<64||!Number.isFinite(sampleRate)||sampleRate<=0||inputLevel<quietThreshold)return{frequency:null,confidence:0,inputLevel};
  const minimumFrequency=Math.max(35,options.minimumFrequency??55);const maximumFrequency=Math.min(sampleRate/2,options.maximumFrequency??1200);
  const minimumLag=Math.max(2,Math.floor(sampleRate/maximumFrequency));const maximumLag=Math.min(Math.ceil(sampleRate/minimumFrequency),Math.floor(buffer.length/2));
  if(maximumLag<=minimumLag)return{frequency:null,confidence:0,inputLevel};
  let mean=0;for(let index=0;index<buffer.length;index+=1)mean+=buffer[index];mean/=buffer.length;
  const differences=new Float64Array(maximumLag+1);const normalized=new Float64Array(maximumLag+1);let running=0;
  normalized[0]=1;
  for(let lag=1;lag<=maximumLag;lag+=1){let difference=0;const samples=buffer.length-lag;for(let index=0;index<samples;index+=1){const delta=(buffer[index]-mean)-(buffer[index+lag]-mean);difference+=delta*delta}differences[lag]=difference;running+=difference;normalized[lag]=running>0?difference*lag/running:1}
  const threshold=1-(options.confidenceThreshold??.82);let selectedLag=-1;
  for(let lag=minimumLag;lag<maximumLag;lag+=1){if(normalized[lag]<threshold){while(lag+1<=maximumLag&&normalized[lag+1]<normalized[lag])lag+=1;selectedLag=lag;break}}
  if(selectedLag<0){let bestValue=1;for(let lag=minimumLag;lag<=maximumLag;lag+=1){if(normalized[lag]<bestValue){bestValue=normalized[lag];selectedLag=lag}}}
  if(selectedLag<0)return{frequency:null,confidence:0,inputLevel};
  const confidence=Math.max(0,Math.min(1,1-normalized[selectedLag]));
  if(confidence<(options.confidenceThreshold??.82))return{frequency:null,confidence,inputLevel};
  const left=normalized[Math.max(minimumLag,selectedLag-1)];const center=normalized[selectedLag];const right=normalized[Math.min(maximumLag,selectedLag+1)];const denominator=left-2*center+right;
  const adjustedLag=selectedLag+(Math.abs(denominator)>1e-9?.5*(left-right)/denominator:0);const frequency=sampleRate/adjustedLag;
  return Number.isFinite(frequency)&&frequency>=minimumFrequency&&frequency<=maximumFrequency?{frequency,confidence,inputLevel}:{frequency:null,confidence:0,inputLevel};
}

export function describePitch(frequency: number) {
  const midi = 69 + 12 * Math.log2(frequency / 440); const nearestMidi = Math.round(midi); const cents = Math.round((midi - nearestMidi) * 100);
  return { note: `${names[((nearestMidi % 12) + 12) % 12]}${Math.floor(nearestMidi / 12) - 1}`, cents, frequency };
}
export function centsOffset(frequency:number,referenceFrequency:number):number{return Math.round(1200*Math.log2(frequency/referenceFrequency))}
export function tuningFeedback(cents: number | null, stable: boolean) {
  if (cents === null) return stable ? 'Try a stronger steady note' : 'Listening…';
  if (!stable) return 'Try holding the note steady';
  if (Math.abs(cents) <= 5) return 'Centered';
  return cents > 0 ? 'A little sharp' : 'A little flat';
}
export function practicePrompt(cents: number | null, stable: boolean, mode: 'Vocal' | 'Instrument') {
  if (cents === null) return mode === 'Vocal' ? 'Sing one comfortable note with a clear, steady vowel.' : 'Play one clean note and let it ring without changing finger pressure.';
  if (!stable) return 'Relax, take a breath, and hold one note steadily for two seconds.';
  if (Math.abs(cents) <= 5) return 'Great center! Repeat the note three times and aim for the same steady result.';
  return cents > 0 ? 'Ease the pitch slightly lower while keeping the sound steady.' : 'Raise the pitch gently while keeping the sound relaxed.';
}
