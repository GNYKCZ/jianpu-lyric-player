import { buildLyricTimeline } from '../song/lyric-timeline.js';
import { SUBDIVISIONS, ticksPerBeat, ticksPerSixteenth } from '../song/timing.js';

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function findLastAtOrBefore(items, ticks, getTicks) {
  let low = 0;
  let high = items.length - 1;
  let result = null;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (getTicks(items[middle]) <= ticks) {
      result = items[middle];
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return result;
}

export class TimelineEngine {
  constructor(document) {
    this.document = document;
    this.timeline = buildLyricTimeline(document);
    this.ppq = document.metadata.ppq;
  }

  findCurrentLyricEvent(ticks) {
    const safeTicks = clamp(ticks, 0, this.timeline.totalTicks);
    return findLastAtOrBefore(
      this.timeline.lyricEvents,
      safeTicks,
      (event) => event.absoluteTicks,
    );
  }

  getMeasureAtTicks(ticks) {
    const safeTicks = clamp(ticks, 0, this.timeline.totalTicks);
    const lookupTicks = safeTicks === this.timeline.totalTicks
      ? Math.max(0, safeTicks - 0.001)
      : safeTicks;
    return findLastAtOrBefore(
      this.timeline.measures,
      lookupTicks,
      (measure) => measure.startTicks,
    ) ?? this.timeline.measures[0];
  }

  getStateAtTicks(ticks) {
    const safeTicks = clamp(ticks, 0, this.timeline.totalTicks);
    const measure = this.getMeasureAtTicks(safeTicks);
    const measureLookupTicks = safeTicks === this.timeline.totalTicks
      ? Math.max(measure.startTicks, safeTicks - 0.001)
      : safeTicks;
    const measureTicks = measureLookupTicks - measure.startTicks;
    const beatTicks = ticksPerBeat(this.ppq, this.document.metadata.timeSignature.denominator);
    const sixteenthTicks = ticksPerSixteenth(this.ppq);
    const subdivisionIndex = Math.floor((measureTicks % beatTicks) / sixteenthTicks);

    return Object.freeze({
      ticks: safeTicks,
      totalTicks: this.timeline.totalTicks,
      progress: this.timeline.totalTicks === 0 ? 0 : safeTicks / this.timeline.totalTicks,
      isComplete: safeTicks >= this.timeline.totalTicks,
      sectionId: measure.sectionId,
      sectionType: measure.sectionType,
      timelineMeasureIndex: measure.timelineMeasureIndex,
      measureIndex: measure.measureIndex,
      measureStartTicks: measure.startTicks,
      measureLengthTicks: measure.lengthTicks,
      measureTicks,
      beat: Math.floor(measureTicks / beatTicks) + 1,
      subdivision: SUBDIVISIONS[subdivisionIndex],
      subdivisionIndex,
      step16: Math.floor(measureTicks / sixteenthTicks),
      currentLyricEvent: this.findCurrentLyricEvent(safeTicks),
    });
  }

  getMeasureWindow(timelineMeasureIndex, radius = 1) {
    const start = Math.max(0, timelineMeasureIndex - radius);
    const end = Math.min(this.timeline.measures.length, timelineMeasureIndex + radius + 1);
    return this.timeline.measures.slice(start, end);
  }
}
