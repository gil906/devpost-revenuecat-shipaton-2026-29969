import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
import sharp from 'sharp';

const base = 'http://127.0.0.1:8764';
const child = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, PORT: '8764' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', (data) => {
  output += data.toString();
});
child.stderr.on('data', (data) => {
  output += data.toString();
});
child.on('error', (error) => {
  output += error.message;
});
try {
  let healthy = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${output}`);
    try {
      const res = await fetch(`${base}/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (res.ok && output.includes('Steady listening')) {
        healthy = true;
        break;
      }
    } catch (error) {
      if (!(error instanceof TypeError) && !(error instanceof DOMException))
        throw error;
    }
    await setTimeout(100);
  }
  assert(healthy, `Server did not become ready: ${output}`);
  const health = await fetch(`${base}/health`);
  assert.deepEqual(await health.json(), {
    status: 'ok',
    app: 'steady',
    mode: 'browser-preview',
  });
  const index = await fetch(base);
  const html = await index.text();
  assert.match(html, /Steady - Find your words/);
  assert.match(
    index.headers.get('content-security-policy'),
    /frame-ancestors 'none'/,
  );
  const script = html.match(/src="([^"]+\.js)"/)?.[1];
  assert(script, 'Production entry script missing');
  const bundle = await fetch(`${base}${script}`);
  assert.equal(bundle.status, 200);
  assert.match(await bundle.text(), /missed-deadline/);
  for (const route of [
    '/privacy.html',
    '/terms.html',
    '/icon.svg',
    '/icon-192.png',
  ])
    assert.equal((await fetch(`${base}${route}`)).status, 200, route);
  for (const route of [
    '/.env',
    '/package.json',
    '/%2e%2e%2f.env',
    '/missing',
    '/src/App.tsx',
  ])
    assert.equal((await fetch(`${base}${route}`)).status, 404, route);
  assert.equal((await fetch(`${base}/%FF`)).status, 400);
  assert.equal(
    (await fetch(base, { method: 'POST', body: 'do not persist me' })).status,
    405,
  );
  assert.equal(await (await fetch(base, { method: 'HEAD' })).text(), '');
  const icon = await sharp('assets/app-icon-1024.png').metadata();
  assert.equal(icon.width, 1024);
  assert.equal(icon.height, 1024);
  for (const file of [
    'assets/screenshot-1179x2556.png',
    'assets/rehearsal-1179x2556.png',
  ]) {
    const image = await sharp(file).metadata();
    assert.equal(image.width, 1179);
    assert.equal(image.height, 2556);
  }
  console.log(
    'Smoke passed: health, production bundle, policy pages, request isolation, methods, icon and screenshot dimensions.',
  );
} finally {
  if (child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
}
