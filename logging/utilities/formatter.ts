/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogLevel, LogPayload } from '../types';
import { Validator } from '../helpers/validator';

/**
 * Utility to format logs into standardized JSON string structures.
 */
export class Formatter {
  /**
   * Formats a statement into a structured, single-line JSON log payload.
   */
  public static formatToJson(
    level: LogLevel,
    message: string,
    metadata?: any,
    errorObj?: any
  ): LogPayload {
    const safeMessage = Validator.sanitizeCarriageReturns(message);
    const timestamp = new Date().toISOString();

    if (level === LogLevel.SIMPLE) {
      // Simple log is minimalist JSON
      return {
        timestamp,
        level,
        message: safeMessage,
      };
    }

    const payload: LogPayload = {
      timestamp,
      level,
      message: safeMessage,
    };

    if (metadata !== undefined) {
      payload.metadata = metadata;
    }

    if (errorObj) {
      payload.error = {
        name: errorObj.name || 'Error',
        message: errorObj.message || String(errorObj),
        stack: errorObj.stack ? String(errorObj.stack).split('\n').slice(0, 5).join('\n') : undefined,
      };
    }

    return payload;
  }

  /**
   * Stringifies a log payload, making it human-readable if specified.
   */
  public static stringify(payload: LogPayload, pretty: boolean = false): string {
    try {
      return pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
    } catch (e) {
      // Ultimate fallback if stringify still fails for any reason
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        level: LogLevel.ERROR,
        message: 'Failed to serialize log payload: ' + String(e),
      });
    }
  }
}
