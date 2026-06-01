# Secure JSON Logging Library for Node.js

A production-grade, secure, and DDoS-protected JSON logger designed exclusively for Node.js backend services. Written in TypeScript/JavaScript with Zero External Dependencies (pure standard library APIs).

---

## Key Features

1. **Structured JSON Logs**: Out-of-the-box support for strict JSON streaming compatible with aggregators like Elasticsearch, Graylog, Splunk, and BigQuery.
2. **Comprehensive Logging Levels**: Full support for 6 distinct logging levels:
   - **Log (`LOG`)**: General statements, debugging, trace flows.
   - **Alerts (`ALERT`)**: High-priority notifications that require intermediate administrative action.
   - **Info (`INFO`)**: General operations reports, server status, successful lifecycle boots.
   - **Warning (`WARNING`)**: Managed errors or unexpected non-fatal client events.
   - **Error (`ERROR`)**: Fatal runtime errors (attaches stack traces and auto-minifies them).
   - **Simple Log (`SIMPLE`)**: Plain minimalist single-level key-value JSON string containing only base elements.
3. **Advanced DDoS-Protection & Memory Overflows**:
   - **Ingestion Rate Limiting**: Built-in Token Bucket rate limit algorithm to automatically throttle intense spam or high-concurrency request DDoS attacks from overflowing log storage.
   - **Payload Max Bounds**: Overall limits on aggregate message and payload string sizes (protection against heavy buffer and memory heap exhaustion payloads).
   - **String Truncation**: Auto-truncates deep string lines to protect against heavy JSON string allocations.
   - **Guard against Stack Overflow**: Rejects nesting configurations deeper than configured limits, preventing complex nested JSON payloads from crashing the Node.js process call stack.
4. **Leakproof Data Sanitization**:
   - Automated keyword analysis of all logging payloads to mask and redact sensitive identifiers (e.g. `password`, `bearer`, `token`, `api_key`, `credit`) with `[REDACTED FOR SECURITY]`.
5. **Robust Circular Detection**:
   - Safely isolates circular references to prevent core JSON serialization errors (`TypeError: Converting circular structure to JSON`) from bringing down production servers.
6. **Asynchronous Non-Blocking Rotation**:
   - Rotates active logging streams based on strict file sizes, protecting the backend storage devices from complete disk fullness denial of service.

---

## Directory Structure

Our library is structured cleanly using professional, enterprise separation of concerns:

```text
/logging
├── package.json              # Package manifest
├── README.md                 # Library documentation
├── index.ts                  # Main entry point (Library boundaries)
├── types/
│   └── index.ts              # Custom declarations, configs, and enums
├── utilities/
│   └── formatter.ts          # Normalizer and static JSON stringifiers
├── helpers/
│   ├── sanitizer.ts          # Circular analyzer and credentials obfuscator
│   └── validator.ts          # String validators and carriage indicators
├── core_logic/
│   ├── logger.ts             # Direct file system streaming and level router
│   └── rate_limiter.ts       # Token Bucket rate limiter
└── business_logic/
    └── manager.ts            # Dynamic named Domain Logger Orchestrator
```

---

## Installation

Add the library safely as an internal workspace dependency or relative package:

```bash
npm install ./logging
```

---

## Usage Guide

### 1. Simple Bootstrapping

Instantiate your logger with custom domain isolated contexts:

```typescript
import { LogManager, LogLevel } from 'logging';

const manager = LogManager.getInstance();

// Retrieve domain specific loggers
const httpLogger = manager.getLogger('http');
const dbLogger = manager.getLogger('database');
```

### 2. Using All 6 Logging Levels

```typescript
// 1. Log / Debug
httpLogger.log('Incoming backend route hit.', { method: 'POST', url: '/api/checkout' });

// 2. Info
dbLogger.info('Database connection established successfully.', { host: 'localhost', pool: 20 });

// 3. Simple
httpLogger.simple('Plain minimalist message');

// 4. Warning
httpLogger.warning('Rate limit warning triggered for client.', { ip: '192.168.1.1' });

// 5. Errors
try {
  throw new Error('Database server connection timeout');
} catch (error) {
  dbLogger.error('Failed querying accounts records.', error, { userId: '12345' });
}

// 6. Alerts
dbLogger.alert('CPU utilization high! Action required.', { currentCpu: '96%' });
```

---

## Premium Security Details

### Rate Limiting DDoS Prevention
If an adversary floods your express server with thousands of malicious requests triggering error-level logs, typical log files can easily grow gigabytes inside minutes, crashing the operating system.
Our library controls this directly:

```typescript
const secureLogger = LogManager.getInstance().getLogger('gateway', {
  rateLimit: {
    enabled: true,
    logsPerSecond: 10,   // Max average 10 logs per second
    burstCapacity: 20,   // Maximum burst limit of 20 logs
  }
});
```

### Automatic Sensitive Data Redaction
You can configure key parameters of the manager to prevent passwords or API tokens from being accidentally stored in plaintext:

```typescript
const authLogger = LogManager.getInstance().getLogger('auth', {
  security: {
    sensitiveKeys: ['password', 'token', 'authorization_token', 'cc_cvv'],
    maxDepth: 5,
    maxStringLength: 512,
    maxPayloadSizeBytes: 64 * 1024 // 64 Kilobytes boundary
  }
});

// The password metadata is secure! It will automatically print as [REDACTED FOR SECURITY]
authLogger.info('User login attempt.', {
  username: 'dev_user',
  password: 'very_secret_passphrase_123',
  metadata: {
     sessionToken: 'xyz789jwtsecret'
  }
});
```

---

## License

Standard **Apache License 2.0**. Safe for commercial and global production enterprise backends.
