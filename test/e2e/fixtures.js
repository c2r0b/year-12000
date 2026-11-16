// Playwright fixtures that run every test in a fresh Chromium profile with the
// real, unpacked extension loaded.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { test: base, chromium, expect } = require('@playwright/test');

const extensionPath = fs.realpathSync(path.join(__dirname, '..', '..'));

// Chromium derives the ID of an unpacked extension from its absolute path.
function unpackedExtensionId(directory) {
  const hash = crypto.createHash('sha256').update(directory).digest('hex');
  return [...hash.slice(0, 32)]
    .map((digit) => String.fromCharCode(97 + parseInt(digit, 16)))
    .join('');
}

const test = base.extend({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium', // the full browser: extensions do not load in the headless shell
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
  },

  page: async ({ context }, use) => {
    await use(context.pages()[0] ?? (await context.newPage()));
  },

  extensionId: async ({}, use) => {
    await use(unpackedExtensionId(extensionPath));
  },

  // openPopup(page) opens the extension popup in its own tab, attached to the
  // given page, and returns helpers for its two controls.
  openPopup: async ({ context, extensionId }, use) => {
    await use(async (targetPage) => {
      const popupUrl = `chrome-extension://${extensionId}/popup.html`;
      const popup = await context.newPage();
      let query = '';
      if (targetPage) {
        await popup.goto(popupUrl);
        const index = context.pages().indexOf(targetPage);
        const tabId = await popup.evaluate(
          async (tabIndex) => (await chrome.tabs.query({ index: tabIndex }))[0].id,
          index,
        );
        query = `?tabId=${tabId}`;
      }
      await popup.goto(popupUrl + query);
      return {
        page: popup,
        toggle: popup.locator('#toggle'),
        status: popup.locator('#status'),
      };
    });
  },
});

module.exports = { test, expect, extensionPath, unpackedExtensionId };
