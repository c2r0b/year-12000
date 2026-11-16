const { test, expect } = require('./fixtures');

test.describe('context from the surrounding page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/context.html');
    await expect(page.locator('#done')).toHaveText('© 12026');
  });

  test('reads evidence in neighbouring inline elements', async ({ page }) => {
    await expect(page.locator('#after-word')).toHaveText('11500');
    await expect(page.locator('#after-month')).toHaveText('11500');
    await expect(page.locator('#range-start')).toHaveText('11500');
    await expect(page.locator('#range-end')).toHaveText('11600');
    await expect(page.locator('#nested')).toHaveText('11850');
  });

  test('sees quantities and labels split across elements', async ({ page }) => {
    await expect(page.locator('#before-unit')).toHaveText('2026');
    await expect(page.locator('#after-currency')).toHaveText('2026');
    await expect(page.locator('#after-about')).toHaveText('2026');
    await expect(page.locator('#after-label')).toHaveText('2026');
  });

  test('does not read across blocks or line breaks', async ({ page }) => {
    await expect(page.locator('#other-block')).toHaveText('1500');
    await expect(page.locator('#other-line')).toHaveText('1500');
  });

  test('uses table column headers', async ({ page }) => {
    await expect(page.locator('#column-year')).toHaveText('11500');
    await expect(page.locator('#column-year-2')).toHaveText('11066');
    await expect(page.locator('#column-price')).toHaveText('2026');
    await expect(page.locator('#column-price-2')).toHaveText('in 1999');
  });

  test('uses table row headers', async ({ page }) => {
    await expect(page.locator('#row-year')).toHaveText('11088');
    await expect(page.locator('#row-quantity')).toHaveText('2019');
    await expect(page.locator('#row-neutral')).toHaveText('1500');
  });

  test('falls back to the number itself in tables without headers', async ({ page }) => {
    await expect(page.locator('#plain-old')).toHaveText('1500');
    await expect(page.locator('#plain-recent')).toHaveText('12026');
  });

  test('converts decades and hyphenated prefixes', async ({ page }) => {
    await expect(page.locator('#decades')).toHaveText(
      'Music of the 11990s, mid-12020 trends and pre-11900 houses.',
    );
  });

  test('restores everything when switched off', async ({ page, openPopup }) => {
    const popup = await openPopup(page);
    await popup.toggle.click();
    await expect(page.locator('#done')).toHaveText('© 2026');
    await expect(page.locator('#after-word')).toHaveText('1500');
    await expect(page.locator('#range-end')).toHaveText('1600');
    await expect(page.locator('#column-year')).toHaveText('1500');
    await expect(page.locator('#decades')).toHaveText(
      'Music of the 1990s, mid-2020 trends and pre-1900 houses.',
    );
  });

  test('judges text added later with the context it lands in', async ({ page }) => {
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<p><i>until</i> <span id="late-year">1500</span></p><p><span id="late-quantity">2026</span> <i>users</i></p>',
      );
    });
    await expect(page.locator('#late-year')).toHaveText('11500');
    await page.waitForTimeout(300);
    await expect(page.locator('#late-quantity')).toHaveText('2026');
  });
});
