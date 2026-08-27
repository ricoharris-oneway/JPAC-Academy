import { calculateInputLevel, centsOffset, describePitch, detectPitch } from './pitchDetection';

function sineWave(frequency: number, sampleRate = 48_000, length = 4096, amplitude = 0.5) {
  return Float32Array.from({ length }, (_, index) => amplitude * Math.sin(2 * Math.PI * frequency * index / sampleRate));
}

function deterministicNoise(length = 4096, amplitude = 0.12) {
  let seed = 1729;
  return Float32Array.from({ length }, () => {
    seed = (seed * 16_807) % 2_147_483_647;
    return ((seed / 2_147_483_647) * 2 - 1) * amplitude;
  });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const a4 = detectPitch(sineWave(440), 48_000);
assert(a4.frequency !== null && Math.abs(a4.frequency - 440) < 1, `Expected A4 near 440 Hz, received ${a4.frequency}`);
assert(a4.confidence > 0.9, `Expected strong A4 confidence, received ${a4.confidence}`);
assert(describePitch(a4.frequency).note === 'A4', 'Expected 440 Hz to be named A4.');

for (const [name, frequency] of [['C4', 261.63], ['E4', 329.63]] as const) {
  const result = detectPitch(sineWave(frequency), 48_000);
  assert(result.frequency !== null && Math.abs(result.frequency - frequency) < 1, `Expected ${name} near ${frequency} Hz.`);
  assert(describePitch(result.frequency).note === name, `Expected ${frequency} Hz to be named ${name}.`);
}

const quiet = detectPitch(sineWave(440, 48_000, 4096, 0.001), 48_000);
assert(quiet.frequency === null && quiet.inputLevel < 0.008, 'Expected quiet input to be rejected.');

const noise = detectPitch(deterministicNoise(), 48_000);
assert(noise.frequency === null && noise.confidence < 0.82, 'Expected unpitched noise to be low confidence.');

assert(centsOffset(440, 440) === 0, 'Expected matching frequencies to be zero cents apart.');
assert(Math.abs(centsOffset(466.16, 440) - 100) <= 1, 'Expected A#4 to be about 100 cents above A4.');

const level = calculateInputLevel(sineWave(440, 48_000, 4096, 0.5));
assert(level > 0.34 && level < 0.36, `Expected RMS input level near 0.354, received ${level}`);

console.log('Smart Tuner pitch detection tests passed.');
