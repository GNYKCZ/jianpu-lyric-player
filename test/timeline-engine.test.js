import test from 'node:test';
import assert from 'node:assert/strict';
import { TimelineEngine } from '../src/engine/timeline-engine.js';
import { demoSong } from './fixtures/demo-song.js';

test('lyric lookup sustains an event until the next onset', () => {
  const engine = new TimelineEngine(demoSong);
  assert.equal(engine.getStateAtTicks(480).currentLyricEvent.text, '今');
  assert.equal(engine.getStateAtTicks(719).currentLyricEvent.text, '今');
  assert.equal(engine.getStateAtTicks(720).currentLyricEvent.text, '天');
});

test('seek state resolves section, measure, beat, subdivision, and lyric', () => {
  const engine = new TimelineEngine(demoSong);
  const state = engine.getStateAtTicks(1920 + 1200);

  assert.equal(state.sectionId, 'chorus');
  assert.equal(state.timelineMeasureIndex, 1);
  assert.equal(state.measureIndex, 1);
  assert.equal(state.beat, 3);
  assert.equal(state.subdivision, '&');
  assert.equal(state.currentLyricEvent.text, '光');
});

test('measure boundaries follow the performance sequence', () => {
  const engine = new TimelineEngine(demoSong);
  assert.equal(engine.getStateAtTicks(1919.9).sectionId, 'verse');
  assert.equal(engine.getStateAtTicks(1920).sectionId, 'chorus');
  assert.equal(engine.getStateAtTicks(engine.timeline.totalTicks).timelineMeasureIndex, 2);
});
