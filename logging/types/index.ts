/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum LogLevel {
  LOG = 'LOG',
  ALERT = 'ALERT',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SIMPLE = 'SIMPLE',
}

export interface SecurityConfig {
  /** Prevent leaking secret keys, passwords etc. Replaced with [REDACTED] */
  sensitiveKeys: string[];
  /** Maximum nesting depth for logged objects to prevent call-stack overflows (DDoS attempt) */
  maxDepth: number;
  /** Maximum length of individual string values in logs to prevent heap exhaustion */
  maxStringLength: number;
  /** Maximum overall input object/message size in bytes */
  maxPayloadSizeBytes: number;
}

export interface RateLimitConfig {
  /** If true, rate limit log writes to prevent disk-space exhaustion DDoS */
  enabled: boolean;
  /** Refill rate of logs per second */
  logsPerSecond: number;
  /** Burst capacity of log token bucket */
  burstCapacity: number;
}

export interface FileRotationConfig {
  /** Output log file path (optional) */
  filePath?: string;
  /** Maximum log file size in Megabytes before rotation */
  maxFileSizeMB: number;
}

export interface LoggerConfig {
  /** Minimum log level to print/write */
  minLevel: LogLevel;
  /** Security options */
  security: SecurityConfig;
  /** Rate-limiting options */
  rateLimit: RateLimitConfig;
  /** File output and rotation settings */
  rotation?: FileRotationConfig;
  /** Also write to system standard output stream (console) */
  writeToConsole: boolean;
}

export interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  securityApplied?: boolean;
}
