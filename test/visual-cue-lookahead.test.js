import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveVisualCueTicks,
  millisecondsToTicks,
  VISUAL_CUE_LEAD_MS,
} from '../src/playback/visual-cue-lookahead.js';

test('250ms visual lead converts to tempo-aware ticks', () => {
  assert.equal(VISUAL_CUE_LEAD_MS, 250);
  assert.equal(millisecondsToTicks(250, 480, 60), 120);
  assert.equal(millisecondsToTicks(250, 480, 120), 240);
});

test('visual cues lead only active song playback', () => {
  const state = {
    ticks: 360,
    totalTicks: 1920,
    ppq: 480,
    bpm: 60,
    countInRemaining: null,
  };

  assert.equal(deriveVisualCueTicks({ ...state, isPlaying: true }), 480);
  assert.equal(deriveVisualCueTicks({ ...state, isPlaying: false }), 360);
  assert.equal(deriveVisualCueTicks({ ...state, isPlaying: true, countInRemaining: 1 }), 360);
});

test('visual cue lookahead crosses measure boundaries and clamps at song end', () => {
  const common = {
    totalTicks: 3840,
    ppq: 480,
    bpm: 60,
    isPlaying: true,
    countInRemaining: null,
  };

  assert.equal(deriveVisualCueTicks({ ...common, ticks: 1800 }), 1920);
  assert.equal(deriveVisualCueTicks({ ...common, ticks: 3800 }), 3840);
});
