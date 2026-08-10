import { defineConfig } from 'vite';
import path from 'node:path';
import { localFixturePlugin } from './scripts/local-fixture-plugin.js';

export default defineConfig(({ command }) => ({
  plugins: command === 'serve' ? [localFixturePlugin()] : [],
  resolve: {
    alias: {
      '#song-loader': path.resolve(command === 'serve'
        ? 'src/dev/song-loader.js'
        : 'src/song/demo-song-loader.js'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
}));
