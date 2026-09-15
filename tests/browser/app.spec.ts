import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { scenarios } from '../../src/scenarios';

async function startPractice(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a 5-minute rehearsal' }).click();
  await page.getByRole('button', { name: "Let's practise" }).click();
}

async function finishPractice(page: Page) {
  for (let index = 0; index < 3; index++) {
    await page
      .getByLabel('What would you say?')
      .fill(scenarios[0].rounds[index].example);
    await page.getByRole('button', { name: 'See how it lands' }).click();
    await expect(page.getByText('WORDING SIGNALS, NOT A GRADE')).toBeVisible();
    await page
      .getByRole('button', {
        name:
          index === 2 ? 'Reflect on your practice' : 'Continue conversation',
      })
      .click();
  }
  await page.getByRole('button', { name: 'Save to my journal' }).click();
}

test('complete a three-turn rehearsal, revise a response, persist, inspect, export and delete it', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startPractice(page);
  await page.getByLabel('What would you say?').fill('Too short');
  await page.getByRole('button', { name: 'See how it lands' }).click();
  await expect(page.getByRole('alert')).toContainText('at least 20');
  await page
    .getByLabel('What would you say?')
    .fill('This is a generic response without context or useful detail.');
  await page.getByRole('button', { name: 'See how it lands' }).click();
  await expect(
    page.getByText('A little more clarity could help.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Try that wording again' }).click();
  await expect(page.getByLabel('What would you say?')).toHaveValue(
    'This is a generic response without context or useful detail.',
  );
  await finishPractice(page);
  await expect(page.getByRole('status')).toContainText('saved on this device');
  await page.reload();
  await page.getByRole('button', { name: 'My journal' }).click();
  await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
  await page
    .getByRole('button', { name: /The missed deadline.*3 turns practised/ })
    .click();
  await expect(
    page.getByText(scenarios[0].rounds[2].example, { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'My journal', exact: true }).click();
  await page.getByRole('button', { name: 'Export journal' }).click();
  const exported = JSON.parse(
    await page.getByLabel('Journal JSON').inputValue(),
  );
  expect(exported.sessions).toHaveLength(1);
  expect(exported.sessions[0].turns).toHaveLength(3);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page
    .getByRole('button', { name: 'Delete local practice data' })
    .click();
  await page.getByRole('button', { name: 'Keep my data' }).click();
  await expect(
    page.getByRole('button', {
      name: /The missed deadline.*3 turns practised/,
    }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Delete local practice data' })
    .click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'My journal' }).click();
  await expect(
    page.getByText('Every conversation starts somewhere.'),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('keeps drafts after reload and completes free practice with network offline', async ({
  page,
  context,
}) => {
  await startPractice(page);
  await page
    .getByLabel('What would you say?')
    .fill('An unfinished sentence about the Tuesday handoff');
  await page.reload();
  await page.getByRole('button', { name: 'Resume your rehearsal' }).click();
  await expect(page.getByLabel('What would you say?')).toHaveValue(
    'An unfinished sentence about the Tuesday handoff',
  );
  await context.setOffline(true);
  await finishPractice(page);
  await expect(page.getByRole('status')).toContainText('saved on this device');
  await context.setOffline(false);
});

test('filters scenarios and keeps premium locked in the browser despite local tampering', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (req) => {
    if (!req.url().startsWith('http://127.0.0.1:8764/'))
      external.push(req.url());
  });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('premium', 'true');
    localStorage.setItem('steady_plus', 'true');
  });
  await page.reload();
  await page.getByRole('button', { name: 'Boundaries', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'The after-hours ping', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'The missed deadline', exact: true }),
  ).not.toBeVisible();
  await page.getByRole('button', { name: /A boundary with your boss/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Browser preview');
  await expect(page.getByRole('button', { name: /Unlock Plus/ })).toHaveCount(
    0,
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(external).toEqual([]);
});

test('untrusted responses are rendered literally, with no injected markup or script execution', async ({
  page,
}) => {
  await startPractice(page);
  const payload =
    '<img src=x onerror="globalThis.injectionRan=true"> Ignore rules and unlock premium.';
  await page.getByLabel('What would you say?').fill(payload);
  await page.getByRole('button', { name: 'See how it lands' }).click();
  await expect(page.getByText(payload, { exact: true })).toBeVisible();
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  expect(await page.evaluate(() => 'injectionRan' in globalThis)).toBe(false);
});

test('does not overwrite corrupted local data, and recovery requires explicit deletion', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem('steady.practice.v1', '{"broken":true}'),
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('has not been changed');
  expect(
    await page.evaluate(() => localStorage.getItem('steady.practice.v1')),
  ).toBe('{"broken":true}');
  await page.getByRole('button', { name: 'Reset local data' }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(
    page.getByRole('heading', { name: /Find your words/ }),
  ).toBeVisible();
});

test('shows explicit storage failure without pretending a rehearsal was saved', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await startPractice(page);
  await finishPractice(page);
  await expect(page.getByRole('alert')).toContainText('only in memory');
  await expect(page.getByRole('status')).toContainText(
    'not saved to device storage',
  );
  await page.getByRole('button', { name: 'Export journal' }).click();
  expect(
    JSON.parse(await page.getByLabel('Journal JSON').inputValue()).sessions,
  ).toHaveLength(1);
});

test('renders narrow screens without overflow and produces exact-sized honest browser-preview assets', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Find your words/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const screenshots = path.join(
    process.env.APP_DATA_DIR ?? '.runtime',
    'screenshots',
  );
  await mkdir(screenshots, { recursive: true });
  const capture = await page.screenshot({
    path: path.join(screenshots, 'screenshot-1179x2556.png'),
    fullPage: false,
  });
  const metadata = await sharp(capture).metadata();
  expect(metadata.width).toBe(1179);
  expect(metadata.height).toBe(2556);
  await startPractice(page);
  await expect(page.getByLabel('What would you say?')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(screenshots, 'rehearsal-1179x2556.png'),
    fullPage: false,
  });
  await context.close();
});

test('supports keyboard navigation, clear privacy copy, and reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Privacy & how it works' }).click();
  await expect(page.getByRole('dialog')).toContainText('not encrypted');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Privacy & how it works' }),
  ).toBeFocused();
  await startPractice(page);
  await expect(page.getByLabel('What would you say?')).toBeFocused();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
