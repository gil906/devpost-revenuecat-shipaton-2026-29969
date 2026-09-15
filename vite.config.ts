import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const key = loadEnv(
    mode,
    process.cwd(),
    'VITE_REVENUECAT_ANDROID_API_KEY',
  ).VITE_REVENUECAT_ANDROID_API_KEY?.trim();
  if (key && !/^(goog|test)_[a-zA-Z0-9]+$/.test(key)) {
    throw new Error(
      'RevenueCat configuration must use a public Android or Test Store SDK key. The supplied value was not printed or bundled.',
    );
  }
  return {
    server: { host: '0.0.0.0', port: 8764, strictPort: true },
    test: { include: ['tests/**/*.test.ts'], environment: 'node' },
  };
});
