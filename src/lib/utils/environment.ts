/**
 * Centralized environment detection utilities for ELD Progress Report
 * Modeled after tesd-field-trips (2024 best practice)
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
    // Vite injects import.meta.env.BASE_URL, always ends with '/'
    return import.meta.env.BASE_URL || '/';
  }

  /** Active path (e.g. /eld-progress-report/dashboard.html) */
  static getPathname(): string {
    return window.location.pathname;
  }

  /** Context: admin, teacher, guardian, etc. (by path) */
  static getContext(): string {
    const p = this.getPathname();
    if (p.includes('/admin/')) return 'admin';
    if (p.includes('/teacher')) return 'teacher';
    if (p.includes('/guardian')) return 'guardian';
    return 'unknown';
  }
}
