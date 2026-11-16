const { test, expect } = require('./fixtures');

test.describe('forms keep working', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/form.html');
    // Proof that the extension has already processed this page.
    await expect(page.locator('#plain')).toHaveText('Edited in 12026');
  });

  test('converts the label but not the control values', async ({ page }) => {
    await expect(page.locator('#label')).toHaveText('Departure on 12026-11-16');
    await expect(page.locator('#date')).toHaveValue('2026-11-16');
    await expect(page.locator('#text')).toHaveValue('in 2026');
    await expect(page.locator('#text')).toHaveAttribute('placeholder', 'e.g. 2026-11-16');
    await expect(page.locator('#textarea')).toHaveValue('November 16, 2026');
    await expect(page.locator('#list')).toHaveValue('2026');
  });

  test('leaves drop-down options alone', async ({ page }) => {
    await expect(page.locator('#select')).toHaveValue('2026');
    await expect(page.locator('#select option')).toHaveText(['2025', '2026', '2027']);
    await expect(page.locator('#years option')).toHaveText(['2026']);
  });

  test('leaves editable regions alone, also while typing', async ({ page }) => {
    const editable = page.locator('#editable');
    await expect(editable).toHaveText('Edited in 2026');
    await editable.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' and in 2027');
    await page.waitForTimeout(300);
    await expect(editable).toHaveText('Edited in 2026 and in 2027');
  });

  test('leaves typed values alone', async ({ page }) => {
    await page.locator('#text').fill('see you on 2027-01-02');
    await page.locator('#textarea').fill('December 25, 2026');
    await page.waitForTimeout(300);
    await expect(page.locator('#text')).toHaveValue('see you on 2027-01-02');
    await expect(page.locator('#textarea')).toHaveValue('December 25, 2026');
  });

  test('submits the original values', async ({ page }) => {
    await page.locator('#select').selectOption({ label: '2027' });
    await page.locator('#submit').click();
    await expect(page.locator('#done')).toBeVisible();

    const submitted = Object.fromEntries(new URL(page.url()).searchParams);
    expect(submitted).toEqual({
      date: '2026-11-16',
      text: 'in 2026',
      hidden: '2026-11-16',
      textarea: 'November 16, 2026',
      select: '2027',
      list: '2026',
      button: '2026',
    });
  });

  test('date inputs still accept and report real dates', async ({ page }) => {
    await page.locator('#date').fill('2027-03-04');
    const value = await page.locator('#date').evaluate((input) => ({
      value: input.value,
      year: input.valueAsDate.getUTCFullYear(),
    }));
    expect(value).toEqual({ value: '2027-03-04', year: 2027 });
  });
});
