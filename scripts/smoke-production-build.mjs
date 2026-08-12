import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const port = 4183;
const publicBase = '/jianpu-lyric-player/';
const distDirectory = path.resolve('dist');
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
]);

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    if (!pathname.startsWith(publicBase)) {
      response.writeHead(404).end();
      return;
    }
    const relativePath = pathname.slice(publicBase.length) || 'index.html';
    const filePath = path.resolve(distDirectory, relativePath);
    if (!filePath.startsWith(`${distDirectory}${path.sep}`) && filePath !== path.join(distDirectory, 'index.html')) {
      response.writeHead(404).end();
      return;
    }
    const contents = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentTypes.get(path.extname(filePath)) ?? 'application/octet-stream' });
    response.end(contents);
  } catch {
    response.writeHead(404).end();
  }
});

let browser;
try {
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}${publicBase}?fixture=xiang_zi_you`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.measure-card');
  const state = await page.evaluate(() => ({
    title: globalThis.document.querySelector('#song-title')?.textContent,
    measureCount: globalThis.document.querySelectorAll('.measure-card').length,
    errorHidden: globalThis.document.querySelector('#error-message')?.hidden,
  }));
  if (state.title !== '向光而行（虚构示例）' || state.measureCount === 0 || !state.errorHidden) {
    throw new Error(`Production Demo failed to initialize: ${JSON.stringify(state)}`);
  }
  console.log(`Production preview loaded ${state.measureCount} public Demo measures.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
