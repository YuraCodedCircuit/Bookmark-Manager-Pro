import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { defaultActivityLogSettings } from '../../application/activity-log/manage-activity-log';
import '../../localization/i18n';
import { BookmarkActivityLogDialog } from './BookmarkActivityLogDialog';
import {
  activityLogTestEntries,
  testProfileId,
} from './activity-log-test-data';

function createService() {
  return {
    clear: vi.fn(async () => undefined),
    createExport: vi.fn(async () => ({
      content: '{}',
      filename: 'activity.log',
      mimeType: 'text/plain' as const,
    })),
    getSettings: vi.fn(async () => defaultActivityLogSettings(testProfileId)),
    list: vi.fn(async () => activityLogTestEntries),
    record: vi.fn(async () => undefined),
    updateSettings: vi.fn(async (_profileId, settings) => ({
      ...settings,
      profileId: testProfileId,
    })),
  };
}

function renderDialog(service = createService(), onNotify = vi.fn()) {
  render(
    <BookmarkActivityLogDialog
      activityLog={service}
      isOpen
      onClose={vi.fn()}
      onNotify={onNotify}
      profileId={testProfileId}
    />,
  );
  return { onNotify, service };
}

afterEach(cleanup);

describe('BookmarkActivityLogDialog', () => {
  it('loads, filters, and expands persisted privacy-safe events', async () => {
    const user = userEvent.setup();
    const { service } = renderDialog();
    const dialog = screen.getByRole('dialog', {
      name: 'Bookmark activity log',
    });
    expect(await within(dialog).findAllByRole('listitem')).toHaveLength(4);
    expect(service.record).not.toHaveBeenCalledWith(
      testProfileId,
      expect.objectContaining({ eventCode: 'ACTIVITY-LOG-OPENED' }),
    );

    await user.click(within(dialog).getByRole('button', { name: 'Error' }));
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(1);
    await user.click(
      within(dialog).getByRole('button', {
        name: /Application settings could not be loaded/,
      }),
    );
    expect(within(dialog).getByText('APP-SETTINGS-LOAD-FAILED')).toBeVisible();
    expect(within(dialog).getByText('Edge v.140.0.0')).toBeVisible();
  });

  it('persists settings and exposes native field help', async () => {
    const user = userEvent.setup();
    const { onNotify, service } = renderDialog();
    await screen.findAllByRole('listitem');
    await user.selectOptions(screen.getByLabelText('Category'), 'Profiles');
    await user.click(
      screen.getByRole('button', {
        name: /A local profile operation completed/,
      }),
    );
    expect(screen.getByText('PROFILE-UPDATE-COMPLETE')).toBeVisible();
    const row = screen
      .getByText('Event code')
      .closest('.activity-log__detail-row');
    expect(row).toHaveAttribute(
      'title',
      'A stable, non-personal identifier for this type of event.',
    );

    await user.click(screen.getByRole('button', { name: /Log settings/ }));
    await user.click(screen.getByLabelText('Record bookmark activity'));
    expect(service.updateSettings).toHaveBeenCalledWith(
      testProfileId,
      expect.objectContaining({ activityEnabled: false }),
    );
    expect(service.record).toHaveBeenCalledWith(
      testProfileId,
      expect.objectContaining({
        eventCode: 'ACTIVITY-LOG-SETTINGS-UPDATE-COMPLETE',
        level: 'INFO',
      }),
    );
    expect(onNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'success',
        title: 'Activity log settings saved',
      }),
    );
  });

  it('clears durable entries and restores export after cancellation', async () => {
    const user = userEvent.setup();
    const service = createService();
    service.list
      .mockResolvedValueOnce(activityLogTestEntries)
      .mockResolvedValue([]);
    const { onNotify } = renderDialog(service);
    await screen.findAllByRole('listitem');
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Clear log' }));
    expect(
      screen.queryByRole('button', { name: 'Export' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Clear log' }));
    await user.click(screen.getByRole('button', { name: 'Clear log' }));
    expect(service.clear).toHaveBeenCalledWith(testProfileId);
    expect(service.record).toHaveBeenCalledWith(
      testProfileId,
      expect.objectContaining({
        eventCode: 'ACTIVITY-LOG-CLEAR-COMPLETE',
        level: 'INFO',
      }),
    );
    expect(
      await screen.findByText('No events match the current filters.'),
    ).toBeVisible();
    expect(onNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'success',
        title: 'Activity log cleared',
      }),
    );
  });

  it('records activity-log load and settings failures as errors', async () => {
    const loadService = createService();
    loadService.list.mockRejectedValueOnce(new Error('load-failed'));
    const loadNotification = vi.fn();
    renderDialog(loadService, loadNotification);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The activity log could not be loaded.',
    );
    expect(loadService.record).toHaveBeenCalledWith(
      testProfileId,
      expect.objectContaining({
        eventCode: 'ACTIVITY-LOG-LOAD-FAILED',
        level: 'ERROR',
      }),
    );
    expect(loadNotification).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error' }),
    );
    cleanup();

    const user = userEvent.setup();
    const settingsService = createService();
    settingsService.updateSettings.mockRejectedValueOnce(
      new Error('settings-failed'),
    );
    const settingsNotification = vi.fn();
    renderDialog(settingsService, settingsNotification);
    await screen.findAllByRole('listitem');
    await user.click(screen.getByRole('button', { name: /Log settings/ }));
    await user.click(screen.getByLabelText('Record bookmark activity'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The log settings could not be saved.',
    );
    expect(settingsService.record).toHaveBeenCalledWith(
      testProfileId,
      expect.objectContaining({
        eventCode: 'ACTIVITY-LOG-SETTINGS-UPDATE-FAILED',
        level: 'ERROR',
      }),
    );
    expect(settingsNotification).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error' }),
    );
  });

  it('records successful and failed exports without logging exported content', async () => {
    const user = userEvent.setup();
    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:test');
    const revokeObjectUrl = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const successNotification = vi.fn();
    const { service } = renderDialog(undefined, successNotification);
    await screen.findAllByRole('listitem');
    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(service.record).toHaveBeenCalledWith(
      testProfileId,
      expect.objectContaining({
        eventCode: 'ACTIVITY-LOG-EXPORT-COMPLETE',
        level: 'INFO',
      }),
    );
    expect(successNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'success',
        title: 'Activity log exported',
      }),
    );
    createObjectUrl.mockRestore();
    revokeObjectUrl.mockRestore();
    cleanup();

    const failedService = createService();
    failedService.createExport.mockRejectedValueOnce(
      new Error('export-failed'),
    );
    const failedNotification = vi.fn();
    renderDialog(failedService, failedNotification);
    await screen.findAllByRole('listitem');
    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The activity log file could not be created.',
    );
    expect(failedService.record).toHaveBeenCalledWith(
      testProfileId,
      expect.objectContaining({
        eventCode: 'ACTIVITY-LOG-EXPORT-FAILED',
        level: 'ERROR',
      }),
    );
    expect(failedNotification).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error' }),
    );
  });
});
