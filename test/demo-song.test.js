import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TimelineEngine } from '../src/engine/timeline-engine.js';
import { loadSongDocument } from '../src/song/song-document.js';

test('public Demo Song implements the required performance sequence', () => {
  const json = readFileSync(new URL('../src/data/demo-song.json', import.meta.url), 'utf8');
  const document = loadSongDocument(json);
  const engine = new TimelineEngine(document);

  const sectionTypes = document.performanceSequence.map((reference) => (
    document.sections.find((section) => section.id === reference.sectionId).type
  ));
  assert.deepEqual(sectionTypes, ['VERSE', 'CHORUS', 'VERSE', 'CHORUS', 'CHORUS', 'OUTRO']);
  assert.equal(engine.timeline.measures.length, 11);
  assert.equal(engine.timeline.totalTicks, 21_120);
});
