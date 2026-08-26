export type EdgeDropZone = 'after' | 'before';
export type DropZone = EdgeDropZone | 'inside';

/** Converts an unconstrained pointer coordinate to a target-relative ratio. */
export function resolveTargetRatio(
  targetX: number,
  targetLeft: number,
  targetWidth: number,
): number {
  return (targetX - targetLeft) / targetWidth;
}

/** Maps the dragged item's horizontal center to the target's exclusive drop zone. */
export function resolveDropZone(
  pointerRatio: number,
  folderTarget: boolean,
): DropZone {
  if (!folderTarget) return pointerRatio < 0.5 ? 'before' : 'after';
  if (pointerRatio < 0.25) return 'before';
  if (pointerRatio > 0.75) return 'after';
  return 'inside';
}

/** Converts an edge intent into the destination index after the source is removed. */
export function resolveReorderIndex(
  activeIndex: number,
  targetIndex: number,
  edge: EdgeDropZone,
): number {
  if (edge === 'after')
    return targetIndex + (activeIndex > targetIndex ? 1 : 0);
  return targetIndex - (activeIndex < targetIndex ? 1 : 0);
}

/** Returns whether an edge drop would leave the item at its existing position. */
export function isSamePositionDrop(
  activeIndex: number,
  targetIndex: number,
  edge: EdgeDropZone,
): boolean {
  return resolveReorderIndex(activeIndex, targetIndex, edge) === activeIndex;
}

/** Returns whether a grouped edge drop preserves the item's visible position. */
export function isSameVisiblePositionDrop(
  activePosition: number,
  targetPosition: number,
  edge: EdgeDropZone,
): boolean {
  return (
    (edge === 'after' && targetPosition === activePosition - 1) ||
    (edge === 'before' && targetPosition === activePosition + 1)
  );
}
