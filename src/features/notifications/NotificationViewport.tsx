import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { useStore } from 'zustand';
import { useTranslation } from 'react-i18next';

import type { NotificationPreferences } from '../../domain/profile-settings';
import {
  NotificationService,
  type AppNotification,
} from '../../application/notification/notification-service';

interface NotificationViewportProps {
  preferences: NotificationPreferences;
  service: NotificationService;
}

/** Renders the visible portion of the notification queue at the saved edge. */
export function NotificationViewport({
  preferences,
  service,
}: NotificationViewportProps) {
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLElement>(null);
  const notifications = useStore(service.store, (state) => state.notifications);

  useEffect(() => {
    if (!preferences.enabled) service.clear();
  }, [preferences.enabled, service]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof viewport.showPopover !== 'function') return;
    const bringToFront = () => {
      if (viewport.matches(':popover-open')) viewport.hidePopover();
      viewport.showPopover();
    };
    bringToFront();
    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.attributeName === 'open')) {
        bringToFront();
      }
    });
    observer.observe(document.body, {
      attributeFilter: ['open'],
      attributes: true,
      subtree: true,
    });
    return () => {
      observer.disconnect();
      if (viewport.matches(':popover-open')) viewport.hidePopover();
    };
  }, [notifications.length]);

  if (!preferences.enabled || notifications.length === 0) return null;
  const priority =
    preferences.order === 'newest'
      ? [...notifications].reverse()
      : [...notifications];
  const visible = priority.slice(0, preferences.stackLimit);
  const rendered = preferences.position.startsWith('bottom')
    ? visible.reverse()
    : visible;

  const viewport = (
    <section
      aria-label={t('notifications.regionLabel')}
      className={`notification-viewport notification-viewport--${preferences.position}`}
      popover="manual"
      ref={viewportRef}
    >
      {rendered.map((notification) => (
        <NotificationCard
          key={notification.id}
          countdownLineColor={preferences.countdownLineColor}
          notification={notification}
          dismissLabel={t('notifications.dismiss')}
          onDismiss={() => service.dismiss(notification.id)}
        />
      ))}
    </section>
  );
  return createPortal(viewport, document.body);
}

interface NotificationCardProps {
  countdownLineColor: string | null;
  dismissLabel: string;
  notification: AppNotification;
  onDismiss: () => void;
}

/** Manages pause-and-resume timing without changing the underlying operation. */
function NotificationCard({
  countdownLineColor,
  dismissLabel,
  notification,
  onDismiss,
}: NotificationCardProps) {
  const remainingRef = useRef(notification.durationMs);
  const startedRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);
  const [paused, setPaused] = useState(false);
  const dismiss = useEffectEvent(onDismiss);

  useEffect(() => {
    if (paused || remainingRef.current === null) return;
    startedRef.current = performance.now();
    timerRef.current = window.setTimeout(
      dismiss,
      Math.max(0, remainingRef.current),
    );
    return () => {
      window.clearTimeout(timerRef.current);
      remainingRef.current = Math.max(
        0,
        (remainingRef.current ?? 0) - (performance.now() - startedRef.current),
      );
    };
  }, [paused]);

  const setPauseFromFocus = (next: boolean) => setPaused(next);

  return (
    <article
      className={`notification-card notification-card--${notification.level}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setPauseFromFocus(false);
        }
      }}
      onFocus={() => setPauseFromFocus(true)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onDismiss();
        }
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role={
        notification.level === 'success' || notification.level === 'information'
          ? 'status'
          : 'alert'
      }
    >
      <span aria-hidden="true" className="notification-card__icon">
        {notification.level === 'success'
          ? '✓'
          : notification.level === 'error'
            ? '×'
            : '!'}
      </span>
      <div className="notification-card__content">
        <strong>{notification.title}</strong>
        <p>{notification.message}</p>
        {notification.actions?.length ? (
          <div className="notification-card__actions">
            {notification.actions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  void Promise.resolve(action.run()).catch(() => {
                    console.error(
                      'A privacy-safe notification action could not be completed.',
                    );
                  });
                }}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button
        aria-label={dismissLabel}
        className="notification-card__close"
        onClick={onDismiss}
        type="button"
      >
        ×
      </button>
      {notification.durationMs === null ? null : (
        <span
          aria-hidden="true"
          className="notification-card__time-line"
          data-paused={paused ? 'true' : 'false'}
          style={
            {
              '--notification-duration': `${notification.durationMs}ms`,
              '--notification-line-color': countdownLineColor ?? 'var(--text)',
            } as CSSProperties
          }
        />
      )}
    </article>
  );
}
