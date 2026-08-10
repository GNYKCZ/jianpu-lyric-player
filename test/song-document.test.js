import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SongDocumentValidationError,
  loadSongDocument,
  validateSongDocument,
} from '../src/song/song-document.js';
import { demoSong } from './fixtures/demo-song.js';

test('loader accepts a valid public SongDocument JSON fixture', () => {
  const loaded = loadSongDocument(JSON.stringify(demoSong));
  assert.equal(loaded.metadata.title, 'Timeline Demo');
  assert.deepEqual(validateSongDocument(loaded), []);
});

test('validator reports invalid step16 timing and unknown sequence references', () => {
  const invalid = structuredClone(demoSong);
  invalid.sections[0].measures[0].lyricEvents[0].onsetTicks = 600;
  invalid.performanceSequence[1] = { sectionId: 'missing' };

  const issues = validateSongDocument(invalid);
  assert.ok(issues.some((issue) => issue.includes('step16 must agree')));
  assert.ok(issues.some((issue) => issue.includes('must reference a declared section')));
  assert.throws(() => loadSongDocument(invalid), SongDocumentValidationError);
});

test('validator reports PPQ values that cannot represent integer sixteenths', () => {
  const invalid = structuredClone(demoSong);
  invalid.metadata.ppq = 481;
  const issues = validateSongDocument(invalid);
  assert.ok(issues.some((issue) => issue.includes('integer sixteenth-note ticks')));
});
