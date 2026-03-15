/**
 * Configuration utility for reading environment variables with defaults
 * Centralizes all env var reads to avoid scattering across the codebase
 */

export interface AppConfig {
  // Server settings
  port: number;

  // Runway processing times (in milliseconds)
  landingTime: number;
  takeoffTime: number;

  // Legacy: used if specific times not set (fallback range)
  minProcessingTime: number;
  maxProcessingTime: number;

  // Scheduler settings
  pollingInterval: number;

  // Logging
  logLevel: string;
}

/**
 * Parse an integer from env, with fallback default
 */
const getInt = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Parse a string from env, with fallback default
 */
const getString = (key: string, defaultValue: string): string => {
  const value = process.env[key];
  return value !== undefined && value !== '' ? value : defaultValue;
};

/**
 * Default configuration values
 */
const defaults: AppConfig = {
  port: 3000,
  landingTime: 4000,       // 4 seconds for landing
  takeoffTime: 5000,       // 5 seconds for takeoff (slightly longer)
  minProcessingTime: 3000, // Fallback min (used if specific times not set)
  maxProcessingTime: 7000, // Fallback max (used if specific times not set)
  pollingInterval: 500,    // 500ms for worker polling
  logLevel: 'info',
};

/**
 * Load and validate configuration from environment
 */
export class Config {
  private static instance: Config | null = null;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadFromEnv();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  /**
   * Reset instance (useful for testing)
   */
  static resetInstance(): void {
    Config.instance = null;
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnv(): AppConfig {
    return {
      port: getInt('PORT', defaults.port),
      landingTime: getInt('LANDING_TIME', getInt('LANDING_TIME_MS', defaults.landingTime)),
      takeoffTime: getInt('TAKE_OFF_TIME', getInt('TAKEOFF_TIME', getInt('TAKE_OFF_TIME_MS', defaults.takeoffTime))),
      minProcessingTime: getInt('MIN_PROCESSING_TIME', defaults.minProcessingTime),
      maxProcessingTime: getInt('MAX_PROCESSING_TIME', defaults.maxProcessingTime),
      pollingInterval: getInt('POLLING_INTERVAL', defaults.pollingInterval),
      logLevel: getString('LOG_LEVEL', defaults.logLevel),
    };
  }

  /**
   * Get full config object
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Get port number
   */
  getPort(): number {
    return this.config.port;
  }

  /**
   * Get processing time for a flight type (in ms)
   * Uses specific LANDING_TIME / TAKE_OFF_TIME, falls back to random range
   */
  getProcessingTime(flightType: 'landing' | 'takeoff'): number {
    if (flightType === 'landing') {
      return this.config.landingTime;
    } else {
      return this.config.takeoffTime;
    }
  }

  /**
   * Get landing time in ms
   */
  getLandingTime(): number {
    return this.config.landingTime;
  }

  /**
   * Get takeoff time in ms
   */
  getTakeoffTime(): number {
    return this.config.takeoffTime;
  }

  /**
   * Get random processing time (legacy fallback)
   */
  getRandomProcessingTime(): number {
    const min = this.config.minProcessingTime;
    const max = this.config.maxProcessingTime;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Get polling interval in ms
   */
  getPollingInterval(): number {
    return this.config.pollingInterval;
  }

  /**
   * Get log level
   */
  getLogLevel(): string {
    return this.config.logLevel;
  }

  /**
   * Log current configuration (for startup debugging)
   */
  logConfig(): void {
    const { logger } = require('../utils');
    const log = logger.child('Config');
    log.info(`PORT=${this.config.port}`);
    log.info(`LANDING_TIME=${this.config.landingTime}ms`);
    log.info(`TAKE_OFF_TIME=${this.config.takeoffTime}ms`);
    log.info(`LOG_LEVEL=${this.config.logLevel}`);
  }
}

// Export singleton instance
export const config = Config.getInstance();
