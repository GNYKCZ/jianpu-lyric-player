import { loadSongDocument } from './song-document.js';

export async function loadSelectedSong() {
  const response = await fetch(new URL('../data/demo-song.json', import.meta.url));
  if (!response.ok) throw new Error(`Demo Song 加载失败（${response.status}）`);
  return loadSongDocument(await response.json());
}
