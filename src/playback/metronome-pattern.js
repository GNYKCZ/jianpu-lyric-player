import { ticksPerBeat } from '../song/timing.js';

export const METRONOME_ACCENTS = Object.freeze({
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  BEAT: 'beat',
  OFFBEAT: 'offbeat',
});

export function metronomePulseTicks(ppq, timeSignature) {
  const beatTicks = ticksPerBeat(ppq, timeSignature.denominator);
  const pulseTicks = beatTicks / 2;
  if (!Number.isInteger(pulseTicks)) {
    throw new RangeError('The PPQ must represent half-beat metronome pulses as integer ticks.');
  }
  return pulseTicks;
}

export function getMetronomePulse(ticks, ppq, timeSignature) {
  const pulseTicks = metronomePulseTicks(ppq, timeSignature);
  if (!Number.isInteger(ticks) || ticks < 0 || ticks % pulseTicks !== 0) {
    throw new RangeError('ticks must be a non-negative metronome pulse position.');
  }

  const pulsesPerMeasure = timeSignature.numerator * 2;
  const pulseInMeasure = (ticks / pulseTicks) % pulsesPerMeasure;
  const isOffbeat = pulseInMeasure % 2 === 1;
  const beat = Math.floor(pulseInMeasure / 2) + 1;

  /** @type {string} */
  let accent = METRONOME_ACCENTS.BEAT;
  if (isOffbeat) accent = METRONOME_ACCENTS.OFFBEAT;
  else if (beat === 1) accent = METRONOME_ACCENTS.PRIMARY;
  else if (beat === 3 && timeSignature.numerator >= 4) accent = METRONOME_ACCENTS.SECONDARY;

  return Object.freeze({ ticks, beat, isOffbeat, accent });
}

export function firstMetronomePulseAtOrAfter(ticks, ppq, timeSignature) {
  const pulseTicks = metronomePulseTicks(ppq, timeSignature);
  return Math.max(0, Math.ceil(ticks / pulseTicks) * pulseTicks);
}
