import test from 'node:test';
import assert from 'node:assert/strict';
import {
  beatSubdivisionToStep16,
  measureLengthTicks,
  step16ToBeatSubdivision,
  step16ToTick,
  tickToStep16,
} from '../src/song/timing.js';

test('step16 maps losslessly to tick, beat, and subdivision', () => {
  for (let step16 = 0; step16 < 16; step16 += 1) {
    const position = step16ToBeatSubdivision(step16);
    assert.equal(tickToStep16(step16ToTick(step16)), step16);
    assert.equal(beatSubdivisionToStep16(position.beat, position.subdivision), step16);
  }
  assert.deepEqual(step16ToBeatSubdivision(7), { beat: 2, subdivision: 'a', subdivisionIndex: 3 });
  assert.equal(step16ToTick(15), 1800);
  assert.equal(measureLengthTicks(), 1920);
});

test('timing conversion rejects off-grid and out-of-range values', () => {
  assert.throws(() => step16ToTick(16), /0\.\.15/);
  assert.throws(() => tickToStep16(121), /sixteenth-note boundary/);
  assert.throws(() => beatSubdivisionToStep16(5, '1'), /1\.\.4/);
  assert.throws(() => beatSubdivisionToStep16(1, 'x'), /subdivision/);
});
