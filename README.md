# Jianpu Lyric Player

A reusable music-timeline player for mapping lyrics to precise musical positions and highlighting and scrolling them during playback.

## Status

Repository initialization only. No playback, timeline, OCR, OMR, or product implementation is included yet.

## Design direction

The player will consume a structured `SongDocument` rather than score images or OCR DOM output. A single master playback clock will derive the current musical position, lyric highlight, cursor, metronome, and measure scrolling. Future score-image processing will produce the same document schema through a separate OMR pipeline.

See [the public product requirements](docs/PRODUCT_REQUIREMENTS.md) for the architecture, timing model, development phases, and acceptance criteria.

## Privacy and copyright

This public repository intentionally excludes commercial scores, commercial audio, complete commercial lyrics, and their manually verified timing fixtures. Private source material belongs in ignored `private/` or `local-fixtures/` directories.

## License

GPL-2.0-only. See [LICENSE](LICENSE).
