import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base = process.env.WORKER_TEST_URL || 'http://127.0.0.1:8787';
const routes = [
  ['/', 200],
  ['/projects', 200],
  ['/about', 200],
  ['/skills', 200],
  ['/experience', 200],
  ['/education', 200],
  ['/certificates', 200],
  ['/achievements', 200],
  ['/services', 200],
  ['/resume', 200],
  ['/contact', 200],
  ['/projects/missing-project', 404],
  ['/api/admin/messages', 401],
  ['/api/admin/media', 401],
  ['/api/admin/inquiries', 401],
  ['/api/catalog', 200],
  ['/privacy', 200],
];
for (const [route, status] of routes) {
  const response = await fetch(new URL(route, base), { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, status, `${route} status`);
  assert.equal(
    response.headers.get('x-content-type-options'),
    'nosniff',
    `${route} security headers`,
  );
  console.log(`PASS: Worker ${route} returns ${status}`);
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base);
  assert.match(await page.locator('h1').innerText(), /Full-Stack\s+Developer/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const background = await page
    .locator('body')
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  assert.equal(background, 'rgb(11, 13, 18)', 'Worker serves and applies built CSS');
  await mkdir('.local', { recursive: true });
  await page.screenshot({ path: '.local/worker-home.png', fullPage: true });
  await page.goto(new URL('/admin', base).toString());
  assert.match(page.url(), /\/admin\/login$/);
  assert.equal(errors.length, 0, `Browser runtime errors: ${errors.join('; ')}`);
  console.log('PASS: Worker browser rendering, CSS, redirects, and runtime error checks.');
} finally {
  await browser.close();
}
