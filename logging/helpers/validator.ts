/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Validates log inputs and sizes to protect against memory exhaustion, high-intensity logging loops, or oversized payloads.
 */
export class Validator {
  /**
   * Checks if the overall payload size (calculated as rough string length) exceeds safety thresholds.
   * Defends against DoS by sending multi-megabyte payloads in logs.
   */
  public static isPayloadSizeSafe(
    message: string,
    metadata: any,
    maxSizeInBytes: number = 256 * 1024 // default 256KB cap
  ): { safe: boolean; reason?: string } {
    const messageSize = message ? message.length : 0;
    let metadataSize = 0;

    if (metadata) {
      try {
        // Simple and secure estimation, avoiding slow or infinite JSON stringify
        metadataSize = JSON.stringify(metadata).length;
      } catch (e) {
        // If stringify fails (e.g. circles, bigint, etc - although sanitizer handles this),
        // we fallback to safe estimate
        metadataSize = 1000; 
      }
    }

    const totalEstimateBytes = messageSize + metadataSize;

    if (totalEstimateBytes > maxSizeInBytes) {
      return {
        safe: false,
        reason: `Payload exceeds safety limit of ${maxSizeInBytes} bytes. (Estimated: ${totalEstimateBytes} bytes)`,
      };
    }

    return { safe: true };
  }

  /**
   * Validates if a log message contains characters that could represent a prompt injection,
   * safe log pollution, or carriage return injections (\r\n) designed to forge log lines.
   * Carriage returns are neutralized to avoid forging lines in raw log formats.
   */
  public static sanitizeCarriageReturns(message: string): string {
    if (!message) return '';
    // Replace carriage returns and newlines inside the single log to prevent line-injection spoofing
    return message.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
  }
}
