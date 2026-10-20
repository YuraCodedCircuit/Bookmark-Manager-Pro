import { expect, test } from '@playwright/test';

test('CSV settings persist, cancel safely, and control exported headers', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Get started', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Username', exact: true })
    .fill('Synthetic CSV profile');
  await page
    .getByRole('button', { name: 'Create profile', exact: true })
    .click();
  const openSettings = async () => {
    await page.getByRole('button', { name: 'Open profile menu' }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const settings = page.getByRole('dialog', {
      name: 'Settings',
      exact: true,
    });
    await settings.getByRole('button', { name: 'Export', exact: true }).click();
    return settings;
  };
  let settings = await openSettings();
  await expect(
    settings.getByRole('checkbox', { name: 'URL', exact: true }),
  ).toBeDisabled();
  for (const column of ['Profile ID', 'Profile', 'Folder path', 'Tags', 'Note'])
    await settings
      .getByRole('checkbox', { name: column, exact: true })
      .uncheck();
  await settings
    .getByRole('button', { name: 'Move URL up', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  for (let count = 0; count < 3; count++)
    await settings
      .getByRole('button', { name: 'Move URL up', exact: true })
      .click();
  await expect(
    settings.getByRole('textbox', { name: 'Header preview' }),
  ).toHaveValue('URL,Title');
  for (const width of [1100, 360]) {
    await page.setViewportSize({ width, height: 720 });
    expect(
      await settings.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    await expect(
      settings.getByRole('button', { name: 'Save', exact: true }),
    ).toBeInViewport();
  }
  await page.setViewportSize({ width: 1100, height: 720 });
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      colorScheme,
    );
    await expect(
      settings.getByRole('checkbox', { name: 'URL', exact: true }),
    ).toBeChecked();
  }
  await page.emulateMedia({ forcedColors: 'active' });
  const titleColumn = settings.getByRole('checkbox', {
    name: 'Title',
    exact: true,
  });
  await titleColumn.focus();
  await page.keyboard.press('Space');
  await expect(titleColumn).not.toBeChecked();
  await page.keyboard.press('Space');
  await expect(titleColumn).toBeChecked();
  await page.emulateMedia({ forcedColors: 'none' });
  await page.screenshot({
    path: 'design/csv-export-settings.png',
    animations: 'disabled',
  });
  await settings.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(settings).not.toBeVisible();
  settings = await openSettings();
  await expect(
    settings.getByRole('textbox', { name: 'Header preview' }),
  ).toHaveValue('URL,Title');
  await settings.getByRole('button', { name: 'Restore defaults' }).click();
  await settings.getByRole('button', { name: 'Cancel', exact: true }).click();
  settings = await openSettings();
  await expect(
    settings.getByRole('textbox', { name: 'Header preview' }),
  ).toHaveValue('URL,Title');
  await settings.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export', exact: true });
  await dialog
    .getByRole('combobox', { name: 'Choose format' })
    .selectOption('csv');
  const downloaded = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export', exact: true }).click();
  const stream = await (await downloaded).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString('utf8')).toBe('\uFEFF"URL","Title"');
  const notices = page.getByRole('button', { name: 'Dismiss notification' });
  while (await notices.count()) await notices.first().click();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const importer = page.getByRole('dialog', { name: 'Import', exact: true });
  await importer.getByLabel('Choose file', { exact: true }).setInputFiles({
    name: 'custom.csv',
    mimeType: 'text/csv',
    buffer: Buffer.concat(chunks),
  });
  await importer
    .getByRole('button', { name: 'Review items', exact: true })
    .click();
  const review = page.getByRole('dialog', {
    name: 'Review imported items',
    exact: true,
  });
  await expect(review.getByRole('columnheader')).toHaveText([
    'Include',
    'URL',
    'Title',
  ]);
  await expect(
    review.getByText('No matching items', { exact: true }),
  ).toBeVisible();
});
