import {
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { useStore } from 'zustand';
import { useTranslation } from 'react-i18next';

import type { NotificationPreferences } from '../../domain/profile-settings';
import { prefersReducedMotion } from '../../shared/use-prefers-reduced-motion';
import {
  NotificationService,
  type AppNotification,
} from '../../application/notification/notification-service';
import {
  mountNotificationLayer,
  reportNotificationDiagnostic,
  type NotificationDiagnostic,
} from './notification-layer';

interface NotificationViewportProps {
  preferences: NotificationPreferences;
  service: NotificationService;
  onDiagnostic?: (event: NotificationDiagnostic) => void;
}

/** Presents admitted notifications in the configured corner without owning their clocks. */
export function NotificationViewport({
  preferences,
  service,
  onDiagnostic,
}: NotificationViewportProps) {
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLElement>(null);
  const [container] = useState(() => document.createElement('div'));
  const cardHeights = useRef(new Map<string, number>());
  const measuredSize = useRef('');
  const state = useStore(service.store);
  const visibleSet = new Set(state.visibleIds);
  const chronological = state.notifications.filter(({ id }) =>
    visibleSet.has(id),
  );
  const priority =
    preferences.order === 'newest' ? chronological.reverse() : chronological;
  const rendered = preferences.position.startsWith('bottom')
    ? priority.reverse()
    : priority;
  const active = preferences.enabled && state.notifications.length > 0;
  const waiting =
    rendered.length < preferences.stackLimit
      ? state.notifications.find(({ id }) => !visibleSet.has(id))
      : undefined;
  const placement = `${preferences.position}:${rendered.map(({ id }) => id).join(',')}`;
  const reportLayerFallback = useEffectEvent(() =>
    reportNotificationDiagnostic(onDiagnostic, 'top-layer-unavailable'),
  );

  useLayoutEffect(() => {
    // Start with no measured space so a newly attached surface cannot start
    // queued clocks before its hidden, inert sizing card has been laid out.
    service.setViewportCapacity({ height: 0, gap: 0, cardHeights: new Map() });
  }, [service]);

  useLayoutEffect(() => {
    service.configure({
      enabled: preferences.enabled,
      stackLimit: preferences.stackLimit,
    });
  }, [preferences.enabled, preferences.stackLimit, service]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!active || !viewport) return;
    return mountNotificationLayer(container, viewport, reportLayerFallback);
  }, [active, container]);

  const measure = useEffectEvent(() => {
    const viewport = viewportRef.current;
    if (!viewport?.isConnected) return;
    const rootSize =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const height = Math.max(
      0,
      Math.min(window.innerHeight, window.visualViewport?.height ?? Infinity) -
        2 * rootSize,
    );
    viewport.style.setProperty(
      '--notification-available-height',
      `${height}px`,
    );
    const size = `${viewport.getBoundingClientRect().width}:${height}`;
    if (measuredSize.current !== size) {
      cardHeights.current.clear();
      measuredSize.current = size;
    }
    const ids = new Set(
      service.store.getState().notifications.map(({ id }) => id),
    );
    for (const id of cardHeights.current.keys())
      if (!ids.has(id)) cardHeights.current.delete(id);
    for (const card of viewport.querySelectorAll<HTMLElement>(
      '[data-notification-id], [data-notification-measurement]',
    )) {
      const id =
        card.dataset.notificationId ?? card.dataset.notificationMeasurement;
      const height = card.getBoundingClientRect().height;
      if (id && height > 0) cardHeights.current.set(id, height);
    }
    service.setViewportCapacity({
      height,
      gap: parseFloat(getComputedStyle(viewport).rowGap) || 0,
      cardHeights: cardHeights.current,
    });
  });

  useLayoutEffect(() => {
    measure();
  });
  useLayoutEffect(() => {
    if (!active) return;
    const resize = () => measure();
    let frame: number | undefined;
    const observer =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            // Admission changes the observed stack's height. Measure on the
            // next frame instead of feeding writes back into observer delivery.
            if (frame !== undefined) return;
            frame = requestAnimationFrame(() => {
              frame = undefined;
              measure();
            });
          })
        : undefined;
    const viewport = viewportRef.current;
    if (viewport) {
      observer?.observe(viewport);
      for (const card of viewport.querySelectorAll('article'))
        observer?.observe(card);
    }
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
    };
  }, [active, placement, waiting?.id]);

  if (!active) return null;
  return createPortal(
    <section
      aria-label={t('notifications.regionLabel')}
      className={`notification-viewport notification-viewport--${preferences.position}`}
      popover="manual"
      ref={viewportRef}
    >
      {rendered.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          service={service}
          countdownLineColor={preferences.countdownLineColor}
          dismissLabel={t('notifications.dismiss')}
          onDiagnostic={onDiagnostic}
        />
      ))}
      {waiting ? (
        <div
          aria-hidden="true"
          inert
          className="notification-measurement"
          style={{ visibility: 'hidden' }}
        >
          <NotificationCard
            notification={waiting}
            service={service}
            countdownLineColor={preferences.countdownLineColor}
            dismissLabel={t('notifications.dismiss')}
            measurement
          />
        </div>
      ) : null}
    </section>,
    container,
  );
}

interface NotificationCardProps {
  measurement?: boolean;
  countdownLineColor: string | null;
  dismissLabel: string;
  notification: AppNotification;
  service: NotificationService;
  onDiagnostic?: ((event: NotificationDiagnostic) => void) | undefined;
}

/** Keeps countdown rendering observational: focus, rerenders, and DOM moves cannot change time. */
function NotificationCard({
  countdownLineColor,
  dismissLabel,
  notification,
  service,
  onDiagnostic,
  measurement = false,
}: NotificationCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const timing = service.getTiming(notification.id);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (
      measurement ||
      !card ||
      typeof card.animate !== 'function' ||
      prefersReducedMotion()
    )
      return;
    // CSS animations restart when a popover is raised or its dialog closes.
    // A card-owned Web Animation plays once and opacity cannot create overflow.
    const entrance = card.animate(
      { opacity: [0, 1] },
      { duration: 160, easing: 'ease-out' },
    );
    return () => entrance.cancel();
  }, [measurement]);

  useLayoutEffect(() => {
    const line = lineRef.current;
    if (measurement || !line || notification.durationMs === null) return;
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let frame: number;
    const update = () => {
      const progress = service.getTiming(notification.id);
      if (
        !progress ||
        progress.remainingMs === null ||
        progress.durationMs === null
      )
        return;
      let fraction =
        progress.durationMs === 0
          ? 0
          : progress.remainingMs / progress.durationMs;
      if (
        motion?.matches ||
        ['reduced', 'none'].includes(
          document.documentElement.dataset.motion ?? '',
        )
      )
        fraction = Math.ceil(fraction * 10) / 10;
      line.style.transform = `scaleX(${fraction})`;
      line.dataset.paused = progress.paused ? 'true' : 'false';
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [notification.id, notification.durationMs, service, measurement]);

  useLayoutEffect(() => {
    if (measurement) return;
    const card = cardRef.current;
    return () => {
      if (
        card?.contains(document.activeElement) &&
        returnFocusRef.current?.isConnected
      )
        returnFocusRef.current.focus({ preventScroll: true });
      // A removed card cannot remain under the pointer, even if DOM removal
      // does not dispatch mouseleave (for example, a surface unmount).
      service.setHovered(notification.id, false);
    };
  }, [notification.id, service, measurement]);

  return (
    <article
      className={`notification-card notification-card--${notification.level}`}
      data-notification-id={measurement ? undefined : notification.id}
      data-notification-measurement={measurement ? notification.id : undefined}
      ref={cardRef}
      onFocus={(event) => {
        if (
          event.relatedTarget instanceof HTMLElement &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          returnFocusRef.current = event.relatedTarget;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          service.dismiss(notification.id);
        }
      }}
      onMouseEnter={() => service.setHovered(notification.id, true)}
      onMouseLeave={() => service.setHovered(notification.id, false)}
      role={
        measurement
          ? undefined
          : notification.level === 'success' ||
              notification.level === 'information'
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
                type="button"
                onClick={() => {
                  void Promise.resolve()
                    .then(() => action.run())
                    .catch(() =>
                      reportNotificationDiagnostic(
                        onDiagnostic,
                        'action-failed',
                      ),
                    );
                }}
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
        onClick={() => service.dismiss(notification.id)}
        type="button"
      >
        ×
      </button>
      {notification.durationMs === null ? null : (
        <span
          aria-hidden="true"
          className="notification-card__time-line"
          ref={lineRef}
          data-paused={timing?.paused ? 'true' : 'false'}
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
