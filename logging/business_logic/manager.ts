/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LoggerConfig, LogLevel } from '../types';
import { Logger } from '../core_logic/logger';

/**
 * Main logical orchestrator matching enterprise-grade architecture.
 * Manages multiple named loggers concurrently, allowing tailored configurations
 * for independent backend domains like database queries, gateway endpoints, or authentication.
 */
export class LogManager {
  private static instance: LogManager;
  private loggers: Map<string, Logger> = new Map();
  private defaultConfig: LoggerConfig;

  private constructor() {
    // Standard Enterprise Production Defaults
    this.defaultConfig = {
      minLevel: LogLevel.INFO,
      writeToConsole: true,
      security: {
        sensitiveKeys: [
          'password',
          'token',
          'secret',
          'apiKey',
          'api_key',
          'bearer',
          'authorization',
          'cookie',
          'jwt',
          'credit',
          'ssn',
        ],
        maxDepth: 6,
        maxStringLength: 1024,
        maxPayloadSizeBytes: 128 * 1024, // 128KB max per log item
      },
      rateLimit: {
        enabled: true,
        logsPerSecond: 25, // limit logs to prevent server CPU hogging & drive fullness
        burstCapacity: 50,
      },
      rotation: {
        maxFileSizeMB: 10, // Rotate logs strictly at 10 MegaBytes
      },
    };
  }

  /**
   * Singleton Getter for the global LogManager.
   */
  public static getInstance(): LogManager {
    if (!LogManager.instance) {
      LogManager.instance = new LogManager();
    }
    return LogManager.instance;
  }

  /**
   * Sets custom default rules. Should be configured at application bootstrapping.
   */
  public configureDefaults(config: Partial<LoggerConfig>): void {
    this.defaultConfig = {
      ...this.defaultConfig,
      ...config,
      security: { ...this.defaultConfig.security, ...config.security },
      rateLimit: { ...this.defaultConfig.rateLimit, ...config.rateLimit },
      rotation: config.rotation
        ? { ...this.defaultConfig.rotation, ...config.rotation }
        : this.defaultConfig.rotation,
    };
  }

  /**
   * Gets or initializes a named logger.
   * Isolates settings by domains, e.g., 'auth', 'database', 'rest_api'.
   */
  public getLogger(name: string = 'root', customConfig?: Partial<LoggerConfig>): Logger {
    const cached = this.loggers.get(name);
    if (cached && !customConfig) {
      return cached;
    }

    // Merge custom logs configs onto company defaults
    const configToApply: LoggerConfig = { ...this.defaultConfig };

    if (customConfig) {
      Object.assign(configToApply, customConfig);
      if (customConfig.security) {
        configToApply.security = { ...this.defaultConfig.security, ...customConfig.security };
      }
      if (customConfig.rateLimit) {
        configToApply.rateLimit = { ...this.defaultConfig.rateLimit, ...customConfig.rateLimit };
      }
      if (customConfig.rotation) {
        configToApply.rotation = { ...this.defaultConfig.rotation, ...customConfig.rotation };
      }
    }

    // Automatically append default logs file matching named identifier
    if (!configToApply.rotation?.filePath) {
      configToApply.rotation = {
        filePath: `logs/${name}.log`,
        maxFileSizeMB: configToApply.rotation?.maxFileSizeMB || 10,
      };
    }

    const logger = new Logger(configToApply);
    this.loggers.set(name, logger);
    return logger;
  }

  /**
   * Clear active records. Used for clean application shutdown/recycling.
   */
  public destroy(): void {
    this.loggers.clear();
  }
}
