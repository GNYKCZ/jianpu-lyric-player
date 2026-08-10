import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AudibleMetronome,
  renderWoodblockSamples,
} from '../src/playback/audible-metronome.js';
import { METRONOME_ACCENTS } from '../src/playback/metronome-pattern.js';

function peak(samples) {
  return samples.reduce((maximum, sample) => Math.max(maximum, Math.abs(sample)), 0);
}

function createAudioHarness() {
  const gainChanges = [];
  const context = {
    state: 'suspended',
    currentTime: 10,
    destination: {},
    createGain() {
      return {
        gain: {
          value: 0,
          setTargetAtTime(value, when, constant) {
            gainChanges.push({ value, when, constant });
          },
        },
        connect() {},
      };
    },
    async resume() { this.state = 'running'; },
    async close() { this.state = 'closed'; },
  };
  return { context, gainChanges };
}

test('synthesized click profiles are audible and preserve the intended strength hierarchy', () => {
  const peaks = [
    METRONOME_ACCENTS.PRIMARY,
    METRONOME_ACCENTS.SECONDARY,
    METRONOME_ACCENTS.BEAT,
    METRONOME_ACCENTS.OFFBEAT,
  ].map((accent) => peak(renderWoodblockSamples(48_000, accent)));

  assert.ok(peaks[0] > peaks[1]);
  assert.ok(peaks[1] > peaks[2]);
  assert.ok(peaks[2] > peaks[3]);
  assert.ok(peaks[3] > 0.1);
});

test('audible metronome schedules a complete 4/4 eighth-note measure on Web Audio time', async () => {
  const harness = createAudioHarness();
  const rendered = [];
  const metronome = new AudibleMetronome({
    ppq: 480,
    timeSignature: { numerator: 4, denominator: 4 },
    totalTicks: 1920,
    audioContextFactory: () => harness.context,
    clickRenderer(event) {
      const source = { stopped: false, stop() { this.stopped = true; }, onended: null };
      rendered.push({ ...event, source });
      return source;
    },
  });

  assert.equal(await metronome.prepare(), true);
  const scheduled = metronome.scheduleFrom({ ticks: 0, bpm: 60, audioStartTime: 10.025 });
  assert.equal(scheduled.length, 8);
  assert.deepEqual(scheduled.map(({ accent }) => accent), [
    'primary', 'offbeat', 'beat', 'offbeat', 'secondary', 'offbeat', 'beat', 'offbeat',
  ]);
  assert.deepEqual(scheduled.map(({ when }) => when), [
    10.025, 10.525, 11.025, 11.525, 12.025, 12.525, 13.025, 13.525,
  ]);

  metronome.setVolume(0.4);
  assert.deepEqual(harness.gainChanges, [{ value: 0.4, when: 10, constant: 0.01 }]);
  metronome.cancelScheduled();
  assert.ok(rendered.every(({ source }) => source.stopped));
});

test('seek and BPM scheduling derive future pulses from musical ticks', async () => {
  const harness = createAudioHarness();
  const metronome = new AudibleMetronome({
    ppq: 480,
    timeSignature: { numerator: 4, denominator: 4 },
    totalTicks: 1920,
    audioContextFactory: () => harness.context,
    clickRenderer() {
      return { stop() {}, onended: null };
    },
  });
  await metronome.prepare();

  const afterSeek = metronome.scheduleFrom({ ticks: 600, bpm: 60, audioStartTime: 20 });
  assert.equal(afterSeek[0].ticks, 720);
  assert.equal(afterSeek[0].when, 20.25);

  const atDoubleTempo = metronome.scheduleFrom({ ticks: 0, bpm: 120, audioStartTime: 30 });
  assert.equal(atDoubleTempo[1].when, 30.25);
});
