import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('public and sign-in pages pass automated accessibility checks', async ({ page }) => {
  test.setTimeout(90000);
  for (const route of ['/', '/projects', '/about', '/skills', '/contact', '/admin/login']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations, `Accessibility violations at ${route}`).toEqual([]);
  }
});
test('skip link and responsive navigation support keyboard access', async ({ page, isMobile }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  if (isMobile) {
    const toggle = page.getByRole('button', { name: 'Open navigation' });
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Close navigation' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  }
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Projects', exact: true })
    .click();
  await expect(page).toHaveURL(/\/projects$/);
});
test('home uses supplied identity and supports navigation', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.screenshot({ path: '.local/home-' + testInfo.project.name + '.png', fullPage: true });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Full-Stack Developer');
  await expect(page.getByText('Hello, I’m')).toContainText('MaikuuuTech');
  await page.getByRole('link', { name: 'View projects' }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Built with intention.');
});
test('project filters work without inventing projects', async ({ page }) => {
  await page.goto('/projects');
  await page.getByRole('searchbox').fill('no-match');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('heading', { name: 'No matching projects.' })).toBeVisible();
  await page.getByRole('link', { name: 'Clear filters' }).click();
  await expect(page.getByText('0 projects', { exact: true })).toBeVisible();
});
test('draft and unknown project URLs are not publicly rendered', async ({ page }) => {
  const response = await page.goto('/projects/private-unpublished-project');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('This page took');
  expect(response?.status()).toBe(404);
});
test('admin pages reject anonymous visitors and expose setup state', async ({ page }) => {
  await page.goto('/admin/projects');
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByText('Supabase setup required.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
});
test('contact shows an honest unavailable state without credentials', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.getByRole('button', { name: 'Submit inquiry' })).toBeDisabled();
  await page.getByRole('button', { name: 'General message', exact: true }).click();
  await expect(page.getByRole('textbox', { name: /^Full name/ })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Email address/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send message' })).toBeDisabled();
  await expect(
    page.getByText('The contact form is being configured.', { exact: false }),
  ).toBeVisible();
});
test('mobile and desktop layouts do not overflow', async ({ page }) => {
  for (const route of ['/', '/projects', '/about', '/skills', '/contact', '/admin/login']) {
    await page.goto(route);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});
test('API mutations and private data require authorization', async ({ request }) => {
  for (const route of [
    '/api/admin/content/projects',
    '/api/admin/messages',
    '/api/admin/media',
    '/api/admin/inquiries',
    '/api/admin/inquiries/summary',
    '/api/admin/inquiries/11111111-1111-4111-8111-111111111111',
    '/api/admin/inquiries/11111111-1111-4111-8111-111111111111/attachments/22222222-2222-4222-8222-222222222222',
  ]) {
    expect((await request.get(route)).status()).toBe(401);
  }
  expect(
    (
      await request.post('/api/admin/content/projects', {
        headers: { origin: 'https://attacker.example' },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post('/api/admin/media', { headers: { origin: 'http://localhost:3000' } })
    ).status(),
  ).toBe(401);
});
test('SEO and private route headers are present', async ({ page, request }) => {
  await page.goto('/projects');
  await expect(page).toHaveTitle('Projects | MaikuuuTech');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'http://localhost:3000/projects',
  );
  const response = await request.get('/admin/login');
  expect(response.headers()['x-robots-tag']).toContain('noindex');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Disallow: /admin');
});
