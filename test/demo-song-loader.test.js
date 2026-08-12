import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSelectedSong } from '../src/song/demo-song-loader.js';

test('production song loader bundles only the fictional public Demo Song', async () => {
  const song = await loadSelectedSong();
  assert.equal(song.metadata.title, '向光而行（虚构示例）');
  assert.equal(song.performanceSequence.length, 6);
});
