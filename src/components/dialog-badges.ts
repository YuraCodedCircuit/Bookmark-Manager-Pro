/** Release numbers use numeric major.minor.patch comparison, never string order. */
export type BadgeVersionRule =
  { exact: string } | { from: string; until: string; includeUntil?: boolean };

/** Developer-authored, localized metadata; removing an entry removes its badge. */
export interface DialogBadgeDefinition {
  id: string;
  kind: 'updated' | 'experimental' | 'deprecated';
  titleKey: string;
  descriptionKey: string;
  versions?: BadgeVersionRule;
}

function releaseParts(value: string): number[] | null {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) return null;
  const parts = value.split('.').map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}

function compare(left: number[], right: number[]): number {
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/** Fails closed for invalid releases or rules; range ends are exclusive by default. */
export function isBadgeVisible(
  version: string,
  rule?: BadgeVersionRule,
): boolean {
  if (!rule) return true;
  const current = releaseParts(version);
  if (!current) return false;
  if ('exact' in rule) {
    const exact = releaseParts(rule.exact);
    return exact !== null && compare(current, exact) === 0;
  }
  const start = releaseParts(rule.from);
  const end = releaseParts(rule.until);
  if (!start || !end || compare(start, end) > 0) return false;
  const endComparison = compare(current, end);
  return (
    compare(current, start) >= 0 &&
    (rule.includeUntil ? endComparison <= 0 : endComparison < 0)
  );
}
