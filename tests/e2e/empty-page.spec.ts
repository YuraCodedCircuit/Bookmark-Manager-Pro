import { expect, test } from '@playwright/test';

test('displays the first-run bookmark manager layout', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('button', { name: 'Open folder tree' }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Bookmarks' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Welcome to Bookmark Manager Pro' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get started' })).toBeVisible();
  await expect(page.getByRole('link')).toHaveCount(0);
});
