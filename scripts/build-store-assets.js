// Builds the images for the Chrome Web Store listing, in store/.
// Run with: npm run store-assets
//
//   screenshot-1…5.png   1280x800 screenshots
//   promo-small.png      440x280 small promo tile
//   promo-marquee.png    1400x560 marquee promo tile
//
// Every "after" text in the screenshots is produced by the real extension,
// loaded in Chromium. Text inside <samp> is left alone by the extension, which
// is how the "before" side stays unconverted.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const { extensionPath, unpackedExtensionId } = require('../test/e2e/fixtures');

const outDir = path.join(__dirname, '..', 'store');
const logo = fs.readFileSync(path.join(__dirname, '..', 'icons', 'icon.svg'), 'utf8');

const BASE_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body {
    font: 18px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #0f2a3a;
    background: linear-gradient(160deg, #dff3fd 0%, #eef9f1 60%, #d9f2e1 100%);
    padding: 56px 64px; display: flex; flex-direction: column; overflow: hidden;
  }
  samp { font: inherit; }
  h1 { margin: 0; font-size: 46px; line-height: 1.1; letter-spacing: -0.02em; }
  .lead { margin: 12px 0 0; font-size: 22px; color: #3d5a6b; }
  .brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 20px; margin-bottom: 22px; }
  .brand svg { width: 40px; height: 40px; }
  .stage { flex: 1; display: flex; gap: 28px; align-items: flex-start; margin-top: 36px; min-height: 0; }
  .card { flex: 1; background: #fff; border-radius: 18px; box-shadow: 0 10px 30px rgb(15 42 58 / 0.12); padding: 28px 30px; position: relative; }
  .tag { display: inline-block; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; margin-bottom: 14px; }
  .tag.before { background: #e8eef1; color: #5b7482; }
  .tag.after { background: #d5f3df; color: #12924a; }
  .kicker { margin: 0 0 4px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #12924a; }
  h2 { margin: 0 0 6px; font-size: 32px; line-height: 1.2; }
  .meta { margin: 0 0 16px; font-size: 17px; color: #5b7482; }
  .card p, .content p { margin: 0 0 14px; font-size: 21px; }
  .card .kicker, .content .kicker { margin: 0 0 4px; font-size: 13px; }
  .card .meta, .content .meta { margin: 0 0 16px; font-size: 17px; }
  .card .foot, .content .foot { margin: 20px 0 0; padding-top: 14px; border-top: 1px solid #e3ece8; font-size: 16px; color: #5b7482; }
  .window { flex: 1; align-self: stretch; background: #fff; border-radius: 14px; box-shadow: 0 10px 30px rgb(15 42 58 / 0.14); overflow: hidden; position: relative; }
  .bar { height: 44px; background: #eef2f4; display: flex; align-items: center; gap: 8px; padding: 0 16px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; background: #cfd8dd; }
  .address { flex: 1; margin-left: 12px; height: 26px; border-radius: 13px; background: #fff; font-size: 13px; color: #5b7482; padding: 3px 14px; }
  .window .content { padding: 28px 36px; max-width: 760px; }
  .popup { position: absolute; top: 52px; right: 24px; width: 300px; border-radius: 12px; box-shadow: 0 12px 36px rgb(15 42 58 / 0.28); border: 1px solid #dfe7ea; }
  table { width: 100%; border-collapse: collapse; font-size: 23px; }
  th { text-align: left; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #5b7482; padding: 0 0 10px; }
  td { padding: 14px 0; border-top: 1px solid #e3ece8; }
  td.arrow { color: #9fb3bd; width: 60px; }
  td.note { text-align: right; }
  .chip { font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
  .chip.yes { background: #d5f3df; color: #12924a; }
  .chip.no { background: #e8eef1; color: #5b7482; }
  .lang { display: inline-block; width: 44px; font-size: 13px; font-weight: 700; color: #0b8fd6; }
  form label { display: block; font-size: 17px; font-weight: 600; margin: 0 0 6px; }
  form input, form textarea, form select { display: block; width: 100%; font: inherit; font-size: 19px; padding: 11px 13px; border: 1.5px solid #c9d6dc; border-radius: 10px; margin-bottom: 16px; color: inherit; background: #fff; }
  form textarea { height: 76px; resize: none; }
  ul.points { margin: 0; padding: 0; list-style: none; font-size: 22px; }
  ul.points li { padding: 12px 0 12px 34px; position: relative; }
  ul.points li::before { content: ''; position: absolute; left: 0; top: 19px; width: 16px; height: 16px; border-radius: 50%; background: #2fc56a; }
`;

const brand = `<div class="brand">${logo}<span>Year 12,000</span></div>`;

const article = `
  <p class="kicker">History</p>
  <h2>Footprints on the Moon</h2>
  <p class="meta">November 16, 2026 · 4 min read</p>
  <p>On July 20, 1969, two people stepped onto another world while roughly 600 million watched from home.</p>
  <p>Between 1969 and 1972 twelve astronauts walked on the Moon. The next crew is expected by 2028.</p>
  <p class="foot">© 2026 The Daily Orbit · Updated 2026-11-16</p>`;

const row = (text, converted) => `
  <tr>
    <td><samp>${text}</samp></td><td class="arrow">→</td><td>${text}</td>
    <td class="note"><span class="chip ${converted ? 'yes' : 'no'}">${converted ? 'converted' : 'left alone'}</span></td>
  </tr>`;

const languageRow = (code, text) => `
  <tr><td><span class="lang">${code}</span><samp>${text}</samp></td><td class="arrow">→</td><td>${text}</td></tr>`;

const SCENES = {
  'screenshot-1': `
    ${brand}
    <h1>Every date on the web, in the Human Era</h1>
    <p class="lead">Add 10,000 years to the calendar and see how long the human story really is.</p>
    <div class="stage">
      <div class="card"><span class="tag before">Before</span><samp>${article}</samp></div>
      <div class="card"><span class="tag after">After</span>${article}</div>
    </div>`,

  'screenshot-2': `
    ${brand}
    <h1>One switch, and a counter for every page</h1>
    <p class="lead">Turn it off and the page is back to normal straight away.</p>
    <div class="stage">
      <div class="window">
        <div class="bar"><i class="dot"></i><i class="dot"></i><i class="dot"></i><div class="address">dailyorbit.example</div></div>
        <div class="content">${article}</div>
        <img class="popup" id="popup" alt="" />
      </div>
    </div>`,

  'screenshot-3': `
    ${brand}
    <h1>Years change. Quantities do not.</h1>
    <p class="lead">A number is converted only when the text around it says it is a year.</p>
    <div class="stage">
      <div class="card">
        <table>
          <tr><th>On the page</th><th></th><th>What you see</th><th></th></tr>
          ${row('Published on November 16, 2026', true)}
          ${row('A family business since 1998', true)}
          ${row('The music of the 1990s', true)}
          ${row('The war years, 1939–1945', true)}
          ${row('About 2000 people came', false)}
          ${row('Tickets from $1999', false)}
          ${row('Meet us in Room 2026', false)}
        </table>
      </div>
    </div>`,

  'screenshot-4': `
    ${brand}
    <h1>Forms keep working</h1>
    <p class="lead">The change is visual only. What you type and what you submit stay exactly the same.</p>
    <div class="stage">
      <div class="card">
        <span class="tag after">On the page</span>
        <form>
          <label for="date">Departure on 2026-11-16</label>
          <input id="date" value="2026-11-16" />
          <label for="year">Travelling in 2026 or 2027?</label>
          <select id="year"><option>2026</option></select>
          <label for="notes">Notes for the December 2026 trip</label>
          <textarea id="notes">Back on January 4, 2027.</textarea>
        </form>
      </div>
      <div class="card">
        <ul class="points">
          <li>Labels and page text show the Human Era year</li>
          <li>Text fields, date pickers and drop-downs are never touched</li>
          <li>Editable text and code blocks stay as written</li>
          <li>No network requests, no tracking, one permission</li>
        </ul>
      </div>
    </div>`,

  'screenshot-5': `
    ${brand}
    <h1>Understands six languages</h1>
    <p class="lead">English, Italian, Spanish, French, German and Portuguese.</p>
    <div class="stage">
      <div class="card">
        <table>
          <tr><th>On the page</th><th></th><th>What you see</th></tr>
          ${languageRow('EN', 'Founded in 1998 by two friends')}
          ${languageRow('IT', 'Fondata nel 1088 a Bologna')}
          ${languageRow('ES', 'Desde 1998 hasta 2004')}
          ${languageRow('FR', 'Depuis 2015, le 14 juillet 2026')}
          ${languageRow('DE', 'Im Jahr 1648 in Münster')}
          ${languageRow('PT', 'Em meados de 1999, em Lisboa')}
        </table>
      </div>
    </div>`,

  'promo-small': `
    <style>
      body { padding: 0; align-items: center; justify-content: center; gap: 14px; text-align: center; }
      svg { width: 96px; height: 96px; }
      .name { font-size: 40px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
      .line { font-size: 19px; color: #3d5a6b; }
    </style>
    ${logo}
    <div class="name">Year 12,000</div>
    <div class="line"><samp>2026 becomes 12026</samp></div>`,

  'promo-marquee': `
    <style>
      body { padding: 0 110px; flex-direction: row; align-items: center; gap: 56px; }
      svg { width: 220px; height: 220px; flex: none; }
      .name { font-size: 92px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
      .line { font-size: 34px; color: #3d5a6b; margin-top: 18px; }
    </style>
    ${logo}
    <div>
      <div class="name">Year 12,000</div>
      <div class="line"><samp>Every date on the web, in the Human Era.<br />2026 becomes 12026.</samp></div>
    </div>`,
};

const SIZES = {
  'promo-small': { width: 440, height: 280 },
  'promo-marquee': { width: 1400, height: 560 },
};
const SCREENSHOT = { width: 1280, height: 800 };

const pageFor = (name) => `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>${name}</title><style>${BASE_CSS}</style></head>
  <body>${SCENES[name]}</body>
</html>`;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });

  const server = http
    .createServer((request, response) => {
      const name = request.url.slice(1);
      if (!SCENES[name]) return response.writeHead(404).end();
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(pageFor(name));
    })
    .listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    viewport: SCREENSHOT,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  const page = context.pages()[0];
  const popupUrl = `chrome-extension://${unpackedExtensionId(extensionPath)}/popup.html`;

  for (const name of Object.keys(SCENES)) {
    await page.setViewportSize(SIZES[name] ?? SCREENSHOT);
    await page.goto(`${origin}/${name}`);

    if (name.startsWith('screenshot')) {
      // Wait for the extension: a five-digit year must have appeared.
      await page.waitForFunction(() => /\b1[12]\d{3}\b/.test(document.body.innerText));
    }

    if (name === 'screenshot-2') {
      // The real popup, attached to this very page, captured at double size.
      const popup = await context.newPage();
      await popup.setViewportSize({ width: 544, height: 192 });
      await popup.goto(popupUrl);
      const tabId = await popup.evaluate(async () => (await chrome.tabs.query({ index: 0 }))[0].id);
      await popup.goto(`${popupUrl}?tabId=${tabId}`);
      await popup.getByText('dates updated on this page').waitFor();
      await popup.evaluate(() => {
        document.body.style.zoom = '2';
      });
      await popup.waitForTimeout(500);
      const image = await popup.screenshot();
      await popup.close();
      await page.evaluate((data) => {
        document.getElementById('popup').src = `data:image/png;base64,${data}`;
      }, image.toString('base64'));
      await page.locator('#popup').evaluate((img) => img.decode());
    }

    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log(`store/${name}.png`);
  }

  await context.close();
  server.close();
})();
