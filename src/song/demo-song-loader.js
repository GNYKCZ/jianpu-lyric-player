import { loadSongDocument } from './song-document.js';
import demoSong from '../data/demo-song.json' with { type: 'json' };

export async function loadSelectedSong() {
  return loadSongDocument(demoSong);
}
