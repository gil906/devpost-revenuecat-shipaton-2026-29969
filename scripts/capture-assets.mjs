import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const screenshots = path.join(
  process.env.APP_DATA_DIR ?? '.runtime',
  'screenshots',
);
await mkdir('assets', { recursive: true });
for (const name of ['screenshot-1179x2556.png', 'rehearsal-1179x2556.png']) {
  const source = path.join(screenshots, name);
  const metadata = await sharp(source).metadata();
  if (metadata.width !== 1179 || metadata.height !== 2556)
    throw new Error(
      'Run the browser capture test to generate correctly sized screenshots.',
    );
  await copyFile(source, path.join('assets', name));
}
console.log(
  'Copied verified, frame-free browser preview screenshots into assets/.',
);
