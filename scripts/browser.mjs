import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { existsSync } from 'node:fs';

const mode = process.argv[2];
if (mode !== 'test' && mode !== 'install')
  throw new Error('Choose test or install.');
const args = mode === 'install' ? ['install', 'chromium'] : ['test'];
const localLibraries = path.resolve(
  `node_modules/.cache/browser-system/usr/lib/${process.arch === 'arm64' ? 'aarch64' : 'x86_64'}-linux-gnu`,
);
const localFonts = path.resolve(
  'node_modules/.cache/browser-system/fonts.conf',
);
const result = spawnSync(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', ...args],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: path.resolve(
        'node_modules/.cache/ms-playwright',
      ),
      ...(existsSync(localLibraries)
        ? {
            LD_LIBRARY_PATH: `${localLibraries}:${localLibraries.replace('/usr/lib/', '/lib/')}`,
          }
        : {}),
      ...(existsSync(localFonts) ? { FONTCONFIG_FILE: localFonts } : {}),
    },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
