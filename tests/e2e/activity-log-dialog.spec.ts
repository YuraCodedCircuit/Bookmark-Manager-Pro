import { expect, test } from '@playwright/test';

// Exercise classic scrollbar geometry instead of headless Chromium's hidden tracks.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

test('shared activity sessions, nested calendar, keyboard focus, and scoped clearing', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Get started', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Username', exact: true })
    .fill('Synthetic log profile');
  await page
    .getByRole('button', { name: 'Create profile', exact: true })
    .click();
  // Healthy startup and visible profile creation are intentionally quiet.
  await expect(
    page.getByRole('heading', { name: 'Create your first profile' }),
  ).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Open profile menu', exact: true }),
  ).toBeVisible();
  // Seed one fixed diagnostic to exercise presentation without routine capture.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('bookmark-manager-pro');
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      const read = db.transaction(
        ['activity', 'activitySessions', 'metadata'],
        'readonly',
      );
      const result = await Promise.all([
        new Promise<number>((resolve) => {
          const r = read.objectStore('activity').count();
          r.onsuccess = () => resolve(r.result);
        }),
        new Promise<{ id: string }[]>((resolve) => {
          const r = read.objectStore('activitySessions').getAll();
          r.onsuccess = () => resolve(r.result);
        }),
        new Promise<{ value: string }>((resolve) => {
          const r = read.objectStore('metadata').get('activeProfileId');
          r.onsuccess = () => resolve(r.result);
        }),
      ]);
      if (result[0] !== 0) throw new Error('routine-startup-created-activity');
      const session = result[1][0];
      if (!session) throw new Error('startup-session-missing');
      const write = db.transaction('activity', 'readwrite');
      write.objectStore('activity').add({
        id: crypto.randomUUID(),
        profileId: result[2].value,
        action: 'Read',
        applicationVersion: '0.7.0',
        browserTarget: 'Test',
        category: 'Application',
        dataChanged: false,
        durationMs: 0,
        eventCode: 'SYNTHETIC-READ-FAILED',
        itemType: 'Application',
        itemsAffected: 0,
        kind: 'DIAGNOSTIC',
        level: 'ERROR',
        message: 'Synthetic read failure.',
        operationId: 'op-synthetic-read',
        outcome: 'Failed',
        schemaVersion: 5,
        sessionId: session.id,
        sequence: 1,
        source: 'Verification',
        timestamp: Date.now(),
      });
      await new Promise<void>((resolve, reject) => {
        write.oncomplete = () => resolve();
        write.onerror = () => reject(write.error);
      });
    } finally {
      db.close();
    }
  });
  await page
    .getByRole('button', { name: 'Open profile menu', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Bookmark activity log', exact: true })
    .click();
  const log = page.getByRole('dialog', {
    name: 'Bookmark activity log',
    exact: true,
  });
  await expect(log.getByText('Startup checks succeeded')).toBeVisible();
  await expect(log.locator('.activity-session')).toHaveCount(1);
  const sessionToggle = log.locator('.activity-session__toggle');
  await expect(sessionToggle).not.toHaveText(
    /Browser session|Session detected/,
  );
  await expect(
    log.getByRole('button', { name: 'Clear this session', exact: true }),
  ).toHaveText('Clear');
  await sessionToggle.focus();
  await page.keyboard.press('Space');
  await expect(sessionToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(log.locator('.activity-log__event')).toHaveCount(0);
  await expect(log.getByText('Startup checks succeeded')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(sessionToggle).toHaveAttribute('aria-expanded', 'true');
  const event = log.locator('.activity-log__event').first();
  const summary = event.locator('summary');
  await expect(summary.locator('.activity-log__chevron')).toBeVisible();
  await expect(summary.locator('small')).toHaveCount(1);
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(event.locator('details')).toHaveAttribute('open', '');
  await expect(
    event.locator('dt').filter({ hasText: /^Profile$/ }),
  ).toBeVisible();
  await page.keyboard.press('Space');
  await expect(event.locator('details')).not.toHaveAttribute('open', '');
  await log
    .getByRole('heading', { name: 'Bookmark activity log', exact: true })
    .click();
  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme });
    for (const width of [1100, 320]) {
      await page.setViewportSize({ width, height: 720 });
      expect(
        await summary.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
      const alignment = await event.evaluate((element) => {
        const headerButton = element
          .closest('.activity-session')!
          .querySelector('.activity-session__title-row')!;
        const row = element.getBoundingClientRect();
        const header = headerButton.getBoundingClientRect();
        return Math.max(
          Math.abs(row.left - header.left),
          Math.abs(row.right - header.right),
        );
      });
      expect(alignment).toBeLessThanOrEqual(1);
      if (process.env.ACTIVITY_LOG_SCREENSHOT_DIR)
        await event.screenshot({
          path: `${process.env.ACTIVITY_LOG_SCREENSHOT_DIR}/event-row-${colorScheme}-${width}.png`,
        });
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(
    log.getByRole('button', { name: 'Export', exact: true }),
  ).toHaveCount(0);
  await log.getByRole('searchbox').fill('synthetic');
  await expect(log.locator('.clearable-input__button')).toHaveCount(1);
  await log.locator('.clearable-input__button').click();
  const optionsTrigger = log.getByRole('button', {
    name: 'View options',
    exact: true,
  });
  await optionsTrigger.click();
  const options = page.getByRole('dialog', {
    name: 'Activity log view options',
    exact: true,
  });
  await expect(
    options.getByRole('button', { name: 'All', exact: true }),
  ).toBeFocused();
  await expect(options.locator('.activity-log__footer button')).toHaveText([
    'Activity settings',
    'Close',
  ]);
  await expect(options.getByLabel('Retention (records)')).toHaveCount(0);
  await expect(options.getByLabel('Session order')).toBeVisible();
  await expect(options.getByLabel('Event order')).toBeVisible();
  await options.getByLabel('Event order').selectOption('newest');
  await options.getByLabel('Displayed categories').selectOption('Application');
  await options
    .getByRole('button', { name: 'Activity settings', exact: true })
    .click();
  const activitySettings = page.getByRole('dialog', {
    name: 'Settings',
    exact: true,
  });
  await expect(
    activitySettings
      .getByRole('navigation', { name: 'Settings categories' })
      .getByRole('button'),
  ).toHaveText(['Activity']);
  await expect(
    activitySettings.getByRole('heading', { name: 'Activity', exact: true }),
  ).toBeVisible();
  await expect(
    activitySettings.getByRole('group', { name: 'This profile', exact: true }),
  ).toBeVisible();
  await expect(
    activitySettings.getByRole('group', {
      name: 'Shared activity log',
      exact: true,
    }),
  ).toBeVisible();
  await activitySettings.getByLabel('Retention (records)').fill('20000');
  await activitySettings.screenshot({
    path: 'codex-internal/verification/activity-settings-separated.png',
  });
  await activitySettings
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(
    options.getByRole('button', { name: 'Activity settings', exact: true }),
  ).toBeFocused();
  await expect(options.getByLabel('Event order')).toHaveValue('newest');
  await expect(options.getByLabel('Displayed categories')).toHaveValue(
    'Application',
  );
  await options
    .getByRole('button', { name: 'Activity settings', exact: true })
    .click();
  await expect(activitySettings.getByLabel('Retention (records)')).toHaveValue(
    '10000',
  );
  await activitySettings.getByLabel('Retention (records)').fill('20000');
  const recordedCategories = activitySettings.getByRole('group', {
    name: 'Recorded categories',
  });
  for (const width of [1280, 420]) {
    await page.setViewportSize({ width, height: 800 });
    await recordedCategories.scrollIntoViewIfNeeded();
    const positions = await recordedCategories
      .getByRole('checkbox')
      .evaluateAll((boxes) =>
        boxes.map((box) => ({
          left: box.getBoundingClientRect().left,
          top: box.getBoundingClientRect().top,
        })),
      );
    expect(positions).toHaveLength(4);
    expect(Math.abs(positions[0]!.top - positions[1]!.top)).toBeLessThanOrEqual(
      1,
    );
    expect(positions[1]!.left).toBeGreaterThan(positions[0]!.left);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await activitySettings
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  await expect(activitySettings).toBeHidden();
  const settingsNotice = page.getByRole('button', {
    name: 'Dismiss notification',
    exact: true,
  });
  while (await settingsNotice.count()) await settingsNotice.last().click();
  await expect(options.getByLabel('Event order')).toHaveValue('newest');
  await options.screenshot({
    path: 'codex-internal/verification/activity-view-options-separated.png',
  });
  await options.getByLabel('Event order').selectOption('oldest');
  await options.getByLabel('Displayed categories').selectOption('ALL');
  const profileTrigger = options.getByRole('button', {
    name: /^Profile (Synthetic log profile|All profiles)$/,
  });
  await profileTrigger.click();
  const profiles = page.getByRole('dialog', {
    name: 'Choose activity log profile',
  });
  await expect(
    profiles.getByRole('radio', { name: 'Synthetic log profile', exact: true }),
  ).toBeChecked();
  await expect(
    profiles.getByRole('radio', { name: 'Synthetic log profile', exact: true }),
  ).toHaveAccessibleDescription('Active');
  await expect(profiles.locator('.profile-status')).toHaveText('Active');
  await profiles
    .getByRole('radio', { name: 'All profiles', exact: true })
    .focus();
  await page.keyboard.press('Space');
  await expect(
    profiles.getByRole('radio', { name: 'All profiles', exact: true }),
  ).toBeChecked();
  await expect(profiles.locator('.profile-status')).toHaveText('Active');
  await profiles.getByRole('searchbox').fill('no matching profile');
  await expect(
    profiles
      .getByRole('status')
      .filter({ hasText: /^No matching profiles\.$/ }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(profiles).not.toBeVisible();
  await expect(profileTrigger).toBeFocused();
  await expect(profileTrigger).toHaveText('All profiles');
  const dateTrigger = options.getByRole('button', {
    name: 'Date: All time',
    exact: true,
  });
  await dateTrigger.click();
  const picker = page.getByRole('dialog', {
    name: 'Select activity dates',
    exact: true,
  });
  const allTimeStyle = await picker
    .locator('.activity-date-chip')
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        border: style.border,
        radius: style.borderRadius,
        height: element.getBoundingClientRect().height,
        buttons: element.querySelectorAll('button').length,
      };
    });
  expect(allTimeStyle.buttons).toBe(0);
  await picker
    .getByRole('combobox', { name: 'Date preset' })
    .selectOption('yesterday');
  await page.keyboard.press('Escape');
  await expect(picker).not.toBeVisible();
  await expect(dateTrigger).toBeFocused();
  await expect(dateTrigger).toHaveText('Date: All time');
  await dateTrigger.click();
  await page.setViewportSize({ width: 1280, height: 1400 });
  const classicScrollbars = await page.addStyleTag({
    content: `
      .activity-date-dialog__content { scrollbar-width: auto; }
      .activity-date-dialog__content::-webkit-scrollbar { width: 16px; }
    `,
  });
  const scrollbarLayout = await picker.evaluate((element) => {
    const content = element.querySelector<HTMLElement>(
      '.activity-date-dialog__content',
    )!;
    const initialHeight = element.style.height;
    element.style.height = `${element.getBoundingClientRect().height}px`;
    const measure = () => {
      const dialogTop = element.getBoundingClientRect().top;
      return Array.from(
        element.querySelectorAll(
          'button, select, fieldset, .activity-date-months > section',
        ),
        (item) => {
          const rect = item.getBoundingClientRect();
          return { x: rect.x, y: rect.y - dialogTop, width: rect.width };
        },
      );
    };
    const initiallyScrollable = content.scrollHeight > content.clientHeight;
    const before = measure();
    const spacer = document.createElement('div');
    spacer.style.height = `${content.clientHeight}px`;
    content.append(spacer);
    const scrollable = content.scrollHeight > content.clientHeight;
    const after = measure();
    const gutter = content.offsetWidth - content.clientWidth;
    spacer.remove();
    element.style.height = initialHeight;
    return { initiallyScrollable, scrollable, before, after, gutter };
  });
  expect(scrollbarLayout.initiallyScrollable).toBe(false);
  expect(scrollbarLayout.scrollable).toBe(true);
  expect(scrollbarLayout.gutter).toBeGreaterThan(0);
  for (const [index, before] of scrollbarLayout.before.entries()) {
    const after = scrollbarLayout.after[index]!;
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1);
  }
  await classicScrollbars.evaluate((element) => element.remove());
  await page.setViewportSize({ width: 1280, height: 720 });
  await picker
    .getByRole('combobox', { name: 'Date preset' })
    .selectOption('custom');
  const date = picker.locator('[data-day]').first();
  await date.focus();
  await page.keyboard.press('ArrowRight');
  await expect(picker.locator('[data-day]').nth(1)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(
    picker.getByRole('button', { name: 'Apply', exact: true }),
  ).toBeEnabled();
  const removeDate = picker.getByRole('button', { name: /^Remove / });
  const selectedStyle = await picker
    .locator('.activity-date-chip')
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        border: style.border,
        radius: style.borderRadius,
        height: element.getBoundingClientRect().height,
      };
    });
  expect(selectedStyle.border).toBe(allTimeStyle.border);
  expect(selectedStyle.radius).toBe(allTimeStyle.radius);
  expect(selectedStyle.height).toBeCloseTo(allTimeStyle.height, 0);
  await picker.locator('.activity-date-chip > span').click();
  await expect(removeDate).toBeVisible();
  const removeStyle = await removeDate.evaluate((element) => ({
    border: parseFloat(getComputedStyle(element).borderWidth),
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
  }));
  expect(removeStyle.border).toBeGreaterThan(0);
  expect(removeStyle.width).toBeGreaterThanOrEqual(24);
  expect(removeStyle.height).toBeGreaterThanOrEqual(24);
  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    for (const width of [1100, 550, 320]) {
      await page.setViewportSize({ width, height: 720 });
      await picker.evaluate(
        (element) =>
          new Promise<void>((resolve) => {
            const observer = new ResizeObserver(() => {
              observer.disconnect();
              resolve();
            });
            observer.observe(element);
          }),
      );
      await expect
        .poll(() =>
          picker.evaluate((element) =>
            Math.min(
              ...Array.from(
                element.querySelectorAll('[data-day]'),
                (button) => button.getBoundingClientRect().width,
              ).filter((size) => size > 0),
            ),
          ),
        )
        .toBeGreaterThanOrEqual(24);
      await expect(picker.getByRole('grid')).toHaveCount(width > 650 ? 2 : 1);
      expect(
        await picker.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
      expect(
        await picker
          .locator('.activity-date-dialog__content')
          .evaluate(
            (element) => element.scrollWidth <= element.clientWidth + 1,
          ),
      ).toBe(true);
      const layout = await picker.evaluate((element) => {
        const content = element.querySelector(
          '.activity-date-dialog__content',
        )!;
        const navigation = element.querySelector('.activity-date-navigation')!;
        const buttons = navigation.querySelectorAll('button');
        const first = buttons[0]!.getBoundingClientRect();
        const last = buttons[1]!.getBoundingClientRect();
        const bounds = navigation.getBoundingClientRect();
        const label = element.querySelector('.settings-checkbox-row')!;
        const radio = label.querySelector('input')!.getBoundingClientRect();
        const text = document.createRange();
        text.selectNode(label.lastChild!);
        const month = element.querySelector('.activity-date-months > section')!;
        const preset = element.querySelector('select')!;
        const footerButtons = element.querySelectorAll(
          '.activity-log__footer button',
        );
        const accentColor = getComputedStyle(
          element.querySelector('input[type="radio"]:checked')!,
        ).backgroundColor;
        const markersMatch = Array.from(
          element.querySelectorAll('.activity-date-marker'),
          (marker) => {
            const rect = marker.getBoundingClientRect();
            if (!rect.width) return true;
            const day = marker.closest('button')!.getBoundingClientRect();
            return (
              getComputedStyle(marker).color === accentColor &&
              rect.left + rect.width / 2 > day.left + day.width / 2 &&
              rect.top + rect.height / 2 < day.top + day.height / 2
            );
          },
        ).every(Boolean);
        return {
          fullWidth:
            Math.abs(first.left - bounds.left) < 1 &&
            Math.abs(last.right - bounds.right) < 1,
          equalWidth: Math.abs(first.width - last.width) < 1,
          radioGap: text.getBoundingClientRect().left - radio.right,
          radioAspectDifference: Math.abs(radio.width - radio.height),
          roundedSelect: parseFloat(getComputedStyle(preset).borderRadius) > 0,
          calendarBackground: getComputedStyle(month).backgroundColor,
          dialogBackground: getComputedStyle(element).backgroundColor,
          contentFits: content.scrollWidth <= content.clientWidth + 1,
          numberOffset: Math.max(
            ...Array.from(
              element.querySelectorAll<HTMLButtonElement>('[data-day]'),
              (button) => {
                const text = document.createRange();
                text.selectNodeContents(
                  button.querySelector('.activity-date-day-number')!,
                );
                const number = text.getBoundingClientRect();
                const bounds = button.getBoundingClientRect();
                return Math.abs(
                  number.left +
                    number.width / 2 -
                    bounds.left -
                    bounds.width / 2,
                );
              },
            ),
          ),
          activityMarkers: element.querySelectorAll('.activity-date-marker')
            .length,
          markersMatch,
          footerGap:
            footerButtons[1]!.getBoundingClientRect().left -
            footerButtons[0]!.getBoundingClientRect().right,
        };
      });
      expect(layout.fullWidth).toBe(true);
      expect(layout.equalWidth).toBe(true);
      expect(layout.radioGap).toBeGreaterThanOrEqual(10);
      expect(layout.radioAspectDifference).toBeLessThanOrEqual(0.1);
      expect(layout.roundedSelect).toBe(true);
      expect(layout.calendarBackground).not.toBe(layout.dialogBackground);
      expect(layout.contentFits).toBe(true);
      expect(layout.numberOffset).toBeLessThanOrEqual(0.5);
      expect(layout.activityMarkers).toBeGreaterThan(0);
      expect(layout.markersMatch).toBe(true);
      expect(layout.footerGap).toBeGreaterThan(0);
      expect(layout.footerGap).toBeLessThanOrEqual(16);
      if (process.env.ACTIVITY_LOG_SCREENSHOT_DIR)
        await picker.screenshot({
          path: `${process.env.ACTIVITY_LOG_SCREENSHOT_DIR}/calendar-${colorScheme}-${width}.png`,
        });
    }
  }
  await removeDate.focus();
  await page.keyboard.press('Enter');
  await expect(
    picker.getByRole('combobox', { name: 'Date preset' }),
  ).toBeFocused();
  await expect(
    picker.getByRole('button', { name: 'Apply', exact: true }),
  ).toBeDisabled();
  await picker.locator('[data-day]').nth(1).click();
  await picker.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(
    options.getByRole('button', { name: 'Date: Custom dates', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(optionsTrigger).toBeFocused();
  await log
    .getByRole('button', { name: 'Clear all sessions', exact: true })
    .click();
  const confirmation = page.getByRole('dialog', {
    name: 'Clear all sessions',
    exact: true,
  });
  await expect(
    confirmation.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(
    log.getByRole('button', { name: 'Clear all sessions', exact: true }),
  ).toBeFocused();
  await log
    .getByRole('button', { name: 'Clear all sessions', exact: true })
    .click();
  await confirmation
    .getByRole('button', { name: 'Clear all sessions', exact: true })
    .click();
  await expect(confirmation).not.toBeVisible();
  const notice = page.getByRole('button', {
    name: 'Dismiss notification',
    exact: true,
  });
  if (await notice.count()) await notice.last().click();
  await optionsTrigger.click();
  await options
    .getByRole('button', { name: 'Date: Custom dates', exact: true })
    .click();
  await picker
    .getByRole('combobox', { name: 'Date preset' })
    .selectOption('all');
  await picker.getByRole('button', { name: 'Apply', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(log.getByText('Startup history was cleared')).toBeVisible();
  if (process.env.ACTIVITY_LOG_SCREENSHOT_DIR)
    await log.screenshot({
      path: `${process.env.ACTIVITY_LOG_SCREENSHOT_DIR}/sessions-after-clear.png`,
    });
  await log.getByRole('button', { name: 'Close', exact: true }).click();
  await page
    .getByRole('button', { name: 'Open profile menu', exact: true })
    .click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const normalSettings = page.getByRole('dialog', {
    name: 'Settings',
    exact: true,
  });
  await expect(
    normalSettings
      .getByRole('navigation', { name: 'Settings categories' })
      .getByRole('button'),
  ).toHaveCount(14);
  await expect(
    normalSettings.getByRole('button', { name: 'Advanced', exact: true }),
  ).toHaveCount(0);
  await expect(
    normalSettings.getByRole('heading', { name: 'General', exact: true }),
  ).toBeVisible();
  await normalSettings
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  expect(errors).toEqual([]);
});
