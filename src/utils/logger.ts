/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  prefix: string;
  timestamp: boolean;
}

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  level: LogLevel.INFO,
  prefix: '',
  timestamp: true,
};

/**
 * Format log message with optional timestamp
 */
const formatMessage = (level: string, message: string, config: LoggerConfig): string => {
  const parts: string[] = [];

  if (config.timestamp) {
    const now = new Date();
    const time = now.toISOString().split('T')[1].split('.')[0];
    parts.push(`[${time}]`);
  }

  parts.push(`[${level.padEnd(5)}]`);

  if (config.prefix) {
    parts.push(`[${config.prefix}]`);
  }

  parts.push(message);

  return parts.join(' ');
};

/**
 * Simple logger utility for structured console output
 */
export class Logger {
  private config: LoggerConfig;

  constructor(prefix: string = '', level: LogLevel = LogLevel.INFO) {
    this.config = {
      ...defaultConfig,
      prefix,
      level,
    };
  }

  /**
   * Create a child logger with a sub-prefix
   */
  child(subPrefix: string): Logger {
    const newPrefix = this.config.prefix ? `${this.config.prefix}:${subPrefix}` : subPrefix;
    return new Logger(newPrefix, this.config.level);
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Log debug message (lowest priority)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.DEBUG) {
      console.log(formatMessage('DEBUG', message, this.config), ...args);
    }
  }

  /**
   * Log info message
   */
  info(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.INFO) {
      console.log(formatMessage('INFO', message, this.config), ...args);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.WARN) {
      console.warn(formatMessage('WARN', message, this.config), ...args);
    }
  }

  /**
   * Log error message
   */
  error(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.ERROR) {
      console.error(formatMessage('ERROR', message, this.config), ...args);
    }
  }

  /**
   * Log success/positive message (uses INFO level)
   */
  success(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.INFO) {
      console.log(formatMessage('OK', message, this.config), ...args);
    }
  }
}

// Create default logger instance
export const logger = new Logger('App');
