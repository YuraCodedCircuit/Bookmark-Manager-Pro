import type { ThemeController } from '../../application/initialization/initialize-application';
import type {
  ResolvedTheme,
  ThemePreference,
} from '../../domain/profile-settings';

interface SystemThemeQuery {
  readonly matches: boolean;
  addEventListener(
    type: 'change',
    listener: (event: MediaQueryListEvent) => void,
  ): void;
  removeEventListener(
    type: 'change',
    listener: (event: MediaQueryListEvent) => void,
  ): void;
}

/** Applies profile theme preferences and follows live system-theme changes. */
export class DomThemeController implements ThemeController {
  private isFollowingSystemTheme = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly systemThemeQuery: SystemThemeQuery,
  ) {}

  apply(preference: ThemePreference): ResolvedTheme {
    this.setSystemThemeSubscription(preference === 'system');
    const resolvedTheme =
      preference === 'system'
        ? this.systemThemeQuery.matches
          ? 'dark'
          : 'light'
        : preference;

    this.applyResolvedTheme(resolvedTheme);
    return resolvedTheme;
  }

  /** Subscribes only while the active profile delegates its theme to the system. */
  private setSystemThemeSubscription(shouldFollowSystemTheme: boolean): void {
    if (shouldFollowSystemTheme === this.isFollowingSystemTheme) return;

    if (shouldFollowSystemTheme) {
      this.systemThemeQuery.addEventListener('change', this.handleSystemChange);
    } else {
      this.systemThemeQuery.removeEventListener(
        'change',
        this.handleSystemChange,
      );
    }
    this.isFollowingSystemTheme = shouldFollowSystemTheme;
  }

  /** Reapplies the resolved palette without mutating the saved profile preference. */
  private readonly handleSystemChange = (event: MediaQueryListEvent): void => {
    this.applyResolvedTheme(event.matches ? 'dark' : 'light');
  };

  /** Updates the single root state consumed by all semantic theme tokens. */
  private applyResolvedTheme(resolvedTheme: ResolvedTheme): void {
    this.root.dataset.theme = resolvedTheme;
    this.root.style.colorScheme = resolvedTheme;
  }
}
