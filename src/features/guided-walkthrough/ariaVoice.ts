export type AriaVoiceEnvironment = {
  synthesis: Pick<SpeechSynthesis, 'speak' | 'cancel' | 'getVoices'>;
  createUtterance: (text: string) => SpeechSynthesisUtterance;
};

const preferredAriaVoiceNames = [
  'samantha', 'victoria', 'susan', 'karen', 'moira', 'tessa', 'fiona', 'ava', 'allison', 'serena',
  'zira', 'jenny', 'aria', 'salli', 'joanna', 'kendra', 'kimberly', 'ivy', 'emma', 'olivia',
];

const additionalWarmVoiceNames = ['hazel', 'shelley', 'sonia', 'natasha', 'michelle', 'linda', 'amy'];

function isEnglishVoice(voice: SpeechSynthesisVoice): boolean {
  return voice.lang.toLowerCase().startsWith('en');
}

function nameIncludes(voice: SpeechSynthesisVoice, names: string[]): boolean {
  const normalizedName = voice.name.toLowerCase();
  return names.some((name) => normalizedName.includes(name));
}

export function selectPreferredAriaVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const englishVoices = voices.filter(isEnglishVoice);
  return englishVoices.find((voice) => nameIncludes(voice, preferredAriaVoiceNames))
    ?? englishVoices.find((voice) => nameIncludes(voice, additionalWarmVoiceNames))
    ?? englishVoices[0];
}

function browserVoiceEnvironment(): AriaVoiceEnvironment | null {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return null;
    return { synthesis: window.speechSynthesis, createUtterance: (text) => new SpeechSynthesisUtterance(text) };
  } catch {
    return null;
  }
}

export function speakAriaGuidance(text: string, onEnd: () => void, environment: AriaVoiceEnvironment | null = browserVoiceEnvironment()): boolean {
  try {
    if (!environment || !text.trim()) return false;
    environment.synthesis.cancel();
    const utterance = environment.createUtterance(text);
    utterance.voice = selectPreferredAriaVoice(environment.synthesis.getVoices()) ?? null;
    utterance.rate = 0.95;
    utterance.pitch = 1.08;
    utterance.volume = 1;
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    environment.synthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function cancelAriaVoice(environment: Pick<SpeechSynthesis, 'cancel'> | null = browserVoiceEnvironment()?.synthesis ?? null): boolean {
  try {
    if (!environment) return false;
    environment.cancel();
    return true;
  } catch {
    return false;
  }
}
