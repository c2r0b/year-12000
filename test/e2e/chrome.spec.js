// The parts of a page that live outside its body text: tab title and tooltips.
const { test, expect } = require('./fixtures');

test.describe('tab title and tooltips', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chrome.html');
    await expect(page.locator('#done')).toHaveText('© 12026');
  });

  test('converts the tab title', async ({ page }) => {
    await expect(page).toHaveTitle('World Cup 12026 – Example');
  });

  test('converts a title set later by the page', async ({ page }) => {
    await page.evaluate(() => {
      document.title = 'Results for 2027-01-02';
    });
    await expect(page).toHaveTitle('Results for 12027-01-02');

    await page.evaluate(() => {
      document.title = '(3) Inbox';
    });
    await page.waitForTimeout(300);
    await expect(page).toHaveTitle('(3) Inbox');
  });

  test('converts tooltips', async ({ page }) => {
    await expect(page.locator('#tip')).toHaveAttribute('title', 'Founded in 11998');
    await expect(page.locator('#tip')).toHaveText('Example Co.');
    await expect(page.locator('#quantity-tip')).toHaveAttribute('title', 'About 2000 people');
  });

  test('converts tooltips set or changed later', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('tip').setAttribute('title', 'Closed in 2031');
      document.getElementById('done').title = 'Updated 2026-11-16';
    });
    await expect(page.locator('#tip')).toHaveAttribute('title', 'Closed in 12031');
    await expect(page.locator('#done')).toHaveAttribute('title', 'Updated 12026-11-16');
  });

  test('converts the tooltip of a field but never its value', async ({ page }) => {
    await expect(page.locator('#input')).toHaveAttribute('title', 'Since 12026');
    await expect(page.locator('#input')).toHaveValue('2026');
    await expect(page.locator('#textarea')).toHaveAttribute('title', 'Since 2026');
    await expect(page.locator('#textarea')).toHaveValue('2026');
  });

  test('counts and restores the title and the tooltips', async ({ page, openPopup }) => {
    const popup = await openPopup(page);
    // tab title, two tooltips, footer
    await expect(popup.status).toHaveText('4 dates updated on this page');

    await popup.toggle.click();
    await expect(page).toHaveTitle('World Cup 2026 – Example');
    await expect(page.locator('#tip')).toHaveAttribute('title', 'Founded in 1998');
    await expect(page.locator('#input')).toHaveAttribute('title', 'Since 2026');

    await popup.toggle.click();
    await expect(page).toHaveTitle('World Cup 12026 – Example');
    await expect(page.locator('#tip')).toHaveAttribute('title', 'Founded in 11998');
  });
});
