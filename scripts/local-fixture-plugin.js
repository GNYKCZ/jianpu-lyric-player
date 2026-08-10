import { readFile } from 'node:fs/promises';
import path from 'node:path';

const FIXTURE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export function resolveLocalFixturePath(root, requestUrl) {
  const url = new URL(requestUrl, 'http://localhost');
  const match = /^\/([a-z0-9][a-z0-9_-]*)\.json$/.exec(url.pathname);
  if (!match || !FIXTURE_NAME_PATTERN.test(match[1])) return null;
  return path.join(root, 'local-fixtures', `${match[1]}.json`);
}

export function localFixturePlugin({ readFixture = readFile } = {}) {
  let root = process.cwd();

  return {
    name: 'local-fixture-server',
    apply: 'serve',
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use('/__local-fixtures', async (request, response, next) => {
        const fixturePath = request.url && resolveLocalFixturePath(root, request.url);
        if (!fixturePath) {
          response.statusCode = 400;
          response.end('Invalid local fixture name.');
          return;
        }

        try {
          const contents = await readFixture(fixturePath, 'utf8');
          JSON.parse(contents);
          response.statusCode = 200;
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(contents);
        } catch (error) {
          if (error instanceof SyntaxError) {
            response.statusCode = 422;
            response.end('Local fixture is not valid JSON.');
            return;
          }
          if (error && typeof error === 'object' && error.code === 'ENOENT') {
            response.statusCode = 404;
            response.end('Local fixture not found.');
            return;
          }
          next(error);
        }
      });
    },
  };
}
