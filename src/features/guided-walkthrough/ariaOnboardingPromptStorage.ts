export const ARIA_ONBOARDING_PROMPT_DISMISSED_KEY = 'jpac:aria:onboardingPromptDismissed:v1';
export const ARIA_ONBOARDING_PROMPT_DISMISSED_VALUE = 'true';

type PromptStorage = Pick<Storage, 'getItem' | 'setItem'>;

function browserStorage(): PromptStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function isAriaOnboardingPromptDismissed(storage: PromptStorage | null = browserStorage()): boolean {
  try {
    return storage?.getItem(ARIA_ONBOARDING_PROMPT_DISMISSED_KEY) === ARIA_ONBOARDING_PROMPT_DISMISSED_VALUE;
  } catch {
    return false;
  }
}

export function dismissAriaOnboardingPrompt(storage: PromptStorage | null = browserStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(ARIA_ONBOARDING_PROMPT_DISMISSED_KEY, ARIA_ONBOARDING_PROMPT_DISMISSED_VALUE);
    return true;
  } catch {
    return false;
  }
}
