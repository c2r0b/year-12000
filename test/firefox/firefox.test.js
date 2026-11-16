// Loads the packaged Firefox build in a real Firefox and checks the parts that
// differ from Chromium: the `browser` API, closed shadow roots, the popup.
// Run with: npm run test:firefox
//
// Selenium finds Firefox and geckodriver on the machine, or downloads them.
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');
const { Builder, By, until } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');

const root = path.join(__dirname, '..', '..');
const PORT = 4174;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const ADDON_ID = '@year-12000.c2r0b';
// Firefox gives every installed extension a random internal ID; pin it so the
// popup has a known address.
const INTERNAL_ID = '7a3f6c1e-5b2d-4e8a-9c0f-1d2e3f4a5b6c';
const POPUP = `moz-extension://${INTERNAL_ID}/popup.html`;
const TIMEOUT = 10_000;

let driver;
let server;

const textOf = async (selector) => driver.findElement(By.css(selector)).getText();

async function waitForText(selector, expected) {
  try {
    await driver.wait(async () => (await textOf(selector)) === expected, TIMEOUT);
  } catch {
    assert.equal(await textOf(selector), expected, selector);
  }
}

async function waitFor(read, expected, label) {
  try {
    await driver.wait(async () => (await read()) === expected, TIMEOUT);
  } catch {
    assert.equal(await read(), expected, label);
  }
}

// Opens the popup in its own tab, attached to the first tab, and returns to it
// with `use(popupHandle)`.
async function openPopup(pageHandle) {
  await driver.switchTo().newWindow('tab');
  await driver.get(POPUP);
  const tabId = await driver.executeAsyncScript((done) => {
    browser.tabs.query({ index: 0 }).then((tabs) => done(tabs[0].id));
  });
  await driver.get(`${POPUP}?tabId=${tabId}`);
  const popupHandle = await driver.getWindowHandle();
  return {
    status: async () => {
      await driver.switchTo().window(popupHandle);
      return textOf('#status');
    },
    toggle: async () => {
      await driver.switchTo().window(popupHandle);
      await driver.findElement(By.css('#toggle')).click();
    },
    close: async () => {
      await driver.switchTo().window(popupHandle);
      await driver.close();
      await driver.switchTo().window(pageHandle);
    },
    page: () => driver.switchTo().window(pageHandle),
  };
}

before(async () => {
  const zip = path.join(
    root,
    execFileSync('node', ['scripts/package.js', 'firefox'], { cwd: root, encoding: 'utf8' }).trim(),
  );

  server = spawn('node', ['test/e2e/server.js'], { cwd: root, env: { ...process.env, PORT: String(PORT) } });
  await new Promise((resolve) => server.stdout.once('data', resolve));

  const options = new firefox.Options()
    .addArguments('-headless')
    .setPreference('extensions.webextensions.uuids', JSON.stringify({ [ADDON_ID]: INTERNAL_ID }));
  // Without this flag geckodriver refuses to open moz-extension:// pages.
  const service = new firefox.ServiceBuilder().addArguments('--allow-system-access');
  driver = await new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .setFirefoxService(service)
    .build();
  await driver.installAddon(zip, true);
});

after(async () => {
  await driver?.quit();
  server?.kill();
});

describe('Firefox', () => {
  test('converts dates and leaves quantities alone', async () => {
    await driver.get(`${ORIGIN}/basic.html`);
    await waitForText('#iso', '12026-11-16');
    await waitForText('#long', 'Published on November 16, 12026 by someone.');
    await waitForText('#range', 'The war years (11939–11945) were hard.');
    await waitForText('#time', '11500');
    assert.equal(await textOf('#quantity'), 'About 2000 people paid $1999 for 1500 units.');
    assert.equal(await textOf('#code'), 'const year = 2026; // 2026-11-16');
  });

  test('converts the tab title and tooltips', async () => {
    await driver.get(`${ORIGIN}/chrome.html`);
    await driver.wait(until.titleIs('World Cup 12026 – Example'), TIMEOUT);
    await waitFor(
      () => driver.findElement(By.css('#tip')).getAttribute('title'),
      'Founded in 11998',
      'tooltip',
    );
  });

  test('never touches form values', async () => {
    await driver.get(`${ORIGIN}/form.html`);
    await waitForText('#plain', 'Edited in 12026');
    await waitForText('#label', 'Departure on 12026-11-16');
    assert.equal(await driver.findElement(By.css('#date')).getAttribute('value'), '2026-11-16');
    assert.equal(await driver.findElement(By.css('#text')).getAttribute('value'), 'in 2026');
    assert.equal(await driver.findElement(By.css('#textarea')).getAttribute('value'), 'November 16, 2026');
    assert.equal(await textOf('#editable'), 'Edited in 2026');
  });

  test('uses context from neighbouring elements and table headers', async () => {
    await driver.get(`${ORIGIN}/context.html`);
    await waitForText('#done', '© 12026');
    await waitForText('#after-word', '11500');
    await waitForText('#column-year', '11500');
    assert.equal(await textOf('#before-unit'), '2026');
    assert.equal(await textOf('#column-price'), '2026');
  });

  test('converts open, closed, nested and late shadow roots', async () => {
    await driver.get(`${ORIGIN}/shadow.html`);
    await waitForText('#light', 'Light DOM, 12026-11-16.');
    const inShadow = (script) => () => driver.executeScript(script);
    await waitFor(
      inShadow(`return document.getElementById('open-host').shadowRoot.querySelector('#open').textContent`),
      'Open since 12026-11-16',
      'open shadow root',
    );
    await waitFor(
      inShadow(`return window.closedRoot.querySelector('#closed').textContent`),
      'Closed since 12027-01-02',
      'closed shadow root',
    );
    await waitFor(
      inShadow(
        `return document.getElementById('outer-host').shadowRoot.getElementById('inner-host').shadowRoot.querySelector('#nested').textContent`,
      ),
      'Nested in 12028',
      'nested shadow root',
    );
    await waitFor(
      inShadow(`return document.getElementById('late-host').shadowRoot?.querySelector('#late').textContent ?? ''`),
      'Late in 12029',
      'late shadow root',
    );
  });

  test('converts content added later', async () => {
    await driver.get(`${ORIGIN}/dynamic.html`);
    await waitForText('#live', 'Started in 12026');
    await driver.executeScript(
      `document.getElementById('root').insertAdjacentHTML('beforeend', '<p id="added">Released 2027-01-02</p>')`,
    );
    await waitForText('#added', 'Released 12027-01-02');
  });

  test('the popup counts, switches off and on again', async () => {
    await driver.get(`${ORIGIN}/frames.html`);
    const pageHandle = await driver.getWindowHandle();
    await waitForText('#outer', 'Outside, in 12026.');

    const popup = await openPopup(pageHandle);
    await waitFor(popup.status, '3 dates updated on this page', 'counter');

    await popup.toggle();
    await waitFor(popup.status, 'Off', 'status when off');
    await popup.page();
    await waitForText('#outer', 'Outside, in 2026.');

    await popup.toggle();
    await waitFor(popup.status, '3 dates updated on this page', 'counter after switching on');
    await popup.page();
    await waitForText('#outer', 'Outside, in 12026.');
    await popup.close();
  });
});
