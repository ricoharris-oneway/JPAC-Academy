# JPAC Aria v4: Click-to-Talk Voice

## What it does

Students can select **Hear Aria** inside the existing Aria guide, full pathway, or onboarding tour to hear the current deterministic guidance message. While speech is active, the control becomes **Stop**. Speech never starts on render or page load.

## Browser-only voice

Voice playback uses only the browser’s `window.speechSynthesis` and `SpeechSynthesisUtterance`. It does not call an external text-to-speech service, AI provider, API, or network endpoint. Suggested comfortable defaults are applied: rate `0.95`, pitch `1`, and volume `1`.

If browser speech synthesis is unavailable, the guide remains usable and displays: “Voice playback is not available in this browser.”

## Cancel behavior

Aria speech is cancelled when the student selects Stop, closes the popup, changes a guide/tour step, switches guide modes, navigates to another route, or unmounts the guide.

## Safety boundaries

- Manual click-to-talk only; no autoplay
- Deterministic, prewritten Aria guidance text only
- No student names, emails, grades, XP, progress, submissions, or personal data spoken
- No microphone, audio upload, recording, or MediaRecorder
- No database or new browser-storage state
- No AI, Live AI, external voice API, Supabase, SQL, or academic action
- Existing approved Aria image, page guidance, onboarding, prompt, pathway, and safety copy remain unchanged

## How students use it

Open Aria, choose page guidance, the JPAC Tour, or the full pathway, then select **Hear Aria**. Select **Stop** to end playback immediately.

## Future v5 ideas — documentation only

- JPAC-recorded Aria voice clips
- Professional voiceover audio assets
- Page-specific Aria phrases
- Voice settings toggle
- Parent/student welcome narration
- Teacher-facing narration
- Live AI voice only after environment setup is stable
