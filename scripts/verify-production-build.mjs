import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const forbiddenMarkers = ['__local-fixtures', 'local-fixture-client'];

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

console.log('Production output contains no local-fixture loading code.');
