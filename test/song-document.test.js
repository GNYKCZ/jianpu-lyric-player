'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SongDocumentValidationError,
  loadSongDocument,
  validateSongDocument,
} = require('../src/song/song-document');
const { demoSong } = require('./fixtures/demo-song');

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
