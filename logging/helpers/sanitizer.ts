/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sanitizes input logs to protect sensitive secrets, prevent circular crashes,
 * and limit depth and string sizes to defend against memory exhaustion and DDoS attacks.
 */
export class Sanitizer {
  /**
   * Sanitizes any value (object, array, primitive) and returns a clean, safe-to-serialize version.
   */
  public static sanitize(
    value: any,
    sensitiveKeys: string[],
    maxDepth: number = 5,
    maxStringLength: number = 2048,
    seen: WeakSet<any> = new WeakSet()
  ): any {
    // 1. Handle non-object and null values
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return value.length > maxStringLength
        ? value.slice(0, maxStringLength) + `... [TRUNCATED ${value.length - maxStringLength} chars for security]`
        : value;
    }

    if (typeof value !== 'object') {
      return value; // numbers, booleans, symbols, etc.
    }

    // 2. Prevent Circular References (essential to avoid server crash on JSON stringify)
    if (seen.has(value)) {
      return '[Circular Reference Safely Blocked]';
    }

    // 3. Handle Error Objects specially (extract message, name, and safe stack traces)
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack
          ? value.stack.split('\n').slice(0, 5).join('\n') // limit stack trace lines
          : undefined,
      };
    }

    // 4. Handle Date, RegExp, etc.
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value instanceof RegExp) {
      return value.toString();
    }

    // 5. Guard against deep nesting DDoS attacks
    if (maxDepth <= 0) {
      return '[Max Object Depth Exceeded for Security]';
    }

    seen.add(value);

    // 6. Handle Arrays
    if (Array.isArray(value)) {
      const cleanArray = value.map((item) =>
        this.sanitize(item, sensitiveKeys, maxDepth - 1, maxStringLength, seen)
      );
      seen.delete(value);
      return cleanArray;
    }

    // 7. Handle Plain Objects
    const cleanObj: Record<string, any> = {};
    const lowerSensitiveKeys = sensitiveKeys.map((k) => k.toLowerCase());

    for (const key of Object.keys(value)) {
      try {
        const isSensitive = lowerSensitiveKeys.some(
          (sensKey) => key.toLowerCase().includes(sensKey)
        );

        if (isSensitive) {
          cleanObj[key] = '[REDACTED FOR SECURITY]';
        } else {
          cleanObj[key] = this.sanitize(
            value[key],
            sensitiveKeys,
            maxDepth - 1,
            maxStringLength,
            seen
          );
        }
      } catch (err) {
        cleanObj[key] = '[Error accessing property]';
      }
    }

    seen.delete(value);
    return cleanObj;
  }
}
