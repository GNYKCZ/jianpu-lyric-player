import {
  DEFAULT_PPQ,
  STEPS_PER_4_4_MEASURE,
  measureLengthTicks,
  step16ToTick,
} from './timing.js';

export const SONG_DOCUMENT_VERSION = 1;
export const SECTION_TYPES = new Set(['VERSE', 'CHORUS', 'OUTRO']);

export class SongDocumentValidationError extends Error {
  constructor(issues) {
    super(`SongDocument validation failed: ${issues.join(' ')}`);
    this.name = 'SongDocumentValidationError';
    this.issues = Object.freeze([...issues]);
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateSongDocument(document) {
  const issues = [];
  if (!isObject(document)) {
    return ['SongDocument must be an object.'];
  }
  if (document.version !== SONG_DOCUMENT_VERSION) {
    issues.push(`version must be ${SONG_DOCUMENT_VERSION}.`);
  }

  const metadata = document.metadata;
  if (!isObject(metadata)) {
    issues.push('metadata must be an object.');
  } else {
    if (typeof metadata.title !== 'string' || metadata.title.trim() === '') {
      issues.push('metadata.title must be a non-empty string.');
    }
    if (!isObject(metadata.timeSignature)
      || !Number.isInteger(metadata.timeSignature.numerator)
      || metadata.timeSignature.numerator <= 0
      || !Number.isInteger(metadata.timeSignature.denominator)
      || metadata.timeSignature.denominator <= 0) {
      issues.push('metadata.timeSignature must contain positive integer numerator and denominator values.');
    }
    if (!Number.isInteger(metadata.ppq) || metadata.ppq <= 0) {
      issues.push('metadata.ppq must be a positive integer.');
    } else if (metadata.ppq % 4 !== 0) {
      issues.push('metadata.ppq must support integer sixteenth-note ticks.');
    }
    if (typeof metadata.defaultBpm !== 'number' || !Number.isFinite(metadata.defaultBpm) || metadata.defaultBpm <= 0) {
      issues.push('metadata.defaultBpm must be a positive finite number.');
    }
  }

  const sectionIds = new Set();
  const lyricEventIds = new Set();
  if (!Array.isArray(document.sections) || document.sections.length === 0) {
    issues.push('sections must be a non-empty array.');
  } else {
    document.sections.forEach((section, sectionIndex) => {
      const prefix = `sections[${sectionIndex}]`;
      if (!isObject(section)) {
        issues.push(`${prefix} must be an object.`);
        return;
      }
      if (typeof section.id !== 'string' || section.id.trim() === '') {
        issues.push(`${prefix}.id must be a non-empty string.`);
      } else if (sectionIds.has(section.id)) {
        issues.push(`${prefix}.id must be unique.`);
      } else {
        sectionIds.add(section.id);
      }
      if (!SECTION_TYPES.has(section.type)) {
        issues.push(`${prefix}.type must be VERSE, CHORUS, or OUTRO.`);
      }
      if (!Array.isArray(section.measures) || section.measures.length === 0) {
        issues.push(`${prefix}.measures must be a non-empty array.`);
        return;
      }
      let previousMeasureIndex = -1;
      section.measures.forEach((measure, measureOffset) => {
        const measurePrefix = `${prefix}.measures[${measureOffset}]`;
        if (!isObject(measure)) {
          issues.push(`${measurePrefix} must be an object.`);
          return;
        }
        if (!Number.isInteger(measure.index) || measure.index < 0 || measure.index <= previousMeasureIndex) {
          issues.push(`${measurePrefix}.index must be a unique ascending non-negative integer.`);
        } else {
          previousMeasureIndex = measure.index;
        }
        if (!Number.isInteger(measure.lengthTicks) || measure.lengthTicks <= 0) {
          issues.push(`${measurePrefix}.lengthTicks must be a positive integer.`);
        }
        if (!Array.isArray(measure.lyricEvents)) {
          issues.push(`${measurePrefix}.lyricEvents must be an array.`);
          return;
        }
        let previousOnset = -1;
        measure.lyricEvents.forEach((event, eventIndex) => {
          const eventPrefix = `${measurePrefix}.lyricEvents[${eventIndex}]`;
          if (!isObject(event)) {
            issues.push(`${eventPrefix} must be an object.`);
            return;
          }
          if (typeof event.id !== 'string' || event.id.trim() === '' || lyricEventIds.has(event.id)) {
            issues.push(`${eventPrefix}.id must be a unique non-empty string.`);
          } else {
            lyricEventIds.add(event.id);
          }
          if (typeof event.text !== 'string' || event.text.length === 0) {
            issues.push(`${eventPrefix}.text must be a non-empty string.`);
          }
          if (!Number.isInteger(event.onsetTicks) || event.onsetTicks < 0 || event.onsetTicks >= measure.lengthTicks) {
            issues.push(`${eventPrefix}.onsetTicks must be within its measure.`);
          } else if (event.onsetTicks <= previousOnset) {
            issues.push(`${eventPrefix}.onsetTicks must be strictly ascending.`);
          } else {
            previousOnset = event.onsetTicks;
          }
          if (event.step16 !== undefined) {
            if (!metadata || !metadata.timeSignature || metadata.timeSignature.numerator !== 4 || metadata.timeSignature.denominator !== 4) {
              issues.push(`${eventPrefix}.step16 is only supported for 4/4 documents.`);
            } else if (!Number.isInteger(event.step16) || event.step16 < 0 || event.step16 >= STEPS_PER_4_4_MEASURE) {
              issues.push(`${eventPrefix}.step16 must be in the range 0..15.`);
            } else if (Number.isInteger(metadata.ppq)
              && metadata.ppq > 0
              && metadata.ppq % 4 === 0
              && event.onsetTicks !== step16ToTick(event.step16, metadata.ppq)) {
              issues.push(`${eventPrefix}.step16 must agree with onsetTicks.`);
            }
          }
        });
      });
    });
  }

  if (!Array.isArray(document.performanceSequence) || document.performanceSequence.length === 0) {
    issues.push('performanceSequence must be a non-empty array.');
  } else {
    document.performanceSequence.forEach((reference, index) => {
      if (!isObject(reference) || typeof reference.sectionId !== 'string' || !sectionIds.has(reference.sectionId)) {
        issues.push(`performanceSequence[${index}].sectionId must reference a declared section.`);
      }
    });
  }
  return issues;
}

export function assertValidSongDocument(document) {
  const issues = validateSongDocument(document);
  if (issues.length > 0) {
    throw new SongDocumentValidationError(issues);
  }
  return document;
}

export function loadSongDocument(json) {
  let document;
  try {
    document = typeof json === 'string' ? JSON.parse(json) : json;
  } catch (error) {
    throw new SongDocumentValidationError([`JSON parsing failed: ${error.message}`]);
  }
  return assertValidSongDocument(document);
}

export function createMeasure({ index, lyricEvents = [], lengthTicks = measureLengthTicks() }) {
  return { index, lengthTicks, lyricEvents };
}

export { DEFAULT_PPQ };
