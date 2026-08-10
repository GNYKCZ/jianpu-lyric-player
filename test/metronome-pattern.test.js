import test from 'node:test';
import assert from 'node:assert/strict';
import {
  firstMetronomePulseAtOrAfter,
  getMetronomePulse,
  metronomePulseTicks,
  METRONOME_ACCENTS,
} from '../src/playback/metronome-pattern.js';

const timeSignature = { numerator: 4, denominator: 4 };

test('4/4 eighth-note metronome produces two pulses per beat with metric accents', () => {
  assert.equal(metronomePulseTicks(480, timeSignature), 240);
  assert.deepEqual(
    Array.from({ length: 8 }, (_, index) => getMetronomePulse(index * 240, 480, timeSignature)),
    [
      { ticks: 0, beat: 1, isOffbeat: false, accent: METRONOME_ACCENTS.PRIMARY },
      { ticks: 240, beat: 1, isOffbeat: true, accent: METRONOME_ACCENTS.OFFBEAT },
      { ticks: 480, beat: 2, isOffbeat: false, accent: METRONOME_ACCENTS.BEAT },
      { ticks: 720, beat: 2, isOffbeat: true, accent: METRONOME_ACCENTS.OFFBEAT },
      { ticks: 960, beat: 3, isOffbeat: false, accent: METRONOME_ACCENTS.SECONDARY },
      { ticks: 1200, beat: 3, isOffbeat: true, accent: METRONOME_ACCENTS.OFFBEAT },
      { ticks: 1440, beat: 4, isOffbeat: false, accent: METRONOME_ACCENTS.BEAT },
      { ticks: 1680, beat: 4, isOffbeat: true, accent: METRONOME_ACCENTS.OFFBEAT },
    ],
  );
  assert.equal(getMetronomePulse(1920, 480, timeSignature).accent, METRONOME_ACCENTS.PRIMARY);
});

test('metronome pulse lookup advances safely after arbitrary seek positions', () => {
  assert.equal(firstMetronomePulseAtOrAfter(0, 480, timeSignature), 0);
  assert.equal(firstMetronomePulseAtOrAfter(1, 480, timeSignature), 240);
  assert.equal(firstMetronomePulseAtOrAfter(600, 480, timeSignature), 720);
  assert.throws(() => getMetronomePulse(120, 480, timeSignature), /pulse position/);
});
