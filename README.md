# Secure Node.js JSON Logging Library & Interactive Dashboard

A production-ready, enterprise-grade, secure JSON logging library for Node.js backends. Built from scratch with **Zero External Dependencies** to shield against supply-chain injection vulnerabilities, coupled with an interactive visual React administration dashboard.

---

## 📋 Recommended Repository Details for GitHub

- **Repository Name**: `secure-json-logger` (or `node-secure-logger`)
- **Repository Description**: `A production-grade, secure, DDoS-protected JSON logging library for Node.js with real-time sanitization, token-bucket rate limiting, deep-object stack guards, circular reference resolution, and a beautiful interactive React control panel.`

---

## 🚀 Key Features

### 🛡️ Core Hardened Back-end Utilities (Zero Dependencies)
- **6 Structured Logging Levels**: Strictly typed levels out-of-the-box (`LOG`, `ALERT`, `INFO`, `WARNING`, `ERROR`, `SIMPLE`) compliant with Elasticsearch, Logstash, Splunk, and BigQuery formats.
- **Adaptive DDoS Ingestion Guard**: Custom Token Bucket rate limiting defends against intense log inflation or overflow stress attacks.
- **Leakproof Real-time Sanitization**: Seamlessly masks secrets (for default keys like `password`, `bearer_token`, etc., and live custom keys) to `[REDACTED]`.
- **Automatic Depth & Circular Shield**: Resolves nested properties safely and avoids string allocation memory leaks or stack overflows (`TypeError: Converting circular structure to JSON`) during high serialization pressure.
- **Asynchronous File-size Rotation**: Dynamic, non-blocking stream rotations ensure server disks stay safe from sudden growth exhaustion.

### 📊 Modern Interactive Frontend Workspace
- **Dynamic Log Severity Distribution**: Rich visual analytics via **Recharts** displaying standard log occurrences across categories (ALERT, ERROR, INFO, LOG, WARNING).
- **Interactive Trigger Streams**: Live preset controls for payload scenarios (e.g. Sensitive leaks, deep nest levels, circular models).
- **Real-time Custom Sensitive Keys Router**: Dynamically inject, monitor, and enforce custom redactions on-the-fly.
- **Adaptive DDoS Stress Emulator**: Simulate high-concurrency loops (e.g. 50 parallel requests) and monitor passive rejection behaviors instantly.
- **JSON Live Logs Exporter**: Direct offline standard downloads of viewable logs.

---

## 📂 Directory Architecture

```text
├── logging/                   # The Secure Standalone NPM Package
│   ├── index.ts               # Package export gates
│   ├── types/                 # Static TS types, level declarations, and configurations
│   ├── utilities/             # String formatting & minification utilities
│   ├── helpers/               # Leak analyzers, deep recursive sanitizers, circular trackers
│   └── core_logic/            # Disk IO streams, rotations, and Token-Bucket limiters
├── server.ts                  # Production Express Backend routing API logs & simulations
├── src/                       # Live Dashboard (React + Vite + Tailwind + Recharts)
│   ├── App.tsx                # Interactive console control panel and analytics
│   ├── main.tsx               # Main entry template
│   └── index.css              # Custom styling definitions
├── metadata.json              # Applet credentials config
└── package.json               # Manifest dependencies & scripts
```

---

## 🛠️ Usage Guide

### Install as Relative Package
```bash
npm install ./logging
```

### Import and Initialize Loggers
```typescript
import { LogManager } from 'logging';

const manager = LogManager.getInstance();
const logger = manager.getLogger('http');

// Simple info log
logger.info('Gateway connection verified.');

// Redacted logging matching password keys
logger.warning('User authorization attempt', {
  username: 'admin',
  password: 'my-plaintext-password-should-not-leak' // Automatically redacted!
});
```

---

## 📄 License
Licensed under the **Apache License 2.0**. Confirmed safe for global enterprise development setups.
