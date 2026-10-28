import type { DialogBadgeDefinition } from '../../components/dialog-badges';

/** The activity log advertises its update only during the approved release window. */
export const activityLogBadges: readonly DialogBadgeDefinition[] = [
  {
    id: 'activity-log-updated',
    kind: 'updated',
    titleKey: 'dialogBadges.updated',
    descriptionKey: 'dialogBadges.activityLogUpdated',
    versions: { from: '0.7.1', until: '0.7.5' },
  },
];
