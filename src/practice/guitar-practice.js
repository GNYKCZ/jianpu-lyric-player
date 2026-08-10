import { ticksPerBeat, ticksPerSixteenth } from '../song/timing.js';

export const PICK_ROLES = Object.freeze({
  ROOT: 'root',
  INNER: 'inner',
});

/** @typedef {'root' | 'inner'} PickRole */

/**
 * @param {number} step16
 * @param {string} label
 * @param {PickRole} [role]
 */
function pick(step16, label, role = PICK_ROLES.INNER) {
  return Object.freeze({ step16, label, role });
}

export const GUITAR_PICKING_PATTERN = Object.freeze({
  id: 'root-323',
  name: '八分分解：根 3 2 3｜根 3 2 3',
  events: Object.freeze([
    pick(0, '根', PICK_ROLES.ROOT),
    pick(2, '3'),
    pick(4, '2'),
    pick(6, '3'),
    pick(8, '根', PICK_ROLES.ROOT),
    pick(10, '3'),
    pick(12, '2'),
    pick(14, '3'),
  ]),
});

export function buildMeasurePicks(ppq, timeSignature) {
  if (timeSignature.numerator !== 4 || timeSignature.denominator !== 4) {
    throw new RangeError('Guitar picking practice currently requires 4/4 time.');
  }
  const sixteenthTicks = ticksPerSixteenth(ppq);
  return GUITAR_PICKING_PATTERN.events.map((event, index) => Object.freeze({
    ...event,
    index,
    onsetTicks: event.step16 * sixteenthTicks,
    measureOffset: 0,
  }));
}

export function getGuitarPracticeState({
  measureTicks,
  measureLengthTicks,
  ppq,
  timeSignature,
}) {
  const events = buildMeasurePicks(ppq, timeSignature);
  const safeMeasureTicks = Math.min(Math.max(measureTicks, 0), measureLengthTicks);
  let currentIndex = 0;
  for (let index = 1; index < events.length; index += 1) {
    if (events[index].onsetTicks > safeMeasureTicks) break;
    currentIndex = index;
  }

  const currentPick = events[currentIndex];
  const following = events[currentIndex + 1];
  const nextPick = following
    ? Object.freeze({ ...following, measureOffset: 0 })
    : Object.freeze({ ...events[0], measureOffset: 1 });
  const ticksSinceCurrent = safeMeasureTicks - currentPick.onsetTicks;
  const ticksUntilNext = following
    ? following.onsetTicks - safeMeasureTicks
    : (measureLengthTicks - safeMeasureTicks) + events[0].onsetTicks;
  const eighthTicks = ticksPerBeat(ppq, timeSignature.denominator) / 2;
  const hitWindowTicks = ticksPerSixteenth(ppq);
  const prepareWindowTicks = eighthTicks - hitWindowTicks;
  const isHit = ticksSinceCurrent >= 0 && ticksSinceCurrent < hitWindowTicks;
  const readiness = Math.min(1, Math.max(0, 1 - (ticksUntilNext / eighthTicks)));

  return Object.freeze({
    pattern: GUITAR_PICKING_PATTERN,
    events,
    currentPick,
    nextPick,
    ticksSinceCurrent,
    ticksUntilNext,
    eighthTicks,
    hitWindowTicks,
    prepareWindowTicks,
    isHit,
    isPreparing: !isHit && ticksUntilNext <= prepareWindowTicks,
    readiness,
  });
}

export function pickActionName(pickEvent) {
  return pickEvent.role === PICK_ROLES.ROOT ? '根音' : '触弦';
}
