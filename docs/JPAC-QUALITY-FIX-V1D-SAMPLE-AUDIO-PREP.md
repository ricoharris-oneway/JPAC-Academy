# JPAC Quality Fix v1D: Sample Audio Preparation and Mapping

## Decision

Do not use or commit the current WAV files for browser instrument playback yet. The audit found 18 stereo PCM WAV files totaling 37,922,764 bytes (36.17 MiB). Every file is 44.1 kHz, 16-bit audio with only standard `fmt` and `data` RIFF chunks. None contains an embedded `smpl` MIDI unity-note value or other pitch mapping metadata.

The frontend manifest added by this change is deliberately disabled. Its paths are proposed destinations, not claims that converted files exist. No audio loader consumes it yet.

## Exact local inventory

### Piano — 12 files, 23,835,084 bytes (22.73 MiB)

| Current filename | Bytes | Duration | Finding |
| --- | ---: | ---: | --- |
| `anapiano.wav` | 1,588,412 | 9.00s | Preset-style name; pitch unknown |
| `ballad ep.wav` | 3,063,048 | 17.36s | Electric-piano preset/phrase candidate |
| `bellchorus.wav` | 2,262,272 | 12.82s | Effect/preset candidate |
| `chorus hard.wav` | 2,054,636 | 11.65s | Effect/preset candidate |
| `e piano pad.wav` | 709,964 | 4.02s | Pad/preset candidate |
| `early 70_s.wav` | 2,282,432 | 12.94s | Era/preset candidate |
| `hrd vintage.wav` | 2,592,576 | 14.70s | Preset candidate |
| `mr. klank.wav` | 1,644,988 | 9.32s | Preset candidate |
| `neo soul.wav` | 1,497,740 | 8.49s | Style/preset candidate |
| `r&b soft.wav` | 2,227,608 | 12.63s | Style/preset candidate |
| `sweetness.wav` | 2,124,288 | 12.04s | Preset candidate |
| `vintage74.wav` | 1,787,120 | 10.13s | Preset candidate |

These names and durations do not establish one clean root note per file. Before mapping, audition each file, identify whether it is a single sustained note or a phrase, measure its fundamental pitch, trim silence, and verify looping behavior. Files containing chords or phrases should not be assigned to piano keys.

### Guitar — 6 files, 14,087,680 bytes (13.44 MiB)

| Current filename | Bytes | Duration | Finding |
| --- | ---: | ---: | --- |
| `motif gtr 1.wav` | 1,281,412 | 7.26s | Motif/riff candidate |
| `motif gtr 2.wav` | 3,774,584 | 21.40s | Long motif/loop candidate |
| `motif gtr 3.wav` | 1,797,108 | 10.19s | Motif/riff candidate |
| `motif gtr 4.wav` | 1,265,468 | 7.17s | Motif/riff candidate |
| `motif gtr 5.wav` | 4,131,200 | 23.42s | Long motif/loop candidate |
| `motif gtr 6.wav` | 1,837,908 | 10.42s | Motif/riff candidate |

Treat these as previewable motifs, riffs, or loops—not chromatic guitar-note samples. Audition them to record key, tempo, bar length, loop points, and licensing/source provenance before browser use.

## Proposed stable names

Piano note destinations, only after pitch identification: `piano-C2.ogg`, `piano-F2.ogg`, `piano-C3.ogg`, `piano-F3.ogg`, `piano-C4.ogg`, `piano-E4.ogg`, `piano-G4.ogg`, `piano-C5.ogg`, `piano-E5.ogg`, `piano-G5.ogg`, `piano-C6.ogg`, and `piano-C7.ogg`.

Guitar motif destinations: `guitar-motif-01.ogg` through `guitar-motif-06.ogg`. Keep future single-note guitar samples in a separate note manifest and directory.

## Compression recommendation

Prefer Ogg Vorbis for these instrument assets because it supports efficient browser playback and clean looping. A broadly compatible MP3 fallback may be generated only if required by supported-browser testing. Preserve the source WAV files outside Git as archival masters.

If an approved local `ffmpeg` installation becomes available, use a non-destructive output directory and commands such as:

```text
ffmpeg -i input.wav -c:a libvorbis -q:a 5 output.ogg
ffmpeg -i input.wav -c:a libmp3lame -q:a 4 output.mp3
```

Do not overwrite the WAV masters. Loudness normalization, trimming, fades, mono/stereo decisions, loop points, and root-note verification must be reviewed before batch conversion.

## Safety boundary

No audio assets, SQL, database changes, packages, configuration, Supabase changes, recording, uploads, or protected academic logic are included in this preparation change.
