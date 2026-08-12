import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const forbiddenMarkers = ['__local-fixtures', 'local-fixture-client'];
const expectedAssetPrefix = '/jianpu-lyric-player/assets/';

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  }));
  return nested.flat();
}

const files = await listFiles(path.resolve('dist'));
for (const file of files) {
  const contents = await readFile(file, 'utf8');
  const marker = forbiddenMarkers.find((candidate) => contents.includes(candidate));
  if (marker) {
    throw new Error(`Production output ${file} contains forbidden development marker: ${marker}`);
  }
}

const builtIndex = await readFile(path.resolve('dist', 'index.html'), 'utf8');
if (!builtIndex.includes(expectedAssetPrefix)) {
  throw new Error(`Production output must use the GitHub Pages asset prefix: ${expectedAssetPrefix}`);
}

const builtScripts = files.filter((file) => file.endsWith('.js'));
const scriptContents = await Promise.all(builtScripts.map((file) => readFile(file, 'utf8')));
if (!scriptContents.some((contents) => contents.includes('向光而行（虚构示例）'))) {
  throw new Error('Production output must bundle the fictional public Demo Song.');
}

console.log('Production output bundles the public Demo, excludes local fixtures, and uses the GitHub Pages base path.');
