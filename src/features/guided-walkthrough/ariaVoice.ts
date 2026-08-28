export type AriaVoiceEnvironment = {
  synthesis: Pick<SpeechSynthesis, 'speak' | 'cancel'>;
  createUtterance: (text: string) => SpeechSynthesisUtterance;
};

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
    utterance.rate = 0.95;
    utterance.pitch = 1;
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
