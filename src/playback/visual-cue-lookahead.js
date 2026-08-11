export const VISUAL_CUE_LEAD_MS = 250;

function assertFiniteNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite non-negative number.`);
  }
}

function assertFinitePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite positive number.`);
  }
}

export function millisecondsToTicks(milliseconds, ppq, bpm) {
  assertFiniteNonNegative(milliseconds, 'milliseconds');
  assertFinitePositive(ppq, 'ppq');
  assertFinitePositive(bpm, 'bpm');
  return (ppq * bpm * milliseconds) / 60_000;
}

export function deriveVisualCueTicks({
  ticks,
  totalTicks,
  ppq,
  bpm,
  isPlaying,
  countInRemaining,
  leadMs = VISUAL_CUE_LEAD_MS,
}) {
  assertFiniteNonNegative(ticks, 'ticks');
  assertFiniteNonNegative(totalTicks, 'totalTicks');
  const safeTicks = Math.min(ticks, totalTicks);
  if (!isPlaying || countInRemaining !== null) return safeTicks;
  return Math.min(totalTicks, safeTicks + millisecondsToTicks(leadMs, ppq, bpm));
}
