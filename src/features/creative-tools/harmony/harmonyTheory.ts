export const harmonyKeys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
export const harmonyStyles = ['Pop', 'R&B', 'Gospel', 'Blues', 'Country', 'Cinematic'] as const;
export type HarmonyKey = typeof harmonyKeys[number];
export type HarmonyStyle = typeof harmonyStyles[number];

const chromatic = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const majorScale = [0, 2, 4, 5, 7, 9, 11];
const patterns: Record<HarmonyStyle, { roman: string[]; degrees: number[]; qualities: string[]; lesson: string; prompt: string }> = {
  Pop: { roman: ['I', 'V', 'vi', 'IV'], degrees: [0, 4, 5, 3], qualities: ['', '', 'm', ''], lesson: 'Pop progressions often repeat a clear four-chord cycle that supports a memorable melody.', prompt: 'Play each chord for four beats, then hum a short hook over the loop.' },
  'R&B': { roman: ['ii7', 'V7', 'Imaj7', 'vi7'], degrees: [1, 4, 0, 5], qualities: ['m7', '7', 'maj7', 'm7'], lesson: 'Seventh chords add color and smooth voice movement between R&B harmonies.', prompt: 'Hold the top note of each chord and listen for the smoothest path to the next.' },
  Gospel: { roman: ['I', 'iii7', 'IV', 'iv'], degrees: [0, 2, 3, 3], qualities: ['', 'm7', '', 'm'], lesson: 'Gospel harmony can create lift and emotion by moving between major and borrowed minor color.', prompt: 'Play slowly and notice how the final minor chord creates emotion before returning home.' },
  Blues: { roman: ['I7', 'IV7', 'I7', 'V7'], degrees: [0, 3, 0, 4], qualities: ['7', '7', '7', '7'], lesson: 'Dominant seventh chords give blues its tension, movement, and expressive sound.', prompt: 'Clap four steady beats per chord and improvise a one-line call and response.' },
  Country: { roman: ['I', 'IV', 'V', 'I'], degrees: [0, 3, 4, 0], qualities: ['', '', '', ''], lesson: 'Country harmony often uses strong primary chords that make the song easy to follow and sing.', prompt: 'Try a steady down-down-up-up-down-up rhythm across the progression.' },
  Cinematic: { roman: ['vi', 'IV', 'I', 'V'], degrees: [5, 3, 0, 4], qualities: ['m', '', '', ''], lesson: 'Starting on the relative minor creates a dramatic journey before the progression reaches home.', prompt: 'Play softly, then grow louder on each chord to create a scene-changing build.' },
};

export function buildProgression(key: HarmonyKey, style: HarmonyStyle) {
  const root = chromatic.indexOf(key);
  const pattern = patterns[style];
  const chords = pattern.degrees.map((degree, index) => `${chromatic[(root + majorScale[degree]) % 12]}${pattern.qualities[index]}`);
  return { ...pattern, chords };
}
