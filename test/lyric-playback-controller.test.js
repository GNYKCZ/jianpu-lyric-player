import test from 'node:test';
import assert from 'node:assert/strict';
import { TimelineEngine } from '../src/engine/timeline-engine.js';
import { LyricPlaybackController } from '../src/playback/lyric-playback-controller.js';
import { demoSong } from './fixtures/demo-song.js';

test('controller keeps audible scheduling on the same master clock across transport changes', async () => {
  let now = 0;
  const calls = [];
  const metronome = {
    isReady: false,
    startLeadSeconds: 0.025,
    context: { currentTime: 5 },
    async prepare() { this.isReady = true; return true; },
    scheduleFrom(options) { calls.push({ type: 'schedule', ...options }); },
    cancelScheduled() { calls.push({ type: 'cancel' }); },
    syncFuture(clock) { calls.push({ type: 'sync', ticks: clock.getCurrentTicks(), bpm: clock.bpm }); },
    async setEnabled(enabled) { calls.push({ type: 'enabled', enabled }); return enabled; },
    setVolume(volume) { calls.push({ type: 'volume', volume }); },
    async dispose() {},
  };
  const controller = new LyricPlaybackController({
    engine: new TimelineEngine(demoSong),
    metronome,
    countInSeconds: 0,
    now: () => now,
    scheduleFrame: () => 1,
    cancelFrame: () => {},
  });

  await controller.play();
  assert.equal(controller.clock.playing, true);
  assert.equal(controller.clock.anchorTimeMs, 25);
  assert.deepEqual(calls[0], {
    type: 'schedule',
    ticks: 0,
    bpm: 64,
    audioStartTime: 5.025,
    replace: true,
  });

  now = 100;
  controller.setBpm(96);
  assert.equal(calls.at(-1).type, 'sync');
  const ticksBeforeSeek = controller.clock.getCurrentTicks();
  controller.seekTicks(1920);
  assert.equal(controller.clock.getCurrentTicks(), 1920);
  assert.equal(calls.at(-1).ticks, 1920);

  controller.restart();
  assert.equal(controller.clock.getCurrentTicks(), 0);
  assert.equal(calls.at(-1).ticks, 0);

  controller.pause();
  assert.equal(controller.clock.playing, false);
  assert.equal(calls.at(-1).type, 'cancel');
  assert.ok(ticksBeforeSeek > 0);

  await controller.setMetronomeEnabled(false);
  controller.setMetronomeVolume(0.5);
  assert.deepEqual(calls.slice(-2), [
    { type: 'enabled', enabled: false },
    { type: 'volume', volume: 0.5 },
  ]);
});

test('controller holds tick zero for a five-second count-in before starting playback', async () => {
  let now = 0;
  const calls = [];
  const metronome = {
    isReady: false,
    startLeadSeconds: 0.025,
    context: { currentTime: 10 },
    async prepare() { this.isReady = true; return true; },
    scheduleCountIn(options) { calls.push({ type: 'count-in', ...options }); },
    scheduleFrom(options) { calls.push({ type: 'schedule', ...options }); },
    cancelScheduled() {},
    async dispose() {},
  };
  const controller = new LyricPlaybackController({
    engine: new TimelineEngine(demoSong),
    metronome,
    now: () => now,
    scheduleFrame: () => 1,
    cancelFrame: () => {},
  });

  await controller.play();
  assert.equal(controller.clock.anchorTimeMs, 5025);
  assert.equal(controller.getState().countInRemaining, 5);
  assert.equal(controller.getState().ticks, 0);
  assert.deepEqual(calls, [
    { type: 'count-in', seconds: 5, audioStartTime: 10.025 },
    {
      type: 'schedule',
      ticks: 0,
      bpm: 64,
      audioStartTime: 15.025,
      replace: false,
    },
  ]);

  now = 3025;
  assert.equal(controller.getState().countInRemaining, 2);
  assert.equal(controller.getState().ticks, 0);

  now = 5025;
  assert.equal(controller.getState().countInRemaining, null);
  assert.equal(controller.getState().ticks, 0);

  now = 6025;
  assert.equal(controller.getState().countInRemaining, null);
  assert.ok(controller.getState().ticks > 0);
});
