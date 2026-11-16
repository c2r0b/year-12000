const { test, expect } = require('./fixtures');

const closedText = (page) => page.evaluate(() => window.closedRoot.querySelector('#closed').textContent);

test.describe('shadow DOM', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shadow.html');
    await expect(page.locator('#light')).toHaveText('Light DOM, 12026-11-16.');
  });

  test('converts open shadow roots', async ({ page }) => {
    await expect(page.locator('#open')).toHaveText('Open since 12026-11-16');
  });

  test('converts closed shadow roots', async ({ page }) => {
    await expect.poll(() => closedText(page)).toBe('Closed since 12027-01-02');
  });

  test('converts shadow roots nested in shadow roots', async ({ page }) => {
    await expect(page.locator('#nested')).toHaveText('Nested in 12028');
  });

  test('converts components that are defined after the page has loaded', async ({ page }) => {
    await expect(page.locator('#late')).toHaveText('Late in 12029');
  });

  test('leaves form values inside shadow roots alone', async ({ page }) => {
    await expect(page.locator('#open')).toHaveText('Open since 12026-11-16');
    await expect(page.locator('#field')).toHaveValue('2026-11-16');
  });

  test('converts content added to a shadow root later', async ({ page }) => {
    await page.evaluate(() => {
      document
        .getElementById('open-host')
        .shadowRoot.querySelector('#open')
        .insertAdjacentHTML('afterend', '<p id="added">Added in 2030</p>');
    });
    await expect(page.locator('#added')).toHaveText('Added in 12030');
  });

  test('converts a shadow host added later', async ({ page }) => {
    await page.evaluate(() => {
      const host = document.createElement('div');
      host.attachShadow({ mode: 'open' }).innerHTML = '<p id="new-host">New in 2031</p>';
      document.body.append(host);
    });
    await expect(page.locator('#new-host')).toHaveText('New in 12031');
  });

  test('counts and restores shadow content', async ({ page, openPopup }) => {
    await expect(page.locator('#late')).toHaveText('Late in 12029');
    const popup = await openPopup(page);
    await expect(popup.status).toHaveText('5 dates updated on this page');

    await popup.toggle.click();
    await expect(page.locator('#open')).toHaveText('Open since 2026-11-16');
    await expect(page.locator('#nested')).toHaveText('Nested in 2028');
    await expect(page.locator('#late')).toHaveText('Late in 2029');
    await expect.poll(() => closedText(page)).toBe('Closed since 2027-01-02');

    await popup.toggle.click();
    await expect(page.locator('#open')).toHaveText('Open since 12026-11-16');
    await expect.poll(() => closedText(page)).toBe('Closed since 12027-01-02');
    await expect(popup.status).toHaveText('5 dates updated on this page');
  });
});
