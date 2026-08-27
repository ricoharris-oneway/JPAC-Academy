# JPAC Quality Fix v1E: Local Recording and Playback

This frontend-only foundation adds manual, session-memory practice recording to Smart Tuner and Choreo Mirror. It uses the browser `MediaRecorder` API and the stream the student already approved.

- Smart Tuner records audio tracks only after Start Mic and Record are selected.
- Choreo Mirror records video tracks only after Start Camera and Record are selected. Its camera request remains `audio: false`.
- Recordings remain Blob/Object URLs in the current page session. Preview, explicit download, and clear controls are available after a take.
- Replaced and unmounted Object URLs are revoked. Reset clears the current take; tool Stop finalizes a recording and stops the owned media tracks.
- No recording auto-start, upload, account sync, assignment attachment, extra-credit attachment, localStorage, or IndexedDB persistence is included.

No SQL, database, package, configuration, Supabase, XP, progress, mastery, certificate, enrollment, submission, review, or curriculum behavior changed.
