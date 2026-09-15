import sharp from 'sharp';
import { mkdir, access } from 'node:fs/promises';

await mkdir('assets', { recursive: true });
await sharp('public/icon.svg')
  .resize(1024, 1024)
  .png()
  .toFile('assets/app-icon-1024.png');
await sharp('public/icon.svg')
  .resize(192, 192)
  .png()
  .toFile('public/icon-192.png');
console.log('Generated original 1024x1024 app icon and 192x192 web icon.');
try {
  await access('android/app/src/main/res');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.log(
    'Android is not generated yet; native icons will be generated on the next run.',
  );
  process.exit(0);
}
for (const [density, size] of Object.entries({
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
})) {
  const dir = `android/app/src/main/res/mipmap-${density}`;
  await mkdir(dir, { recursive: true });
  await sharp('public/icon.svg')
    .resize(size, size)
    .png()
    .toFile(`${dir}/ic_launcher.png`);
  await sharp('public/icon.svg')
    .resize(size, size)
    .png()
    .toFile(`${dir}/ic_launcher_round.png`);
  const foregroundSize = Math.round(size * 2.25);
  const foreground = await sharp('public/icon.svg')
    .resize(size + 6, size + 6)
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: foregroundSize,
      height: foregroundSize,
      channels: 4,
      background: '#174f45',
    },
  })
    .composite([{ input: foreground, gravity: 'center' }])
    .png()
    .toFile(`${dir}/ic_launcher_foreground.png`);
}
console.log('Generated Steady Android launcher icons at all five densities.');
