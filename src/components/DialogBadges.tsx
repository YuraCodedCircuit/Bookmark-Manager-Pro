import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InformationIcon } from './icons/InformationIcon';
import { isBadgeVisible, type DialogBadgeDefinition } from './dialog-badges';

interface Props {
  badges: readonly DialogBadgeDefinition[];
  version: string;
  /** Temporary visual review only; bypasses version rules and labels the group. */
  preview?: boolean;
}

/** Renders only configured, applicable badges without storing acknowledgment state. */
export function DialogBadges({ badges, version, preview = false }: Props) {
  const { t } = useTranslation();
  const visible = badges.filter(
    (badge) => preview || isBadgeVisible(version, badge.versions),
  );
  if (visible.length === 0) return null;
  return (
    <div
      className="dialog-badges"
      role="group"
      aria-label={t('dialogBadges.group')}
    >
      {preview ? (
        <span className="dialog-badges__preview">
          {t('dialogBadges.preview')}
        </span>
      ) : null}
      {visible.map((badge) => (
        <DialogBadge key={badge.id} badge={badge} />
      ))}
    </div>
  );
}

function DialogBadge({ badge }: { badge: DialogBadgeDefinition }) {
  const { t } = useTranslation();
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const hovered = useRef(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const title = t(badge.titleKey);
  const reveal = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(320, window.innerWidth - 16);
    setPosition({
      top: Math.min(rect.bottom, window.innerHeight - 80),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
    });
  };
  useEffect(() => {
    if (!position) return;
    // Capture Escape before the containing native dialog's cancel behavior.
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setPosition(null);
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setPosition(null);
    };
    const resize = () => setPosition(null);
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', resize);
    };
  }, [position]);
  return (
    <span
      ref={root}
      className={`dialog-badge dialog-badge--${badge.kind}`}
      onMouseEnter={() => {
        hovered.current = true;
        reveal();
      }}
      onMouseLeave={() => {
        hovered.current = false;
        if (!root.current?.contains(document.activeElement)) setPosition(null);
      }}
      onBlur={(event) => {
        if (
          !hovered.current &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setPosition(null);
      }}
    >
      <span>{title}</span>
      <button
        ref={trigger}
        type="button"
        className="dialog-badge__info"
        aria-label={t('dialogBadges.about', { title })}
        aria-describedby={id}
        onFocus={reveal}
        onClick={reveal}
      >
        <InformationIcon />
      </button>
      <span
        id={id}
        role="tooltip"
        hidden={!position}
        className="dialog-badge__tooltip"
        style={position ?? undefined}
      >
        {t(badge.descriptionKey)}
      </span>
    </span>
  );
}
