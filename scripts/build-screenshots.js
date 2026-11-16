// Takes the README screenshots from the real extension running in Chromium.
// Run with: npm run screenshots
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const { extensionPath, unpackedExtensionId } = require('../test/e2e/fixtures');

const docsDir = path.join(__dirname, '..', 'docs');

const DEMO_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Demo</title>
    <style>
      body { margin: 0; padding: 24px; background: #eef6f3; font: 16px/1.55 system-ui, sans-serif; color: #0f2a3a; }
      article { width: 430px; padding: 26px 28px; border-radius: 16px; background: #fff; box-shadow: 0 1px 3px rgb(15 42 58 / 0.12); }
      .kicker { margin: 0 0 6px; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #12924a; }
      h1 { margin: 0 0 6px; font-size: 24px; line-height: 1.2; }
      .meta { margin: 0 0 14px; font-size: 13px; color: #5b7482; }
      p { margin: 0 0 12px; }
      footer { margin-top: 16px; padding-top: 12px; border-top: 1px solid #e3ece8; font-size: 13px; color: #5b7482; }
    </style>
  </head>
  <body>
    <article>
      <p class="kicker">History</p>
      <h1>Footprints on the Moon</h1>
      <p class="meta">November 16, 2026 · 4 min read</p>
      <p>On July 20, 1969, two people stepped onto another world while roughly 600 million watched from home.</p>
      <p>Between 1969 and 1972 twelve astronauts walked on the Moon. The next crew is expected by 2028.</p>
      <footer>© 2026 The Daily Orbit · Updated 2026-11-16</footer>
    </article>
  </body>
</html>`;

(async () => {
  const server = http
    .createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(DEMO_PAGE);
    })
    .listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));

  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    viewport: { width: 540, height: 480 },
    deviceScaleFactor: 2,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });

  const page = context.pages()[0];
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const article = page.locator('article');
  await page.getByText('12026-11-16').waitFor();
  await article.screenshot({ path: path.join(docsDir, 'after.png') });

  const popupUrl = `chrome-extension://${unpackedExtensionId(extensionPath)}/popup.html`;
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 272, height: 96 });
  await popup.goto(popupUrl);
  const tabId = await popup.evaluate(async () => (await chrome.tabs.query({ index: 0 }))[0].id);
  await popup.goto(`${popupUrl}?tabId=${tabId}`);
  await popup.getByText('dates updated on this page').waitFor();
  await popup.waitForTimeout(500); // let the switch animation settle
  await popup.screenshot({ path: path.join(docsDir, 'popup.png') });

  await popup.locator('#toggle').click();
  await page.getByText('Updated 2026-11-16').waitFor();
  await article.screenshot({ path: path.join(docsDir, 'before.png') });

  await context.close();
  server.close();
  console.log('Wrote docs/before.png, docs/after.png, docs/popup.png');
})();
