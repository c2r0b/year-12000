const { test, expect } = require('./fixtures');

test.describe('counter', () => {
  test('shows how many dates were updated', async ({ page, openPopup }) => {
    await page.goto('/basic.html');
    await expect(page.locator('#footer')).toHaveText('© 12026 Example');
    const popup = await openPopup(page);
    // tab title, heading, iso, long, range (2), split year, time, link text, link tooltip, footer
    await expect(popup.status).toHaveText('11 dates updated on this page');
    await expect(popup.toggle).toBeChecked();
  });

  test('uses the singular for one date', async ({ page, openPopup }) => {
    await page.goto('/one.html');
    const popup = await openPopup(page);
    await expect(popup.status).toHaveText('1 date updated on this page');
  });

  test('shows zero when nothing looks like a date', async ({ page, openPopup }) => {
    await page.goto('/none.html');
    const popup = await openPopup(page);
    await expect(popup.status).toHaveText('0 dates updated on this page');
    await expect(page.locator('#text')).toHaveText('2000 people, $1999, room 2026.');
  });

  test('adds up the dates of every frame', async ({ page, openPopup }) => {
    await page.goto('/frames.html');
    const popup = await openPopup(page);
    await expect(popup.status).toHaveText('3 dates updated on this page');
  });

  test('follows the page while it changes', async ({ page, openPopup }) => {
    await page.goto('/dynamic.html');
    const popup = await openPopup(page);
    await expect(popup.status).toHaveText('1 date updated on this page');

    await page.evaluate(() => {
      document.getElementById('root').insertAdjacentHTML('beforeend', '<p id="more">2027-01-02 and 2028-03-04</p>');
    });
    await expect(popup.status).toHaveText('3 dates updated on this page');

    await page.evaluate(() => document.getElementById('more').remove());
    await expect(popup.status).toHaveText('1 date updated on this page');
  });

  test('says so when the page cannot be changed', async ({ openPopup }) => {
    // Without a target the popup looks at itself: an extension page, where
    // content scripts never run.
    const popup = await openPopup();
    await expect(popup.status).toHaveText('Not available on this page');
  });
});

test.describe('on/off switch', () => {
  test('restores the original text when switched off', async ({ page, openPopup }) => {
    await page.goto('/basic.html');
    await expect(page.locator('#iso')).toHaveText('12026-11-16');
    const popup = await openPopup(page);

    await popup.toggle.click();
    await expect(popup.toggle).not.toBeChecked();
    await expect(popup.status).toHaveText('Off');
    await expect(page.locator('#iso')).toHaveText('2026-11-16');
    await expect(page.locator('#title')).toHaveText('World Cup 2026');
    await expect(page.locator('#range')).toHaveText('The war years (1939–1945) were hard.');
    await expect(page.locator('#time')).toHaveText('1500');
    await expect(page.locator('#footer')).toHaveText('© 2026 Example');
  });

  test('converts again when switched back on', async ({ page, openPopup }) => {
    await page.goto('/basic.html');
    const popup = await openPopup(page);
    await popup.toggle.click();
    await expect(page.locator('#iso')).toHaveText('2026-11-16');

    await popup.toggle.click();
    await expect(popup.toggle).toBeChecked();
    await expect(page.locator('#iso')).toHaveText('12026-11-16');
    await expect(popup.status).toHaveText('11 dates updated on this page');
  });

  test('ignores page changes while off', async ({ page, openPopup }) => {
    await page.goto('/dynamic.html');
    const popup = await openPopup(page);
    await popup.toggle.click();
    await expect(page.locator('#live')).toHaveText('Started in 2026');

    await page.evaluate(() => {
      document.getElementById('root').insertAdjacentHTML('beforeend', '<p id="more">2027-01-02</p>');
    });
    await page.waitForTimeout(300);
    await expect(page.locator('#more')).toHaveText('2027-01-02');

    await popup.toggle.click();
    await expect(page.locator('#more')).toHaveText('12027-01-02');
    await expect(page.locator('#live')).toHaveText('Started in 12026');
  });

  test('restores text that the page changed after conversion', async ({ page, openPopup }) => {
    await page.goto('/dynamic.html');
    await expect(page.locator('#live')).toHaveText('Started in 12026');
    await page.evaluate(() => {
      document.getElementById('live').firstChild.nodeValue = 'Updated in 2030';
    });
    await expect(page.locator('#live')).toHaveText('Updated in 12030');

    const popup = await openPopup(page);
    await popup.toggle.click();
    await expect(page.locator('#live')).toHaveText('Updated in 2030');
  });

  test('applies to every open tab and frame at once', async ({ context, page, openPopup }) => {
    await page.goto('/frames.html');
    const other = await context.newPage();
    await other.goto('/one.html');
    await expect(other.locator('#only')).toHaveText('Just once, in 12026.');

    const popup = await openPopup(page);
    await popup.toggle.click();
    await expect(page.locator('#outer')).toHaveText('Outside, in 2026.');
    await expect(page.frameLocator('#frame').locator('#inner')).toHaveText(
      'Inside: 2027-01-02 and 3 March 2028.',
    );
    await expect(other.locator('#only')).toHaveText('Just once, in 2026.');
  });

  test('is remembered across reloads and new pages', async ({ page, openPopup }) => {
    await page.goto('/basic.html');
    const popup = await openPopup(page);
    await popup.toggle.click();
    await expect(page.locator('#iso')).toHaveText('2026-11-16');

    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.locator('#iso')).toHaveText('2026-11-16');

    await page.goto('/one.html');
    await page.waitForTimeout(500);
    await expect(page.locator('#only')).toHaveText('Just once, in 2026.');

    const reopened = await openPopup(page);
    await expect(reopened.toggle).not.toBeChecked();
    await expect(reopened.status).toHaveText('Off');
  });

  test('never touches form values, on or off', async ({ page, openPopup }) => {
    await page.goto('/form.html');
    await expect(page.locator('#plain')).toHaveText('Edited in 12026');
    const popup = await openPopup(page);

    for (const state of ['off', 'on']) {
      await popup.toggle.click();
      await expect(page.locator('#plain')).toHaveText(state === 'off' ? 'Edited in 2026' : 'Edited in 12026');
      await expect(page.locator('#date')).toHaveValue('2026-11-16');
      await expect(page.locator('#textarea')).toHaveValue('November 16, 2026');
      await expect(page.locator('#select option')).toHaveText(['2025', '2026', '2027']);
      await expect(page.locator('#editable')).toHaveText('Edited in 2026');
    }
  });
});
