'use strict';

const { measureLengthTicks, step16ToTick } = require('../../src/song/timing');

const measureLength = measureLengthTicks();

function event(id, text, step16) {
  return { id, text, step16, onsetTicks: step16ToTick(step16) };
}

const demoSong = {
  version: 1,
  metadata: {
    title: 'Timeline Demo',
    timeSignature: { numerator: 4, denominator: 4 },
    ppq: 480,
    defaultBpm: 64,
  },
  sections: [
    {
      id: 'verse',
      type: 'VERSE',
      measures: [
        { index: 1, lengthTicks: measureLength, lyricEvents: [event('v1', '今', 4), event('v2', '天', 6)] },
      ],
    },
    {
      id: 'chorus',
      type: 'CHORUS',
      measures: [
        { index: 1, lengthTicks: measureLength, lyricEvents: [event('c1', '阳', 7), event('c2', '光', 10)] },
      ],
    },
  ],
  performanceSequence: [
    { sectionId: 'verse' },
    { sectionId: 'chorus' },
    { sectionId: 'chorus' },
  ],
};

module.exports = { demoSong };
