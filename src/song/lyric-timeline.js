import { assertValidSongDocument } from './song-document.js';

export function buildLyricTimeline(document) {
  assertValidSongDocument(document);
  const sectionsById = new Map(document.sections.map((section) => [section.id, section]));
  const measures = [];
  let currentTicks = 0;

  document.performanceSequence.forEach((reference, performanceIndex) => {
    const section = sectionsById.get(reference.sectionId);
    section.measures.forEach((measure, sectionMeasureIndex) => {
      const startTicks = currentTicks;
      const timelineMeasureIndex = measures.length;
      const events = measure.lyricEvents.map((event) => Object.freeze({
        ...event,
        occurrenceId: `${performanceIndex}:${sectionMeasureIndex}:${event.id}`,
        absoluteTicks: startTicks + event.onsetTicks,
      }));
      measures.push(Object.freeze({
        timelineMeasureIndex,
        performanceIndex,
        sectionId: section.id,
        sectionType: section.type,
        sectionMeasureIndex,
        measureIndex: measure.index,
        startTicks,
        endTicks: startTicks + measure.lengthTicks,
        lengthTicks: measure.lengthTicks,
        lyricEvents: Object.freeze(events),
      }));
      currentTicks += measure.lengthTicks;
    });
  });

  const lyricEvents = measures.flatMap((measure) => measure.lyricEvents);
  return Object.freeze({
    measures: Object.freeze(measures),
    lyricEvents: Object.freeze(lyricEvents),
    totalTicks: currentTicks,
  });
}
