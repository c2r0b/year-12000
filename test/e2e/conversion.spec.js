const { test, expect } = require('./fixtures');

test.describe('static pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/basic.html');
  });

  test('converts dates in visible text', async ({ page }) => {
    await expect(page.locator('#title')).toHaveText('World Cup 12026');
    await expect(page.locator('#iso')).toHaveText('12026-11-16');
    await expect(page.locator('#long')).toHaveText('Published on November 16, 12026 by someone.');
    await expect(page.locator('#range')).toHaveText('The war years (11939–11945) were hard.');
    await expect(page.locator('#footer')).toHaveText('© 12026 Example');
  });

  test('converts a year that sits alone in its own element', async ({ page }) => {
    await expect(page.locator('#split-year')).toHaveText('12026');
  });

  test('trusts a bare number inside a <time> element', async ({ page }) => {
    await expect(page.locator('#time')).toHaveText('11500');
    await expect(page.locator('#time')).toHaveAttribute('datetime', '1500-01-01');
  });

  test('leaves quantities and prices alone', async ({ page }) => {
    await expect(page.locator('#footer')).toHaveText('© 12026 Example');
    await expect(page.locator('#quantity')).toHaveText('About 2000 people paid $1999 for 1500 units.');
  });

  test('leaves code blocks alone', async ({ page }) => {
    await expect(page.locator('#footer')).toHaveText('© 12026 Example');
    await expect(page.locator('#code')).toHaveText('const year = 2026; // 2026-11-16');
    await expect(page.locator('#pre')).toHaveText('2026-11-16');
  });

  test('changes link text and tooltip but not the address', async ({ page }) => {
    const link = page.locator('#link');
    await expect(link).toHaveText('Archive for 12025');
    await expect(link).toHaveAttribute('title', 'Archive 12026');
    await expect(link).toHaveAttribute('href', '/archive/2026/index.html');
  });
});

test('recognises month names in the language of the page', async ({ page }) => {
  await page.goto('/italian.html');
  await expect(page.locator('#date')).toHaveText('Pubblicato il 16 novembre 12026.');
});

test('converts dates inside iframes', async ({ page }) => {
  await page.goto('/frames.html');
  await expect(page.locator('#outer')).toHaveText('Outside, in 12026.');
  await expect(page.frameLocator('#frame').locator('#inner')).toHaveText(
    'Inside: 12027-01-02 and 3 March 12028.',
  );
});

test.describe('dynamic pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dynamic.html');
    await expect(page.locator('#live')).toHaveText('Started in 12026');
  });

  test('converts elements added later', async ({ page }) => {
    await page.evaluate(() => {
      const paragraph = document.createElement('p');
      paragraph.id = 'added';
      paragraph.textContent = 'Released 2027-01-02';
      document.getElementById('root').append(paragraph);
    });
    await expect(page.locator('#added')).toHaveText('Released 12027-01-02');
  });

  test('converts nested content added in one go', async ({ page }) => {
    await page.evaluate(() => {
      document
        .getElementById('root')
        .insertAdjacentHTML('beforeend', '<ul id="list"><li>in 2030</li><li><b>May 2031</b></li></ul>');
    });
    await expect(page.locator('#list li')).toHaveText(['in 12030', 'May 12031']);
  });

  test('converts text that the page rewrites in place', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('live').firstChild.nodeValue = 'Updated in 2030';
    });
    await expect(page.locator('#live')).toHaveText('Updated in 12030');

    await page.evaluate(() => {
      document.getElementById('live').textContent = 'Replaced on 2031-05-06';
    });
    await expect(page.locator('#live')).toHaveText('Replaced on 12031-05-06');
  });

  test('never converts the same text twice', async ({ page }) => {
    await page.evaluate(() => {
      const live = document.getElementById('live');
      for (let i = 0; i < 5; i++) live.parentNode.append(live); // move it around
    });
    await page.waitForTimeout(500);
    await expect(page.locator('#live')).toHaveText('Started in 12026');
  });

  test('stops tracking text once it no longer holds a date', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('live').firstChild.nodeValue = 'No date any more';
    });
    await page.waitForTimeout(300);
    await expect(page.locator('#live')).toHaveText('No date any more');
  });
});
