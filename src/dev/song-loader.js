import { loadLocalFixtureFromSearch } from './local-fixture-client.js';
import { loadSelectedSong as loadDemoSong } from '../song/demo-song-loader.js';

export async function loadSelectedSong() {
  const localFixture = await loadLocalFixtureFromSearch(globalThis.location.search);
  return localFixture ?? loadDemoSong();
}
