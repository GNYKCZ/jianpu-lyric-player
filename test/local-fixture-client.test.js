import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLocalFixtureFromSearch } from '../src/dev/local-fixture-client.js';
import { demoSong } from './fixtures/demo-song.js';

test('development fixture loader returns null when no fixture is selected', async () => {
  assert.equal(await loadLocalFixtureFromSearch(''), null);
});

test('development fixture loader validates and returns a selected SongDocument', async () => {
  const requests = [];
  const document = await loadLocalFixtureFromSearch('?fixture=private_demo', async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      json: async () => structuredClone(demoSong),
    };
  });

  assert.equal(document.metadata.title, 'Timeline Demo');
  assert.deepEqual(requests, [{
    url: '/__local-fixtures/private_demo.json',
    options: { cache: 'no-store' },
  }]);
});

test('development fixture loader rejects traversal and HTTP errors', async () => {
  await assert.rejects(
    loadLocalFixtureFromSearch('?fixture=../secret'),
    /fixture 名称/,
  );
  await assert.rejects(
    loadLocalFixtureFromSearch('?fixture=missing', async () => ({ ok: false, status: 404 })),
    /HTTP 404/,
  );
});
