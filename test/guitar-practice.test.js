import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMeasurePicks,
  getGuitarPracticeState,
  GUITAR_PICKING_PATTERN,
} from '../src/practice/guitar-practice.js';

const timeSignature = { numerator: 4, denominator: 4 };

test('root-323 picking pattern maps eight actions to 4/4 eighth-note positions', () => {
  assert.equal(GUITAR_PICKING_PATTERN.name, '八分分解：根 3 2 3｜根 3 2 3');
  assert.deepEqual(
    buildMeasurePicks(480, timeSignature)
      .map(({ step16, onsetTicks, label, role }) => [step16, onsetTicks, label, role]),
    [
      [0, 0, '根', 'root'],
      [2, 240, '3', 'inner'],
      [4, 480, '2', 'inner'],
      [6, 720, '3', 'inner'],
      [8, 960, '根', 'root'],
      [10, 1200, '3', 'inner'],
      [12, 1440, '2', 'inner'],
      [14, 1680, '3', 'inner'],
    ],
  );
});

test('practice state exposes every eighth-note hit and distinguishes roots', () => {
  const atBeatTwo = getGuitarPracticeState({
    measureTicks: 480,
    measureLengthTicks: 1920,
    ppq: 480,
    timeSignature,
  });
  assert.equal(atBeatTwo.currentPick.label, '2');
  assert.equal(atBeatTwo.isHit, true);
  assert.equal(atBeatTwo.nextPick.label, '3');
  assert.equal(atBeatTwo.nextPick.onsetTicks, 720);

  const atSecondRoot = getGuitarPracticeState({
    measureTicks: 960,
    measureLengthTicks: 1920,
    ppq: 480,
    timeSignature,
  });
  assert.equal(atSecondRoot.currentPick.label, '根');
  assert.equal(atSecondRoot.currentPick.role, 'root');
  assert.equal(atSecondRoot.isHit, true);
});

test('practice state prepares the next touch and wraps at the measure boundary', () => {
  const preparing = getGuitarPracticeState({
    measureTicks: 180,
    measureLengthTicks: 1920,
    ppq: 480,
    timeSignature,
  });
  assert.equal(preparing.isHit, false);
  assert.equal(preparing.isPreparing, true);
  assert.equal(preparing.ticksUntilNext, 60);
  assert.equal(preparing.nextPick.label, '3');

  const finalPick = getGuitarPracticeState({
    measureTicks: 1860,
    measureLengthTicks: 1920,
    ppq: 480,
    timeSignature,
  });
  assert.equal(finalPick.nextPick.label, '根');
  assert.equal(finalPick.nextPick.role, 'root');
  assert.equal(finalPick.nextPick.measureOffset, 1);
  assert.equal(finalPick.ticksUntilNext, 60);
});
