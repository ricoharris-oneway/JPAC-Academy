# JPAC Aria v5: Preferred Voice

## What changed

Aria now prefers a warmer, female-sounding English browser voice when one is available. Selection uses only voice names and language metadata supplied by the device's browser through `speechSynthesis`.

Browser voice inventories vary by device, operating system, and browser. Gender metadata is not reliably exposed, so this is a preference rather than a guarantee. If a recognized preferred voice is unavailable, Aria uses another English browser voice. If no English voice is listed, the utterance leaves its voice unset and uses the browser default.

## Safety boundaries

- Voice remains manual click-to-talk only, with no autoplay.
- Spoken text remains deterministic, prewritten Aria guidance only.
- No external voice API, AI provider, or network request is used.
- No microphone, recording, audio upload, or MediaRecorder is used.
- No academic data is spoken or stored.
- No database, Supabase, SQL, or voice-choice persistence was added.

## Future option

JPAC-recorded Aria voice clips could provide a consistent voice identity across devices in a separately reviewed future phase.
