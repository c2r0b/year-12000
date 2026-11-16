const { defineConfig } = require('@playwright/test');

const port = 4173;

module.exports = defineConfig({
  testDir: 'test/e2e',
  testMatch: '*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node test/e2e/server.js',
    url: `http://127.0.0.1:${port}/basic.html`,
    env: { PORT: String(port) },
    reuseExistingServer: !process.env.CI,
  },
});
