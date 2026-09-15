import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
const headers = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Cache-Control': 'no-cache',
};

export const server = createServer(async (req, res) => {
  const respond = (code, body, type = 'text/plain; charset=utf-8') => {
    res.writeHead(code, { ...headers, 'Content-Type': type });
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    respond(405, 'Method not allowed');
    return;
  }
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === '/health') {
      await stat(path.join(root, 'index.html'));
      respond(
        200,
        JSON.stringify({
          status: 'ok',
          app: 'steady',
          mode: 'browser-preview',
        }),
        'application/json',
      );
      return;
    }
    if (
      pathname.includes('\0') ||
      pathname.includes('\\') ||
      pathname.split('/').some((part) => part.startsWith('.'))
    ) {
      respond(404, 'Not found');
      return;
    }
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = await realpath(path.resolve(root, relative));
    if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) {
      respond(404, 'Not found');
      return;
    }
    const type = mime[path.extname(file)];
    if (!type) {
      respond(404, 'Not found');
      return;
    }
    respond(200, await readFile(file), type);
  } catch (error) {
    if (error instanceof URIError || error instanceof TypeError)
      respond(400, 'Invalid request');
    else if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      ['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code)
    )
      respond(404, 'Not found');
    else {
      console.error('Request failed: unable to serve app asset.');
      respond(500, 'Unable to serve app asset');
    }
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 8764);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be an integer from 1 to 65535.');
  await stat(path.join(root, 'index.html'));
  server.listen(port, '0.0.0.0', () =>
    console.log(`Steady listening on port ${port}`),
  );
}
