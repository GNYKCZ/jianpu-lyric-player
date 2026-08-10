import test from 'node:test';
import assert from 'node:assert/strict';
import { MasterPlaybackClock } from '../src/playback/master-playback-clock.js';

function createHarness() {
  let now = 0;
  const clock = new MasterPlaybackClock({
    ppq: 480,
    bpm: 60,
    totalTicks: 10_000,
    now: () => now,
  });
  return {
    clock,
    advance(milliseconds) { now += milliseconds; },
  };
}

test('pause and resume do not create a timing jump', () => {
  const harness = createHarness();
  harness.clock.play();
  harness.advance(500);
  harness.clock.pause();
  assert.equal(harness.clock.getCurrentTicks(), 240);

  harness.advance(2_000);
  assert.equal(harness.clock.getCurrentTicks(), 240);
  harness.clock.play();
  harness.advance(500);
  assert.equal(harness.clock.getCurrentTicks(), 480);
});

test('BPM changes preserve musical position and only alter future rate', () => {
  const harness = createHarness();
  harness.clock.play();
  harness.advance(1_000);
  harness.clock.setBpm(120);
  assert.equal(harness.clock.getCurrentTicks(), 480);
  harness.advance(500);
  assert.equal(harness.clock.getCurrentTicks(), 960);
});

test('seek and restart update the same master timeline', () => {
  const harness = createHarness();
  harness.clock.seek(1_200);
  assert.equal(harness.clock.getCurrentTicks(), 1_200);
  harness.clock.restart();
  assert.equal(harness.clock.getCurrentTicks(), 0);
});
