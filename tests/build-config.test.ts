import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('rejects a secret-like client key before build without printing its value', () => {
  const sentinel = 'sk_PRIVATE_VALUE_MUST_NOT_APPEAR';
  const result = spawnSync(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'build'],
    {
      encoding: 'utf8',
      env: { ...process.env, VITE_REVENUECAT_ANDROID_API_KEY: sentinel },
      timeout: 20_000,
    },
  );
  expect(result.error).toBeUndefined();
  expect(result.status).not.toBe(0);
  const output = result.stdout + result.stderr;
  expect(output).toContain('must use a public Android or Test Store SDK key');
  expect(output).not.toContain(sentinel);
});
