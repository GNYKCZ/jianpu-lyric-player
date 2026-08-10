import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { resolveLocalFixturePath } from '../scripts/local-fixture-plugin.js';

test('local fixture route resolves only safe JSON names inside local-fixtures', () => {
  const root = path.resolve('workspace');
  assert.equal(
    resolveLocalFixturePath(root, '/demo_song.json'),
    path.join(root, 'local-fixtures', 'demo_song.json'),
  );
  assert.equal(resolveLocalFixturePath(root, '/../private/secret.json'), null);
  assert.equal(resolveLocalFixturePath(root, '/Demo.json'), null);
  assert.equal(resolveLocalFixturePath(root, '/demo.txt'), null);
});
