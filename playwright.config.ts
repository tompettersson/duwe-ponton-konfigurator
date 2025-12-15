import { defineConfig, devices } from '@playwright/test';

const PLAYWRIGHT_PORT = Number(process.env.PLAYWRIGHT_TEST_PORT ?? 3100);
const PLAYWRIGHT_BASE_URL = `http://localhost:${PLAYWRIGHT_PORT}`;

/**
 * Playwright Configuration for Pontoon Configurator Tests
 * 
 * Tests the new architecture vs old architecture
 * Focus on critical bug fixes and performance improvements
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: PLAYWRIGHT_BASE_URL,
    env: {
      PORT: String(PLAYWRIGHT_PORT),
      NEXT_PUBLIC_SHOW_DEMO_PONTOON: 'false',
      NEXT_PUBLIC_DISABLE_LOGIN_OVERLAY: 'true',
      NEXT_PUBLIC_SHOW_KEYBOARD_SHORTCUTS_OVERLAY: 'false',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
