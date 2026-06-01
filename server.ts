/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { LogManager, LogLevel } from './logging/index';

const app = express();
const PORT = 3000;

// Initialize the secure log manager
const logManager = LogManager.getInstance();

// Set up a custom logger for the UI operations
const logger = logManager.getLogger('system', {
  minLevel: LogLevel.SIMPLE, // capture simple, log, and any upper severity
  rateLimit: {
    enabled: true,
    logsPerSecond: 5, // low value allows clear visibility under user-triggered tests
    burstCapacity: 10,
  },
  rotation: {
    maxFileSizeMB: 2, // Rotate at 2 Megabytes for early visibility in demonstration
  },
});

// Configure JSON body parser
app.use(express.json());

// API: Get current sensitive keys list used by the system logger
app.get('/api/sensitive-keys', (req, res) => {
  res.json({ keys: logger.getSensitiveKeys() });
});

// API: Dynamically register/add custom sensitive key to the logger
app.post('/api/sensitive-keys', (req, res) => {
  const { key } = req.body;
  if (key) {
    logger.addSensitiveKey(key);
  }
  res.json({ success: true, keys: logger.getSensitiveKeys() });
});

// API: Retrieve system application log tail
app.get('/api/logs', async (req, res) => {
  const logFile = path.join(process.cwd(), 'logs/system.log');
  if (!fs.existsSync(logFile)) {
    return res.json([]);
  }

  try {
    const fileContent = await fs.promises.readFile(logFile, 'utf8');
    const lines = fileContent.trim().split('\n').filter(Boolean);

    const parsedLogs = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return {
          timestamp: new Date().toISOString(),
          level: LogLevel.SIMPLE,
          message: line,
        };
      }
    });

    // Provide the last 100 logs in descending order (newest first)
    res.json(parsedLogs.slice(-100).reverse());
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch logs: ' + String(err) });
  }
});

// API: Post single log using our secure logging library
app.post('/api/log', async (req, res) => {
  const { level, message, metadata, simulateError } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Log message is required.' });
  }

  const resolvedLevel = (LogLevel as any)[level] || LogLevel.INFO;

  try {
    let resultPayload = null;

    if (resolvedLevel === LogLevel.ERROR) {
      const err = simulateError
        ? new Error('Internal Server Error (Simulated crash context)')
        : null;
      resultPayload = await logger.error(message, err, metadata || { traceId: 'tr_demo_101' });
    } else if (resolvedLevel === LogLevel.SIMPLE) {
      resultPayload = await logger.simple(message);
    } else {
      switch (resolvedLevel) {
        case LogLevel.LOG:
          resultPayload = await logger.log(message, metadata);
          break;
        case LogLevel.ALERT:
          resultPayload = await logger.alert(message, metadata);
          break;
        case LogLevel.WARNING:
          resultPayload = await logger.warning(message, metadata);
          break;
        case LogLevel.INFO:
        default:
          resultPayload = await logger.info(message, metadata);
          break;
      }
    }

    res.json({ success: true, payload: resultPayload });
  } catch (err) {
    res.status(500).json({ error: 'Logging execution failed: ' + String(err) });
  }
});

// API: Execute high-intensity rate limiting test (DDoS defense simulation)
app.post('/api/rate-limit-test', async (req, res) => {
  const totalLogsToSend = 50;
  let allowed = 0;
  let throttled = 0;

  for (let i = 1; i <= totalLogsToSend; i++) {
    const payload = await logger.info(`DDoS simulation query stream #${i}`, {
      origin: 'Security testing script',
      requestNo: i,
    });

    if (payload && payload.message.includes('[Rate Limiter]')) {
      throttled++;
    } else if (payload) {
      allowed++;
    }
  }

  res.json({
    success: true,
    totalSent: totalLogsToSend,
    allowed,
    throttled,
    message: `Dispatched ${totalLogsToSend} consecutive log payloads within milliseconds. Ingestion was immediately gated.`,
  });
});

// API: Instantly rotate or clean records
app.post('/api/clean-logs', async (req, res) => {
  const logFile = path.join(process.cwd(), 'logs/system.log');
  try {
    if (fs.existsSync(logFile)) {
      await fs.promises.writeFile(logFile, '', 'utf8');
    }
    res.json({ success: true, message: 'Logs wiped successfully.' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Integrate Vite middleware or static delivery
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express Dev Server running at http://0.0.0.0:${PORT}`);
  });
}

start();
