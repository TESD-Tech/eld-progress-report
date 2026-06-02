/**
 * Centralized environment detection utilities for Student Dashboard
 */

export class Environment {
  /** Is the Vite dev server active? */
  static isDevelopment(): boolean {
    return import.meta.env.DEV;
  }

  /** Is running as built output (not dev server)? */
  static isProduction(): boolean {
    return !import.meta.env.DEV;
  }

  /** Current hostname root */
  static getHost(): string {
    return window.location.origin;
  }

  /** Vite base path from config, always has trailing slash */
  static getBasePath(): string {
    return import.meta.env.BASE_URL || '/';
  }

  /** Active path (e.g. /student-dashboard/index.html) */
  static getPathname(): string {
    return window.location.pathname;
  }
}
