# Jianpu Lyric Player

A browser-based music timeline player that maps lyric characters to precise musical positions. A single master playback clock drives the cursor, lyric highlighting, transport state, and automatic measure scrolling.

The repository uses fictional public demo data only. Commercial scores, complete commercial lyrics, audio, and manually verified private fixtures are excluded from version control.

## Run locally

Requirements: Node.js 20 or newer and npm.

```powershell
npm install
npm run dev
```

Open the local URL shown by Vite. On Windows PowerShell systems that block `npm.ps1`, use `npm.cmd` instead:

```powershell
npm.cmd install
npm.cmd run dev
```

Create a production build with:

```powershell
npm.cmd run build
npm.cmd run preview
```

## MVP features

- JSON-backed `SongDocument` loading and validation.
- 4/4 timing with sixteenth-note lyric onsets and PPQ/tick canonical time.
- One `MasterPlaybackClock` for play, pause, restart, BPM changes, and seek.
- Current section, measure, beat, subdivision, and lyric derivation.
- Lyric sustain from one onset until the next onset.
- Previous/current/next measure context with automatic container scrolling.
- Precise `1 e & a` debug view and a compact view.
- A fictional sequence with `VERSE → CHORUS → VERSE → CHORUS → CHORUS → OUTRO`.
- An OMR parser boundary that intentionally returns “not implemented.”

## Architecture

```text
SongDocument JSON
       ↓
TimelineEngine
       ↓
MasterPlaybackClock
       ↓
LyricPlaybackController
       ↓
Browser UI
```

`TimelineEngine` expands the performance sequence and derives musical state from ticks. `MasterPlaybackClock` is the only advancing time source. The controller samples that clock with `requestAnimationFrame` and publishes derived state to the UI; the UI never owns lyric timers.

Future image processing stays outside the playback path:

```text
Image / OCR / OMR → SongDocument → existing player
```

## SongDocument format

The canonical position of each lyric event is `onsetTicks`, relative to its measure. `step16` is an optional human-review field for current 4/4 fixtures and must agree with `onsetTicks`.

With `ppq: 480`:

- quarter note = 480 ticks;
- eighth note = 240 ticks;
- sixteenth note = 120 ticks;
- one 4/4 measure = 1920 ticks.

Minimal example:

```json
{
  "version": 1,
  "metadata": {
    "title": "Demo",
    "timeSignature": { "numerator": 4, "denominator": 4 },
    "ppq": 480,
    "defaultBpm": 72
  },
  "sections": [
    {
      "id": "verse",
      "type": "VERSE",
      "measures": [
        {
          "index": 1,
          "lengthTicks": 1920,
          "lyricEvents": [
            { "id": "v-1", "text": "今", "step16": 0, "onsetTicks": 0 },
            { "id": "v-2", "text": "天", "step16": 4, "onsetTicks": 480 }
          ]
        }
      ]
    }
  ],
  "performanceSequence": [
    { "sectionId": "verse" }
  ]
}
```

Validation requires unique section and lyric-event IDs, ascending measure indices and onsets, valid measure-relative ticks, declared section references, and agreement between `step16` and `onsetTicks` when both are present.

## Quality checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run e2e
```

Install the Playwright browser once before the first E2E run:

```powershell
npx.cmd playwright install chromium
```

## Private development material

Keep non-redistributable material in ignored `private/` or `local-fixtures/` directories. Do not commit commercial scores, commercial audio, complete commercial lyrics, credentials, or local caches.

## License

GPL-2.0-only. See [LICENSE](LICENSE).
