import type { InstructorActivity } from '../shared/InstructorActivityPanel';

export const harmonyKeys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
export const harmonyStyles = ['Pop', 'R&B', 'Gospel', 'Blues', 'Country', 'Cinematic'] as const;
export type HarmonyKey = typeof harmonyKeys[number];
export type HarmonyStyle = typeof harmonyStyles[number];
export const harmonyGoals = ['Write a verse', 'Build a chorus', 'Practice chord progressions', 'Create a bridge'] as const;
export type HarmonyGoal = typeof harmonyGoals[number];

const chromatic = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const majorScale = [0, 2, 4, 5, 7, 9, 11];
type Feel = { roman: string[]; degrees: number[]; qualities: string[]; emotion: string; suggestedUse: string };
const patterns: Record<HarmonyStyle, { feels: Feel[]; lesson: string; prompt: string }> = {
  Pop: { feels: [{ roman: ['I', 'V', 'vi', 'IV'], degrees: [0, 4, 5, 3], qualities: ['', '', 'm', ''], emotion: 'Bright, familiar, and uplifting', suggestedUse: 'Chorus or hook' }, { roman: ['vi', 'IV', 'I', 'V'], degrees: [5, 3, 0, 4], qualities: ['m', '', '', ''], emotion: 'Reflective with a hopeful lift', suggestedUse: 'Verse or pre-chorus' }], lesson: 'Pop progressions often repeat a clear four-chord cycle that supports a memorable melody.', prompt: 'Play each chord for four beats, then hum a short hook over the loop.' },
  'R&B': { feels: [{ roman: ['ii7', 'V7', 'Imaj7', 'vi7'], degrees: [1, 4, 0, 5], qualities: ['m7', '7', 'maj7', 'm7'], emotion: 'Smooth, warm, and flowing', suggestedUse: 'Verse or turnaround' }, { roman: ['Imaj7', 'vi7', 'ii7', 'V7'], degrees: [0, 5, 1, 4], qualities: ['maj7', 'm7', 'm7', '7'], emotion: 'Soulful and resolved', suggestedUse: 'Chorus or intro' }], lesson: 'Seventh chords add color and smooth voice movement between R&B harmonies.', prompt: 'Hold the top note of each chord and listen for the smoothest path to the next.' },
  Gospel: { feels: [{ roman: ['I', 'iii7', 'IV', 'iv'], degrees: [0, 2, 3, 3], qualities: ['', 'm7', '', 'm'], emotion: 'Lifted, expressive, and heartfelt', suggestedUse: 'Bridge or testimony section' }, { roman: ['I', 'vi7', 'ii7', 'V7'], degrees: [0, 5, 1, 4], qualities: ['', 'm7', 'm7', '7'], emotion: 'Moving forward with joyful expectation', suggestedUse: 'Intro or turnaround' }], lesson: 'Gospel harmony can create lift and emotion by moving between major and borrowed minor color.', prompt: 'Play slowly and notice how the final minor chord creates emotion before returning home.' },
  Blues: { feels: [{ roman: ['I7', 'IV7', 'I7', 'V7'], degrees: [0, 3, 0, 4], qualities: ['7', '7', '7', '7'], emotion: 'Bold, conversational, and expressive', suggestedUse: 'Verse or instrumental break' }, { roman: ['I7', 'I7', 'IV7', 'V7'], degrees: [0, 0, 3, 4], qualities: ['7', '7', '7', '7'], emotion: 'Grounded with a strong turnaround', suggestedUse: 'Intro or ending' }], lesson: 'Dominant seventh chords give blues its tension, movement, and expressive sound.', prompt: 'Clap four steady beats per chord and improvise a one-line call and response.' },
  Country: { feels: [{ roman: ['I', 'IV', 'V', 'I'], degrees: [0, 3, 4, 0], qualities: ['', '', '', ''], emotion: 'Open, direct, and reassuring', suggestedUse: 'Verse or chorus' }, { roman: ['I', 'V', 'IV', 'I'], degrees: [0, 4, 3, 0], qualities: ['', '', '', ''], emotion: 'Driving with a homecoming feel', suggestedUse: 'Chorus or outro' }], lesson: 'Country harmony often uses strong primary chords that make the song easy to follow and sing.', prompt: 'Try a steady down-down-up-up-down-up rhythm across the progression.' },
  Cinematic: { feels: [{ roman: ['vi', 'IV', 'I', 'V'], degrees: [5, 3, 0, 4], qualities: ['m', '', '', ''], emotion: 'Dramatic, searching, and expansive', suggestedUse: 'Scene build or chorus' }, { roman: ['I', 'iii', 'vi', 'IV'], degrees: [0, 2, 5, 3], qualities: ['', 'm', 'm', ''], emotion: 'Hopeful with a thoughtful turn', suggestedUse: 'Intro or bridge' }], lesson: 'Starting on the relative minor creates a dramatic journey before the progression reaches home.', prompt: 'Play softly, then grow louder on each chord to create a scene-changing build.' },
};

export function buildProgression(key: HarmonyKey, style: HarmonyStyle, version = 0) {
  const root = chromatic.indexOf(key);
  const pattern = patterns[style];
  const feel = pattern.feels[Math.abs(version) % pattern.feels.length];
  const chords = feel.degrees.map((degree, index) => `${chromatic[(root + majorScale[degree]) % 12]}${feel.qualities[index]}`);
  return { ...feel, lesson: pattern.lesson, prompt: pattern.prompt, chords };
}

export const harmonyHelpers = [
  ['Key', 'The key is the musical home base that gives the chords their note names.'],
  ['Chords', 'Chords combine notes to create color, support a melody, and shape emotion.'],
  ['Roman numerals', 'Roman numerals show each chord’s job, so a pattern can move to another key.'],
  ['Progression', 'A progression is the order of chords that carries a section of a song.'],
  ['Song section', 'A verse tells the story, a chorus delivers the main idea, and a bridge creates contrast.'],
] as const;

export const harmonyActivities: readonly InstructorActivity[] = [
  { id: 'chorus', title: 'Build a Chorus', coachFocus: 'Create harmony that supports a memorable main idea.', task: 'Choose a bright or powerful progression for a chorus.', steps: ['Choose a key that feels comfortable.', 'Select Pop, Gospel, or R&B.', 'Generate a progression.', 'Write one short hook idea.', 'Read the chords aloud in order.'], successTarget: 'The progression feels repeatable and your hook fits its emotional direction.', nextMove: 'Try another feel and decide which version sounds more like a chorus.', reflectionPrompt: 'Which chord feels like the emotional high point?' },
  { id: 'verse', title: 'Create a Verse Mood', coachFocus: 'Use harmony to support storytelling.', task: 'Build a verse progression with space for lyrics.', steps: ['Choose Write a verse.', 'Pick a key and style.', 'Generate the progression.', 'Write one story-opening lyric.', 'Notice where the harmony feels settled.'], successTarget: 'Your lyric has room to be heard and the progression supports its mood.', nextMove: 'Hum the lyric over each chord for four beats.', reflectionPrompt: 'What mood does your verse create?' },
  { id: 'bridge', title: 'Bridge with Contrast', coachFocus: 'Change the musical feeling without losing the song.', task: 'Create a contrasting bridge progression.', steps: ['Choose Create a bridge.', 'Start with the song’s current key.', 'Try a different style or feel.', 'Write a line that changes the point of view.', 'Compare it with your verse or chorus.'], successTarget: 'The bridge feels different but can still return naturally to the main section.', nextMove: 'End the bridge on the chord that creates the strongest pull home.', reflectionPrompt: 'What changed most: emotion, chord order, or lyric idea?' },
  { id: 'emotion', title: 'Match Chords to Emotion', coachFocus: 'Connect musical choices with a feeling.', task: 'Choose an emotion, then find a progression that supports it.', steps: ['Name the emotion in your notes.', 'Choose a matching style.', 'Generate a progression.', 'Read the emotional description.', 'Try another feel and compare.'], successTarget: 'You can explain why one progression fits the emotion better.', nextMove: 'Change the key and listen or imagine how the color changes.', reflectionPrompt: 'Which chord quality best matched your emotion?' },
  { id: 'song-idea', title: 'Progression to Song Idea', coachFocus: 'Turn theory into a small original creative idea.', task: 'Develop one progression into a lyric or melody seed.', steps: ['Choose a creative goal.', 'Generate a progression.', 'Pick a suggested song section.', 'Write one lyric or melody idea.', 'Save the project locally.'], successTarget: 'Your saved project connects chords, a song section, and one original idea.', nextMove: 'Open Virtual Piano or Guitar later and try the chord order.', reflectionPrompt: 'What will you develop first when you return?' },
];
