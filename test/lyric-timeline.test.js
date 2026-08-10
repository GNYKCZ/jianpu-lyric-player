import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLyricTimeline } from '../src/song/lyric-timeline.js';
import { demoSong } from './fixtures/demo-song.js';

test('timeline follows performance sequence and preserves repeated sections', () => {
  const timeline = buildLyricTimeline(demoSong);

  assert.equal(timeline.totalTicks, 5760);
  assert.deepEqual(timeline.measures.map((measure) => measure.sectionId), ['verse', 'chorus', 'chorus']);
  assert.deepEqual(timeline.lyricEvents.map((event) => event.absoluteTicks), [480, 720, 2760, 3120, 4680, 5040]);
  assert.equal(timeline.lyricEvents[4].text, '阳');
});
