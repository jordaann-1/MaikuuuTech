import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const fixture = 'http://127.0.0.1:3101';
const id = '55555555-5555-4555-8555-555555555555',
  service = '33333333-3333-4333-8333-333333333333',
  budget = '44444444-4444-4444-8444-444444444444';
const reference = 'MKT-ABCDEF1234567890ABCDEF1234567890';
const inquiry = {
  id,
  public_reference: reference,
  project_title: 'Fixture inventory application',
  full_name: 'Fixture Client',
  email: 'fixture@example.com',
  external_contact: 'https://example.com/fixture',
  service_id: service,
  service_name_snapshot: 'Fixture website development',
  budget_range: 'Fixture budget · Prefer to discuss',
  project_description: 'This is an isolated test inquiry for verifying the interface.',
  status: 'New',
  priority: 'Normal',
  is_read: false,
  is_archived: false,
  admin_notes: 'Private fixture notes',
  created_at: '2026-10-15T10:30:00Z',
  updated_at: '2026-10-15T10:30:00Z',
  inquiry_activity: [],
  inquiry_attachments: [],
  privacy_consent_at: '2026-10-15T10:30:00Z',
  privacy_notice_version: '2026-10-15',
};
test.beforeEach(async ({ page }) => {
  await page.route('**/api/admin/inquiries/summary', (route) =>
    route.fulfill({
      json: {
        counts: {
          total: 1,
          new: 1,
          in_progress: 0,
          awaiting_client: 0,
          completed: 0,
          declined: 0,
          unread: 1,
        },
        recent: [inquiry],
      },
    }),
  );
  await page.route(/\/api\/admin\/inquiries\?/, (route) =>
    route.fulfill({ json: { rows: [inquiry], count: 1 } }),
  );
});
test('isolated inquiry form validates, preserves a failed request and displays a confirmed reference', async ({
  page,
}) => {
  let attempts = 0;
  await page.route('**/api/inquiries', async (route) => {
    attempts++;
    const data = route.request().postDataBuffer()!.toString();
    expect(data).toContain('Fixture Client');
    expect(data).toContain('fixture-requirements.pdf');
    await route.fulfill({
      status: attempts === 1 ? 503 : 201,
      json: attempts === 1 ? { error: 'Fixture temporary failure. Retry safely.' } : { reference },
    });
  });
  await page.goto(fixture + '/?mode=form');
  await page.getByRole('button', { name: 'Submit inquiry' }).click();
  await expect(page.getByRole('alert')).toContainText('highlighted');
  await page.getByLabel('What service do you need?').selectOption(service);
  await page.getByLabel('Full name').fill('Fixture Client');
  await page.getByLabel('Email address').fill('fixture@example.com');
  await page.getByLabel('Project title').fill('Fixture requirements');
  await page
    .getByLabel('Project description')
    .fill('A sufficiently detailed isolated test inquiry to verify the public form.');
  await page.getByLabel('Estimated budget').selectOption(budget);
  await page
    .getByLabel('Supporting attachments', { exact: true })
    .setInputFiles({
      name: 'fixture-requirements.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7\nFixture document'),
    });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Submit inquiry' }).click();
  await expect(page.getByRole('alert')).toContainText('Fixture temporary failure');
  await expect(page.getByLabel('Full name')).toHaveValue('Fixture Client');
  await expect(page.getByRole('button', { name: 'Remove fixture-requirements.pdf' })).toBeVisible();
  await page.getByRole('button', { name: 'Submit inquiry' }).click();
  await expect(
    page.getByRole('heading', { name: 'Your request has been received.' }),
  ).toBeVisible();
  await expect(page.getByText(reference, { exact: true })).toBeVisible();
  expect(attempts).toBe(2);
});
test('isolated filters send bounded server-side criteria and pagination', async ({ page }) => {
  const urls: string[] = [];
  await page.route(/\/api\/admin\/inquiries\?/, (route) => {
    urls.push(route.request().url());
    return route.fulfill({ json: { rows: [inquiry], count: 21 } });
  });
  await page.goto(fixture + '/?mode=list');
  await page.getByLabel('Search inquiries').fill('fixture@example.com');
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('New');
  await page.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('High');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect
    .poll(() =>
      urls.some(
        (url) =>
          new URL(url).searchParams.get('search') === 'fixture@example.com' &&
          new URL(url).searchParams.get('priority') === 'High',
      ),
    )
    .toBe(true);
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect
    .poll(() => urls.some((url) => new URL(url).searchParams.get('page') === '1'))
    .toBe(true);
});
test('isolated detail saves status, priority and private notes and confirms deletion', async ({
  page,
}) => {
  let saved: Record<string, unknown> = {},
    deleted = false;
  await page.route('**/api/admin/inquiries/' + id, async (route) => {
    if (route.request().method() === 'DELETE') {
      deleted = true;
      await route.fulfill({ json: { ok: true } });
    } else {
      saved = route.request().postDataJSON();
      await route.fulfill({ json: { ...inquiry, ...saved } });
    }
  });
  await page.goto(fixture + '/?mode=detail');
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('In Progress');
  await page.getByRole('combobox', { name: /^Admin priority/ }).selectOption('High');
  await page
    .getByRole('textbox', { name: /^Internal notes/ })
    .fill('Private updated fixture notes');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toHaveText('Changes saved.');
  expect(saved).toEqual({
    status: 'In Progress',
    priority: 'High',
    admin_notes: 'Private updated fixture notes',
  });
  await expect(page.getByRole('link', { name: 'Open email draft' })).toHaveAttribute(
    'href',
    /^mailto:/,
  );
  await expect(page.getByRole('link', { name: 'Open contact link' })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
  await page
    .getByRole('button', { name: 'Delete Fixture inventory application', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Keep item' }).click();
  expect(deleted).toBe(false);
  await page
    .getByRole('button', { name: 'Delete Fixture inventory application', exact: true })
    .click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect.poll(() => deleted).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as typeof window & { fixtureNavigation?: string }).fixtureNavigation,
      ),
    )
    .toBe('/admin/inquiries');
});
test('isolated service editor saves database-backed catalog controls', async ({ page }) => {
  let saved: Record<string, unknown> | undefined;
  await page.route('**/api/admin/content/services', async (route) => {
    saved = route.request().postDataJSON().data;
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto(fixture + '/?mode=editor&entity=services');
  await page.getByRole('textbox', { name: 'Title', exact: false }).fill('Fixture new service');
  await page.getByLabel('Service slug').fill('fixture-new-service');
  await page.getByLabel('Indicative starting price (PHP)').fill('1500');
  await page.getByLabel('Display order').fill('4');
  await page.getByLabel('Featured service').check();
  await page.getByLabel('Published / visible to visitors').check();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect.poll(() => saved?.title).toBe('Fixture new service');
  expect(saved).toMatchObject({
    starting_price: 1500,
    sort_order: 4,
    is_featured: true,
    is_published: true,
    is_archived: false,
  });
});
test('redesigned fixture components have no accessibility violations in dark and light themes', async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['dark', 'light'])
    for (const mode of [
      'form',
      'list',
      'detail',
      'overview',
      'editor',
      'manager',
      'case',
      'cards',
    ]) {
      await page.goto(fixture + '/?mode=' + mode);
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
      }, theme);
      await expect(page.locator('h1')).toBeVisible();
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(result.violations, theme + ' ' + mode).toEqual([]);
    }
});
test('all requested widths fit inquiry forms, lists and detail layouts', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'Explicit widths use the desktop browser project.');
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920])
    for (const mode of ['form', 'list', 'detail']) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(fixture + '/?mode=' + mode);
      await expect(page.locator('h1')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        width + ' ' + mode,
      ).toBe(true);
      if ([390, 1440].includes(width))
        await page.screenshot({
          path: '.local/inquiry-' + mode + '-' + width + '.png',
          fullPage: true,
        });
    }
  expect(errors).toEqual([]);
});
test('redesigned content and editor layouts fit mobile, tablet and desktop', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'Explicit viewport matrix.');
  test.setTimeout(120000);
  for (const width of [320, 768, 1440])
    for (const mode of ['overview', 'manager', 'editor', 'cards', 'case']) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(fixture + '/?mode=' + mode);
      await expect(page.locator('h1')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        width + ' ' + mode,
      ).toBe(true);
      if (width === 1440)
        await page.screenshot({ path: '.local/redesign-' + mode + '.png', fullPage: true });
    }
});
test('theme choice persists and mobile admin navigation restores keyboard focus', async ({
  page,
  isMobile,
}) => {
  await page.goto(fixture + '/?mode=list');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  if (isMobile) {
    const toggle = page.getByRole('button', { name: 'Open sidebar' });
    await toggle.click();
    await expect(page.getByRole('dialog', { name: 'Administration workspace' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open sidebar' })).toBeFocused();
  }
});
