/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogLevel, LoggerConfig, LogPayload } from '../types';
import { Sanitizer } from '../helpers/sanitizer';
import { Validator } from '../helpers/validator';
import { Formatter } from '../utilities/formatter';
import { LoggerRateLimiter } from './rate_limiter';
import * as fs from 'fs';
import * as path from 'path';

export class Logger {
  private config: LoggerConfig;
  private rateLimiter: LoggerRateLimiter;
  private fileLock: boolean = false;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.rateLimiter = new LoggerRateLimiter(
      config.rateLimit.logsPerSecond,
      config.rateLimit.burstCapacity
    );

    // Ensure directory exists if path is specified
    if (this.config.rotation?.filePath) {
      const dir = path.dirname(this.config.rotation.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Safe and asynchronous log writing process.
   */
  private async processLog(
    level: LogLevel,
    message: string,
    metadata?: any,
    errorObj?: any
  ): Promise<LogPayload | null> {
    // 1. Level Check (Check if level matches threshold)
    if (!this.shouldLog(level)) {
      return null;
    }

    // 2. Validate overall raw size to catch abnormally large inputs before processing
    const sizeCheck = Validator.isPayloadSizeSafe(
      message,
      metadata,
      this.config.security.maxPayloadSizeBytes
    );
    if (!sizeCheck.safe) {
      // Record violation as a Warning, but reject the full payload to prevent OOM
      const warningPayload = Formatter.formatToJson(
        LogLevel.WARNING,
        `Security Alert: Log payload size rejected: ${sizeCheck.reason}`
      );
      this.writeLog(warningPayload);
      return warningPayload;
    }

    // 3. Rate Limiter Assessment (Protects system from DDoS log spam)
    if (this.config.rateLimit.enabled && !this.rateLimiter.allow(level)) {
      // If we trigger rate limit, we drop but write a single rate limit notice to avoid silent failure
      const rateLimitMessage = `[Rate Limiter] Log spam throttled. Dropping logs of severity lower than ALERT. Refilling bucket soon.`;
      const throttledPayload = Formatter.formatToJson(LogLevel.WARNING, rateLimitMessage);
      this.writeLog(throttledPayload);
      return throttledPayload;
    }

    // 4. Sanitize metadata & messages (prevent credentials leak, stack overflows, and circular reference crashes)
    const sanitizedMetadata = metadata
      ? Sanitizer.sanitize(
          metadata,
          this.config.security.sensitiveKeys,
          this.config.security.maxDepth,
          this.config.security.maxStringLength
        )
      : undefined;

    const sanitizedError = errorObj
      ? Sanitizer.sanitize(
          errorObj,
          this.config.security.sensitiveKeys,
          this.config.security.maxDepth,
          this.config.security.maxStringLength
        )
      : undefined;

    // 5. Formats log entry into JSON LogPayload
    const payload = Formatter.formatToJson(
      level,
      message,
      sanitizedMetadata,
      sanitizedError
    );

    // 6. Output log to streams
    this.writeLog(payload);

    return payload;
  }

  /**
   * Helper to write formatted payload to streams (Console / Active Log Files)
   */
  private writeLog(payload: LogPayload): void {
    const logStr = Formatter.stringify(payload, false);

    // Write to Standard Console
    if (this.config.writeToConsole) {
      if (payload.level === LogLevel.ERROR) {
        console.error(logStr);
      } else if (payload.level === LogLevel.WARNING) {
        console.warn(logStr);
      } else {
        console.log(logStr);
      }
    }

    // Write filesystem output safely with automatic size checking and rotation
    if (this.config.rotation?.filePath) {
      this.writeToLogFile(logStr);
    }
  }

  /**
   * Safe asynchronous file logging with active size rotation guard.
   */
  private async writeToLogFile(logLine: string): Promise<void> {
    if (!this.config.rotation?.filePath) return;

    try {
      const filePath = this.config.rotation.filePath;
      const maxSizeMB = this.config.rotation.maxFileSizeMB;

      // Simple rotation check before appending
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const fileSizeMB = stats.size / (1024 * 1024);

        if (fileSizeMB >= maxSizeMB && !this.fileLock) {
          this.fileLock = true;
          try {
            await this.rotateLogFiles(filePath);
          } finally {
            this.fileLock = false;
          }
        }
      }

      await fs.promises.appendFile(filePath, logLine + '\n', 'utf8');
    } catch (err) {
      console.error(`[Logging Library Critical Error] Could not write to log file: ${String(err)}`);
    }
  }

  /**
   * Standard rotation that renames the active file with an index and clears paths.
   */
  private async rotateLogFiles(filePath: string): Promise<void> {
    try {
      const maxBackups = 3;
      for (let i = maxBackups - 1; i >= 1; i--) {
        const oldFile = `${filePath}.${i}`;
        const newFile = `${filePath}.${i + 1}`;
        if (fs.existsSync(oldFile)) {
          await fs.promises.rename(oldFile, newFile);
        }
      }

      const backupFile = `${filePath}.1`;
      await fs.promises.rename(filePath, backupFile);
    } catch (err) {
      console.error(`[Logging Library Critical Error] Rotation failed: ${String(err)}`);
    }
  }

  /**
   * Check if level is permitted to log.
   */
  private shouldLog(level: LogLevel): boolean {
    const order = [
      LogLevel.SIMPLE,
      LogLevel.LOG,
      LogLevel.INFO,
      LogLevel.WARNING,
      LogLevel.ERROR,
      LogLevel.ALERT,
    ];
    const configIdx = order.indexOf(this.config.minLevel);
    const logIdx = order.indexOf(level);
    return logIdx >= configIdx;
  }

  /**
   * Public Log Methods
   */

  public log(message: string, metadata?: any): Promise<LogPayload | null> {
    return this.processLog(LogLevel.LOG, message, metadata);
  }

  public alert(message: string, metadata?: any): Promise<LogPayload | null> {
    return this.processLog(LogLevel.ALERT, message, metadata);
  }

  public info(message: string, metadata?: any): Promise<LogPayload | null> {
    return this.processLog(LogLevel.INFO, message, metadata);
  }

  public warning(message: string, metadata?: any): Promise<LogPayload | null> {
    return this.processLog(LogLevel.WARNING, message, metadata);
  }

  public error(message: string, errorObj?: any, metadata?: any): Promise<LogPayload | null> {
    return this.processLog(LogLevel.ERROR, message, metadata, errorObj);
  }

  public simple(message: string): Promise<LogPayload | null> {
    return this.processLog(LogLevel.SIMPLE, message);
  }

  /**
   * Retrieve current rate limit bucket token count
   */
  public getRateLimitTokens(): number {
    return this.rateLimiter.getTokensAvailable();
  }

  /**
   * Get current list of sensitive keys in real-time.
   */
  public getSensitiveKeys(): string[] {
    return this.config.security.sensitiveKeys;
  }

  /**
   * Dynamically add custom sensitive keys to the redact list in real-time.
   */
  public addSensitiveKey(key: string): void {
    const trimmed = key.trim();
    if (trimmed && !this.config.security.sensitiveKeys.includes(trimmed)) {
      this.config.security.sensitiveKeys.push(trimmed);
    }
  }

  /**
   * Set sensitive keys list completely.
   */
  public setSensitiveKeys(keys: string[]): void {
    this.config.security.sensitiveKeys = keys.map(k => k.trim()).filter(Boolean);
  }
}
