import { loadSongDocument } from '../song/song-document.js';

const FIXTURE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export async function loadLocalFixtureFromSearch(
  search,
  fetchFixture = globalThis.fetch,
) {
  const fixtureName = new URLSearchParams(search).get('fixture');
  if (fixtureName === null) return null;
  if (!FIXTURE_NAME_PATTERN.test(fixtureName)) {
    throw new Error('本地 fixture 名称只能包含小写字母、数字、下划线和连字符。');
  }

  const response = await fetchFixture(`/__local-fixtures/${fixtureName}.json`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`本地 fixture 加载失败（HTTP ${response.status}）。`);
  }
  return loadSongDocument(await response.json());
}
