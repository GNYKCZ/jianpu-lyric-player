import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveVisualCueTicks,
  millisecondsToTicks,
  VISUAL_CUE_LEAD_MS,
} from '../src/playback/visual-cue-lookahead.js';

test('50ms visual lead converts to tempo-aware ticks', () => {
  assert.equal(VISUAL_CUE_LEAD_MS, 50);
  assert.equal(millisecondsToTicks(50, 480, 60), 24);
  assert.equal(millisecondsToTicks(50, 480, 120), 48);
});

test('visual cues lead only active song playback', () => {
  const state = {
    ticks: 456,
    totalTicks: 1920,
    ppq: 480,
    bpm: 60,
    countInRemaining: null,
  };

  assert.equal(deriveVisualCueTicks({ ...state, isPlaying: true }), 480);
  assert.equal(deriveVisualCueTicks({ ...state, isPlaying: false }), 456);
  assert.equal(deriveVisualCueTicks({ ...state, isPlaying: true, countInRemaining: 1 }), 456);
});

test('visual cue lookahead crosses measure boundaries and clamps at song end', () => {
  const common = {
    totalTicks: 3840,
    ppq: 480,
    bpm: 60,
    isPlaying: true,
    countInRemaining: null,
  };

  assert.equal(deriveVisualCueTicks({ ...common, ticks: 1896 }), 1920);
  assert.equal(deriveVisualCueTicks({ ...common, ticks: 3830 }), 3840);
});
