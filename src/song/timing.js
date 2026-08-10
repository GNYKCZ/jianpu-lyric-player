export const DEFAULT_PPQ = 480;
export const STEPS_PER_4_4_MEASURE = 16;
export const SUBDIVISIONS = Object.freeze(['1', 'e', '&', 'a']);

function assertInteger(value, name) {
  if (!Number.isInteger(value)) {
    throw new RangeError(`${name} must be an integer.`);
  }
}

function assertPpq(ppq) {
  assertInteger(ppq, 'ppq');
  if (ppq <= 0) {
    throw new RangeError('ppq must be greater than zero.');
  }
}

export function ticksPerBeat(ppq = DEFAULT_PPQ, denominator = 4) {
  assertPpq(ppq);
  assertInteger(denominator, 'denominator');
  if (denominator <= 0 || (ppq * 4) % denominator !== 0) {
    throw new RangeError('denominator must divide a whole-note tick length.');
  }
  return (ppq * 4) / denominator;
}

export function ticksPerSixteenth(ppq = DEFAULT_PPQ) {
  return ticksPerBeat(ppq, 4) / 4;
}

export function measureLengthTicks({ numerator = 4, denominator = 4, ppq = DEFAULT_PPQ } = {}) {
  assertInteger(numerator, 'numerator');
  if (numerator <= 0) {
    throw new RangeError('numerator must be greater than zero.');
  }
  return numerator * ticksPerBeat(ppq, denominator);
}

function assertStep16(step16) {
  assertInteger(step16, 'step16');
  if (step16 < 0 || step16 >= STEPS_PER_4_4_MEASURE) {
    throw new RangeError('step16 must be in the range 0..15.');
  }
}

export function step16ToTick(step16, ppq = DEFAULT_PPQ) {
  assertStep16(step16);
  const ticks = ticksPerSixteenth(ppq);
  if (!Number.isInteger(ticks)) {
    throw new RangeError('ppq must support integer sixteenth-note ticks.');
  }
  return step16 * ticks;
}

export function tickToStep16(tick, ppq = DEFAULT_PPQ) {
  assertInteger(tick, 'tick');
  const ticks = ticksPerSixteenth(ppq);
  if (!Number.isInteger(ticks) || tick % ticks !== 0) {
    throw new RangeError('tick must align to a sixteenth-note boundary.');
  }
  const step16 = tick / ticks;
  assertStep16(step16);
  return step16;
}

export function step16ToBeatSubdivision(step16) {
  assertStep16(step16);
  const subdivisionIndex = step16 % SUBDIVISIONS.length;
  return Object.freeze({
    beat: Math.floor(step16 / SUBDIVISIONS.length) + 1,
    subdivision: SUBDIVISIONS[subdivisionIndex],
    subdivisionIndex,
  });
}

export function beatSubdivisionToStep16(beat, subdivision) {
  assertInteger(beat, 'beat');
  if (beat < 1 || beat > 4) {
    throw new RangeError('beat must be in the range 1..4.');
  }
  const subdivisionIndex = SUBDIVISIONS.indexOf(subdivision);
  if (subdivisionIndex === -1) {
    throw new RangeError('subdivision must be one of 1, e, &, or a.');
  }
  return ((beat - 1) * SUBDIVISIONS.length) + subdivisionIndex;
}
