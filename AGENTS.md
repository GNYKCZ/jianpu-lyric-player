# AGENTS.md

This file defines repository-wide working rules for coding agents and contributors.

## Project intent

Build a reusable music-timeline player that maps lyrics to precise musical time and highlights/scrolls them during playback. Keep the player independent from future image/OCR/OMR pipelines.

Read the current product/technical specification in `docs/` before making behavior or architecture changes.

## Working rules

- Inspect the existing code, tests, and package scripts before editing.
- Make the smallest coherent change that solves the task; do not rewrite unrelated code.
- Preserve existing behavior unless the task explicitly changes it.
- Keep domain data, playback timing, UI rendering, and future OMR/image parsing decoupled.
- Use one master playback clock. Do not synchronize lyrics, cursor, metronome, or scrolling with separate timers.
- Do not silently change verified lyric-timing ground truth. If source material conflicts with fixture data, report the exact measure/event and ask for review.
- Prefer clear, maintainable code over clever abstractions.
- Do not add production dependencies unless they are clearly necessary; explain new dependencies in the PR.

## Git workflow

- Never work directly on `main`.
- Use short-lived branches:
  - `feat/<name>`
  - `fix/<name>`
  - `refactor/<name>`
  - `docs/<name>`
  - `test/<name>`
- Keep commits focused. Use Conventional Commit prefixes such as:
  `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- Do not rewrite, amend, squash, or delete existing history unless explicitly requested.
- Do not commit generated files, build outputs, credentials, API keys, local IDE files, or temporary debug assets.

## Testing and quality

- Before finishing, run the relevant repository-provided tests, lint, type checks, and build commands.
- Add or update tests whenever behavior changes.
- Timing logic requires deterministic unit tests.
- For playback/UI changes, add or update an end-to-end test when practical.
- If a required check cannot run, state exactly why and what remains unverified.

## Pull requests

PRs should be small and reviewable. Include:

- what changed and why;
- related issue/task;
- important design decisions;
- tests/checks run and results;
- screenshots for visible UI changes when useful;
- known limitations or follow-up work.

Do not merge while required CI checks are failing.

## Open-source and licensing

- Preserve upstream copyright notices, LICENSE files, and attribution.
- Before copying third-party code, confirm its license is compatible with this repository.
- If this repository is a derivative of Groove Scribe, preserve and comply with its GPL-2.0 licensing requirements.
- Do not commit third-party copyrighted sheet music, full song lyrics, commercial audio, or source images unless the repository has permission to redistribute them. Prefer synthetic, public-domain, or explicitly licensed test fixtures.
- Never commit secrets or personal data.

## Documentation

Update documentation when public behavior, setup, architecture, data schema, or contributor workflow changes. Keep `AGENTS.md` concise; detailed product requirements and architecture belong under `docs/`.

## Completion report

At the end of a task, report:

1. files changed;
2. behavior implemented;
3. tests/checks run and results;
4. unresolved risks or limitations.
