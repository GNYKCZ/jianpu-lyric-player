# Product Requirements

## Product goal

Build a reusable music-timeline player that maps lyric characters to precise musical positions. During playback it highlights the active lyric character and keeps the active measure in view. The player must remain independent of future image, OCR, and OMR pipelines.

The initial MVP consumes manually curated structured data. Long term, it accepts JPG, PNG, or PDF numbered notation and produces a `SongDocument` that the same player can render.

## Architecture

```text
SongDocument JSON
       |
       +--> LyricTimelineRenderer
       |
       +--> PlaybackClockAdapter --> playback engine
```

Data production and consumption are deliberately separate. Future processing follows:

```text
Image -> preprocessing -> layout analysis -> rhythm parser + lyric OCR
      -> alignment -> rhythm validation -> SongDocument -> player
```

The image pipeline must not manipulate player DOM state directly.

## SongDocument and timing

The domain model contains metadata, sections, measures, lyric events, and a performance sequence. A lyric event includes its text, canonical `onsetTicks`, and may retain `step16` for review and deterministic tests.

Use PPQ ticks as the canonical model, with `PPQ = 480` by default:

- quarter note: 480 ticks
- eighth note: 240 ticks
- sixteenth note: 120 ticks

For the initial 4/4 fixture representation, each measure has 16 steps and `onsetTicks = absoluteStep16 * 120`. The player must not assume future songs are limited to 16 steps.

Example public fixture (fictional lyrics):

```text
step16: 0  1  2  3 | 4  5  6  7 | 8  9 10 11 | 12 13 14 15
lyrics:  ·  ·  ·  · | 今  ·  天  阳 | ·  ·  光  · | ·  ·  ·  ·
```

An active lyric begins at its onset and remains active until the next lyric onset; empty steps must not clear the highlight.

## Master clock

There must be one musical time source. The metronome, lyric highlighting, cursor, and scrolling derive their state from `currentTicks` on that master clock. UI rendering may use `requestAnimationFrame`, but separate timers must not synchronize these features. Tempo changes alter tick-to-real-time mapping, never the stored musical positions. Pause, resume, restart, and seek must preserve musical position without drift.

The default audible 4/4 practice pulse uses eighth notes (`1 & 2 & 3 & 4 &`). Beat 1 is a heavy drum-style primary accent, beat 3 is a medium secondary drum accent, beats 2 and 4 are lighter drum hits, and each offbeat is a soft closed-hi-hat-style subdivision cue. Audio scheduling must derive from the master clock rather than introduce another musical timer.

## UI goals

The practice player provides play, pause, restart, tempo adjustment, and a path for measure/time seeking. It shows the previous, current, and next measures; the current measure scrolls into view on measure changes. A concise view may show beat and eighth-note landmarks, while a debug view exposes all `1 e & a` subdivisions, ticks, measure, beat, active lyric event, and event identifiers.

## OMR direction

Future score ingestion is a separate service with image preprocessing, layout analysis, numbered-notation rhythm parsing, lyric OCR with bounding boxes and confidence, alignment, and rhythm validation. Invalid measures must be reported for correction rather than silently accepted. The interface boundary is conceptually:

```ts
interface ScoreImageParser {
  parse(input: ImageInput): Promise<SongDocument>;
}
```

## Open-source references

- Groove Scribe: playback and rhythm-UI reference; GPL-2.0.
- PaddleOCR: future lyric OCR reference; Apache-2.0.
- OrpheusNet: numbered-notation OMR reference; MIT.
- jianpu-ly: notation rules and synthetic-data reference; Apache-2.0.
- Audiveris: correction-oriented OMR architecture reference.

These are references, not dependencies. Preserve notices and verify license compatibility before importing third-party code.

## Development phases

1. Inspect the host codebase and its playback and test architecture.
2. Define and validate `SongDocument`, lyric events, and performance sequence.
3. Render static 16-step measures from JSON.
4. Implement a master-clock adapter.
5. Add lyric highlighting and measure scrolling.
6. Add transport, tempo, restart, and seeking controls.
7. Add deterministic timing tests and practical end-to-end coverage.
8. Define the OMR parser boundary without training or implementing OMR in the MVP.

## Acceptance criteria

- Structured song data loads and renders correct 4/4 subdivisions.
- Sixteenth-note lyric onsets remain accurate in all display modes.
- An active lyric persists across empty steps until the next onset.
- Playback, pause/resume, seek, restart, and tempo changes do not introduce timing drift.
- Reused musical timing can support distinct lyric variants and repeated sections.
- Current-measure scrolling displays surrounding context.
- Timing logic has deterministic unit tests and a browser smoke test covers continuous playback.
- Public documentation and fixtures contain no unlicensed commercial score, audio, or complete lyrics.
