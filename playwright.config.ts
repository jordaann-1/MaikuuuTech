import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  webServer: [
    {
      command: `${process.platform === 'win32' ? 'npm.cmd' : 'npm'} run dev -- --hostname 127.0.0.1`,
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'node scripts/ui-fixture-server.mjs',
      url: 'http://127.0.0.1:3101',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
});
