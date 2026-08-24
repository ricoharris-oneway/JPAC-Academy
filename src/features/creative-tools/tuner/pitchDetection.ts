export const referencePitches = [
  { note: 'C4', frequency: 261.63 }, { note: 'D4', frequency: 293.66 }, { note: 'E4', frequency: 329.63 }, { note: 'F4', frequency: 349.23 },
  { note: 'G4', frequency: 392 }, { note: 'A4', frequency: 440 }, { note: 'B4', frequency: 493.88 }, { note: 'C5', frequency: 523.25 },
];
const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export function detectPitch(buffer: Float32Array, sampleRate: number) {
  let rms = 0; for (let index = 0; index < buffer.length; index += 1) rms += buffer[index] * buffer[index]; rms = Math.sqrt(rms / buffer.length);
  if (rms < .012) return null;
  const minimumOffset = Math.floor(sampleRate / 1200); const maximumOffset = Math.min(Math.floor(sampleRate / 55), Math.floor(buffer.length / 2));
  let bestOffset = -1; let bestCorrelation = 0;
  for (let offset = minimumOffset; offset <= maximumOffset; offset += 1) {
    let difference = 0; for (let index = 0; index < buffer.length - offset; index += 1) difference += Math.abs(buffer[index] - buffer[index + offset]);
    const correlation = 1 - difference / (buffer.length - offset); if (correlation > bestCorrelation) { bestCorrelation = correlation; bestOffset = offset; }
  }
  if (bestOffset < 0 || bestCorrelation < .78) return null;
  return sampleRate / bestOffset;
}

export function describePitch(frequency: number) {
  const midi = 69 + 12 * Math.log2(frequency / 440); const nearestMidi = Math.round(midi); const cents = Math.round((midi - nearestMidi) * 100);
  return { note: `${names[((nearestMidi % 12) + 12) % 12]}${Math.floor(nearestMidi / 12) - 1}`, cents, frequency };
}
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
