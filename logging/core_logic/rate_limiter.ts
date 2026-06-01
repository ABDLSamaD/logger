/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogLevel } from '../types';

/**
 * High-performance, lightweight Token Bucket rate limiter designed specifically for loggers.
 * Guards high-intensity logging loops and high-concurrency request environments (DDoS)
 * from crashing the disk I/O, memory buffer, or log aggregation platform.
 */
export class LoggerRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per ms

  constructor(logsPerSecond: number, burstCapacity: number) {
    this.capacity = burstCapacity;
    this.tokens = burstCapacity;
    this.refillRate = logsPerSecond / 1000; // convert to tokens per ms
    this.lastRefill = Date.now();
  }

  /**
   * Attempts to consume 1 token for a log action.
   * High priority logs (ALERT, ERROR) may bipass or consume under different rules.
   * Returns true if allowed, false if rate limited.
   */
  public allow(level: LogLevel): boolean {
    this.refill();

    // Critical levels have a lower standard, ensuring we always try to capture critical errors.
    // They are granted a safety bypass unless completely saturated.
    if (level === LogLevel.ERROR || level === LogLevel.ALERT) {
      if (this.tokens < 0.1) {
        // Boost critical tokens slightly to guarantee critical logs get through
        this.tokens = Math.min(1, this.capacity);
      }
      this.tokens -= 1;
      return true;
    }

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false; // Limited!
  }

  /**
   * Refills the tokens in the bucket according to elapsed time.
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed > 0) {
      const addedTokens = elapsed * this.refillRate;
      this.tokens = Math.min(this.capacity, this.tokens + addedTokens);
      this.lastRefill = now;
    }
  }

  /**
   * Gets current count of available log tokens.
   */
  public getTokensAvailable(): number {
    this.refill();
    return Math.max(0, this.tokens);
  }
}
