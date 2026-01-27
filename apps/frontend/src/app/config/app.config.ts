import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Application configuration
 * Loads configuration from environment variables
 * To customize the app name, modify the environment files:
 * - src/environments/environment.ts (development)
 * - src/environments/environment.prod.ts (production)
 */
@Injectable({ providedIn: 'root' })
export class AppConfig {
  /**
   * Application name displayed throughout the UI
   * Configured via environment.appName
   */
  readonly appName: string = environment.appName;

  /**
   * Application title (for browser tab)
   * Configured via environment.appTitle
   */
  readonly appTitle: string = environment.appTitle;

  /**
   * Application short name (for internal use)
   * Extracted from appName (removes " CMS" suffix if present)
   */
  readonly appShortName: string = environment.appName.replace(/\s+CMS\s*$/i, '');
}
