// Renders icons/icon.svg to the PNG sizes the manifest needs.
// Run with: npm run icons
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const SIZES = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, '..', 'icons');

(async () => {
  const svg = fs.readFileSync(path.join(iconsDir, 'icon.svg'), 'utf8');
  const browser = await chromium.launch();
  for (const size of SIZES) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>html, body { margin: 0; background: transparent; } svg { display: block; width: ${size}px; height: ${size}px; }</style>${svg}`,
    );
    await page.screenshot({ path: path.join(iconsDir, `icon-${size}.png`), omitBackground: true });
    await page.close();
  }
  await browser.close();
  console.log(`Wrote ${SIZES.map((size) => `icon-${size}.png`).join(', ')}`);
})();
