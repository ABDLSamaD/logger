/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  ShieldCheck, 
  Flame, 
  Trash2, 
  RefreshCw, 
  Play, 
  Activity, 
  Code, 
  FileText, 
  Zap, 
  Sliders, 
  AlertTriangle,
  Info,
  CheckCircle,
  Hash,
  Download,
  Plus,
  ShieldAlert,
  Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

interface LogPayload {
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  securityApplied?: boolean;
}

export default function App() {
  // Navigation tabs for the interactive user experience
  const [activeTab, setActiveTab] = useState<'console' | 'docs' | 'architecture'>('console');
  
  // State for single-log trigger playground
  const [logLevel, setLogLevel] = useState<string>('INFO');
  const [logMessage, setLogMessage] = useState<string>('Portal transaction gateway verified response payload.');
  const [logMetadata, setLogMetadata] = useState<string>('{\n  "userId": 923,\n  "password": "my-super-secret-password-123",\n  "api_key": "sec_key_abcde12345",\n  "cartTotal": 149.99,\n  "deepObj": {\n    "child": {\n      "grandchild": {\n        "nestedValue": "Limit-Reached"\n      }\n    }\n  }\n}');
  const [simulateError, setSimulateError] = useState<boolean>(true);
  
  // Sensitive keys list state managed in real-time
  const [sensitiveKeys, setSensitiveKeys] = useState<string[]>([]);
  const [newSensitiveKey, setNewSensitiveKey] = useState<string>('');

  // State for real-time logs stream
  const [logsList, setLogsList] = useState<LogPayload[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [isWiping, setIsWiping] = useState<boolean>(false);
  
  // State for DDoS Rate Limit Test
  const [isDdosTesting, setIsDdosTesting] = useState<boolean>(false);
  const [ddosResults, setDdosResults] = useState<{
    sent: number;
    allowed: number;
    throttled: number;
    message: string;
  } | null>(null);

  // Status logs feedback
  const [statusFeedback, setStatusFeedback] = useState<string>('Ready to emit and ingest logs.');

  // Fetch log list from the backend Express server
  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs');
      if (response.ok) {
        const data = await response.json();
        setLogsList(data);
      }
    } catch (err) {
      console.error('Failed to poll logs:', err);
    }
  };

  // Fetch registered sensitive keys list
  const fetchSensitiveKeys = async () => {
    try {
      const response = await fetch('/api/sensitive-keys');
      if (response.ok) {
        const data = await response.json();
        setSensitiveKeys(data.keys || []);
      }
    } catch (err) {
      console.error('Failed to fetch sensitive keys:', err);
    }
  };

  // Poll for new logs and load metadata configurations on mount
  useEffect(() => {
    fetchLogs();
    fetchSensitiveKeys();
    let interval: NodeJS.Timeout | null = null;
    if (isPolling) {
      interval = setInterval(fetchLogs, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPolling]);

  // Handle triggering a single custom log
  const handleEmitLog = async () => {
    setStatusFeedback('Processing log submission...');
    let metadataObj = null;
    if (logMetadata.trim()) {
      try {
        metadataObj = JSON.parse(logMetadata);
      } catch (err) {
        setStatusFeedback('Error parsing Metadata JSON structure.');
        return;
      }
    }

    try {
      const response = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: logLevel,
          message: logMessage,
          metadata: metadataObj,
          simulateError: simulateError && logLevel === 'ERROR'
        })
      });

      if (response.ok) {
        setStatusFeedback(`Log emitted successfully! Severity level: ${logLevel}`);
        fetchLogs();
      } else {
        const errData = await response.json();
        setStatusFeedback(`Error: ${errData.error || 'Server rejected log'}`);
      }
    } catch (err) {
      setStatusFeedback(`HTTP Error: ${String(err)}`);
    }
  };

  // Manage adding dynamic sensitive key to redact checklist
  const handleAddSensitiveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = newSensitiveKey.trim();
    if (!cleanKey) return;

    try {
      const response = await fetch('/api/sensitive-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: cleanKey })
      });

      if (response.ok) {
        const data = await response.json();
        setSensitiveKeys(data.keys || []);
        setNewSensitiveKey('');
        setStatusFeedback(`Key "${cleanKey}" added to the redacted keys list!`);
        // If active input metadata is empty or at standard, let's inject a demonstration of this key
        if (logMetadata.includes('password')) {
          setLogMetadata(prev => prev.replace('"cartTotal"', `"${cleanKey}": "sensitive-value-here",\n  "cartTotal"`));
        }
      }
    } catch (err) {
      setStatusFeedback(`Failed to register key: ${String(err)}`);
    }
  };

  // Run the full DDoS simulator
  const handleDdosSimulation = async () => {
    setIsDdosTesting(true);
    setDdosResults(null);
    setStatusFeedback('Simulating high-intensity request log flood (50 parallel entries)...');

    try {
      const response = await fetch('/api/rate-limit-test', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setDdosResults({
          sent: data.totalSent,
          allowed: data.allowed,
          throttled: data.throttled,
          message: data.message
        });
        setStatusFeedback('DDoS Rate Limit Test Complete. Check results below.');
        fetchLogs();
      } else {
        setStatusFeedback('DDoS Simulation request failed.');
      }
    } catch (err) {
      setStatusFeedback('DDoS Simulation network failure: ' + String(err));
    } finally {
      setIsDdosTesting(false);
    }
  };

  // Clear all log files in storage
  const handleClearLogs = async () => {
    setIsWiping(true);
    try {
      const response = await fetch('/api/clean-logs', { method: 'POST' });
      if (response.ok) {
        setLogsList([]);
        setStatusFeedback('Backend system log file wiped clean.');
      }
    } catch (err) {
      setStatusFeedback('Failed to wipe logs: ' + String(err));
    } finally {
      setIsWiping(false);
    }
  };

  // Export logs to downloadable file
  const handleDownloadLogs = () => {
    try {
      const fileData = JSON.stringify(filteredLogs, null, 2);
      const blob = new Blob([fileData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logs_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusFeedback('Exported clean json logs to offline storage.');
    } catch (err) {
      setStatusFeedback('Logs download failed: ' + String(err));
    }
  };

  // Pre-configured testing templates for convenience
  const applyPreset = (type: 'sensitive' | 'deep' | 'standard' | 'simple') => {
    if (type === 'sensitive') {
      setLogLevel('INFO');
      setLogMessage('API Gateway authenticating client session token credentials.');
      setLogMetadata(JSON.stringify({
        accountId: "acc_demo_8828",
        username: "system_root",
        password: "vulnerable_uncapped_password_77!",
        bearer_token: "eyJhY2Nlc3NfdG9rZW4iOiIzOTg0MjM4OTQyMyIsImV4cGlyZXMiOiI3MjAwIn0=",
        cookie: "session_id_hash=42a8b9e1",
        credit_card: "4111-2222-3333-4444"
      }, null, 2));
    } else if (type === 'deep') {
      setLogLevel('WARNING');
      setLogMessage('Deep object tree ingestion triggered.');
      setLogMetadata(JSON.stringify({
        root: {
          nodeA: {
            nodeB: {
              nodeC: {
                nodeD: {
                  nodeE: {
                    tooDeepItem: "This will exceed default sanitizer depth boundary and get truncated safely"
                  }
                }
              }
            }
          }
        }
      }, null, 2));
    } else if (type === 'standard') {
      setLogLevel('ALERT');
      setLogMessage('Crucial cloud sync storage warning: replica pool lagging.');
      setLogMetadata(JSON.stringify({
        primaryNodeStatus: "HEALTHY",
        secondaryNodesOffline: 2,
        syncLagSeconds: 42.5
      }, null, 2));
    } else if (type === 'simple') {
      setLogLevel('SIMPLE');
      setLogMessage('Simple level message - minimalist properties only.');
      setLogMetadata('');
    }
  };

  // Filter logs locally based on search text and selected level
  const filteredLogs = logsList.filter(log => {
    const textMatch = 
      log.message.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(searchFilter.toLowerCase())) ||
      log.level.toLowerCase().includes(searchFilter.toLowerCase());
    
    if (levelFilter === 'ALL') return textMatch;
    return log.level === levelFilter && textMatch;
  });

  // Calculate current log level analytical counts
  const getLevelsChartData = () => {
    const counts: Record<string, number> = {
      SIMPLE: 0,
      LOG: 0,
      INFO: 0,
      WARNING: 0,
      ERROR: 0,
      ALERT: 0,
    };

    logsList.forEach(log => {
      const lvl = String(log.level).toUpperCase();
      if (counts[lvl] !== undefined) {
        counts[lvl]++;
      } else {
        counts.LOG++;
      }
    });

    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key],
    }));
  };

  const chartData = getLevelsChartData();
  const totalLogsCount = logsList.length;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ALERT': return '#ef4444';   // red-500
      case 'ERROR': return '#b91c1c';   // red-700
      case 'WARNING': return '#f59e0b'; // amber-500
      case 'INFO': return '#10b981';    // emerald-500
      case 'LOG': return '#3b82f6';     // blue-500
      case 'SIMPLE': return '#64748b';  // slate-500
      default: return '#475569';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#d1d5db] font-sans selection:bg-emerald-500 selection:text-slate-950 flex flex-col" id="main_applet_root">
      
      {/* 1. Header Navigation matching "Elegant Dark" design structure */}
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-6 sm:px-8 bg-[#0d0d0f]" id="app_header_nav">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/30 rounded flex items-center justify-center">
            <div className="w-3 h-3 bg-emerald-500 rounded-sm animate-pulse"></div>
          </div>
          <span className="text-xl font-semibold tracking-tight text-white font-display">
            logging<span className="text-emerald-500">.js</span>
          </span>
          <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded bg-white/5 text-[10px] uppercase tracking-widest text-white/40 border border-white/10 font-mono">
            v1.4.2-stable
          </span>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-white/60">
          <button 
            onClick={() => setActiveTab('console')}
            className={`transition-colors font-mono ${activeTab === 'console' ? 'text-emerald-400' : 'hover:text-emerald-400'}`}
          >
            Playground
          </button>
          <button 
            onClick={() => setActiveTab('docs')}
            className={`transition-colors font-mono ${activeTab === 'docs' ? 'text-emerald-400' : 'hover:text-emerald-400'}`}
          >
            Concepts
          </button>
          <button 
            onClick={() => setActiveTab('architecture')}
            className={`transition-colors font-mono ${activeTab === 'architecture' ? 'text-emerald-400' : 'hover:text-emerald-400'}`}
          >
            Security
          </button>
        </div>
      </nav>

      {/* 2. Hero Header Container */}
      <div className="bg-[#0d0d0f]/40 border-b border-white/5 py-8 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight font-display">
              Secure Node.js Logging Engine
            </h1>
            <p className="text-sm sm:text-base text-white/50 leading-relaxed font-sans">
              An enterprise-grade, backend-only logging utility designed for pristine human readability and hardened DDoS/leaks protection.
            </p>
          </div>
          
          <div className="lg:w-fit bg-black border border-white/10 rounded-xl px-5 py-4 font-mono text-xs sm:text-sm self-start lg:self-center shadow-2xl">
            <div className="text-[10px] text-white/30 mb-1 leading-none uppercase tracking-widest font-black">
              SECURE WORKSPACE INSTALL
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-emerald-500 font-bold">$</span>
              <span className="text-white font-semibold">npm i <span className="text-emerald-400">./logging</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Global Features Grid Banner */}
      <section className="bg-black/20 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex gap-3.5 items-start">
            <div className="p-2 rounded bg-blue-500/10 text-blue-400 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-wider font-mono">Structured JSON Output</h4>
              <p className="text-xs text-white/40 leading-relaxed">Optimized out-of-the-box for Elasticsearch, Splunk, and BigQuery aggregations.</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex gap-3.5 items-start">
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-wider font-mono">Adaptive DDoS Shield</h4>
              <p className="text-xs text-white/40 leading-relaxed">Integrated real-time token bucket rate limiting stabilizes log system buffers.</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex gap-3.5 items-start">
            <div className="p-2 rounded bg-purple-500/10 text-purple-400 mt-0.5">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-wider font-mono">Static Type Safety</h4>
              <p className="text-xs text-white/40 leading-relaxed">Built-in TypeScript models prevent parameter configuration flaws.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Workspace container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full flex flex-col gap-8" id="workspace_main">
        
        {/* Tab 1: Interactive Console Dashboard */}
        {activeTab === 'console' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="console_grid">
            
            {/* Left side: Controlling Playground and Ingestion simulation */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Trigger log block card */}
              <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-5 flex flex-col gap-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2 text-white font-semibold font-display">
                    <Sliders className="w-4.5 h-4.5 text-emerald-400" />
                    <h2>Inject Testing Streams</h2>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 px-2.5 py-0.5 rounded border border-emerald-900/30">
                    PLAYGROUND
                  </span>
                </div>

                {/* Level selector buttons */}
                <div>
                  <label className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest block mb-2.5">
                    1. SELECT LOGGING LEVEL
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 font-mono">
                    {[
                      { level: 'SIMPLE', color: 'bg-[#141416] border-white/10 text-white/60' },
                      { level: 'LOG', color: 'bg-zinc-800/40 border-zinc-700/60 text-zinc-300' },
                      { level: 'INFO', color: 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300' },
                      { level: 'WARNING', color: 'bg-amber-950/30 border-amber-900/50 text-amber-300' },
                      { level: 'ERROR', color: 'bg-red-950/30 border-red-900/50 text-red-300' },
                      { level: 'ALERT', color: 'bg-rose-950/30 border-rose-900/50 text-rose-300' },
                    ].map((btn) => (
                      <button
                        key={btn.level}
                        onClick={() => {
                          setLogLevel(btn.level);
                          if (btn.level === 'SIMPLE') {
                            setLogMessage('Simple level message - minimalist properties only.');
                            setLogMetadata('');
                          } else if (btn.level === 'ERROR') {
                            setLogMessage('Database server connection timeout while querying transactions.');
                          }
                        }}
                        className={`py-2 px-1 text-[11px] font-bold rounded-lg border transition-all text-center cursor-pointer ${btn.color} ${
                          logLevel === btn.level 
                            ? 'ring-1 ring-emerald-500 scale-102 bg-white/5 text-white border-white' 
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {btn.level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest">
                    2. WRITE CUSTOM LOG MESSAGE
                  </label>
                  <input
                    type="text"
                    value={logMessage}
                    onChange={(e) => setLogMessage(e.target.value)}
                    placeholder="Enter string representation..."
                    className="w-full bg-black border border-white/10 rounded-xl px-3-5 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Metadata input */}
                {logLevel !== 'SIMPLE' && (
                  <div className="flex flex-col gap-1.5 transition-all">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest">
                        3. ADD OBJECT METADATA (JSON)
                      </label>
                      <span className="text-[9px] text-white/40 font-mono">
                        Valid fields parse JSON
                      </span>
                    </div>
                    <textarea
                      value={logMetadata}
                      onChange={(e) => setLogMetadata(e.target.value)}
                      rows={4}
                      className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder='{\n  "additionalMeta": "value"\n}'
                    />
                  </div>
                )}

                {/* Error configuration options */}
                {logLevel === 'ERROR' && (
                  <div className="flex items-center gap-2.5 bg-red-950/10 rounded-xl border border-red-900/30 p-3">
                    <input
                      type="checkbox"
                      id="simulateErrorCheckbox"
                      checked={simulateError}
                      onChange={(e) => setSimulateError(e.target.checked)}
                      className="accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="simulateErrorCheckbox" className="text-xs text-red-300 font-mono cursor-pointer select-none">
                      Simulate actual error stack trace inside library
                    </label>
                  </div>
                )}

                {/* Preset quick buttons */}
                <div className="bg-[#141416]/60 rounded-xl p-3 border border-white/5">
                  <span className="text-[10px] font-mono font-bold text-white/40 block mb-2 uppercase tracking-wider">
                    SECURITY PRESETS
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => applyPreset('sensitive')}
                      className="px-2 py-1 text-[10px] font-mono bg-[#1c1c1f] text-white/80 border border-white/5 rounded-md hover:bg-emerald-500/10 hover:text-emerald-400 transition-all cursor-pointer"
                    >
                      Sensitive Leak Leakage
                    </button>
                    <button
                      onClick={() => applyPreset('deep')}
                      className="px-2 py-1 text-[10px] font-mono bg-[#1c1c1f] text-white/80 border border-white/5 rounded-md hover:bg-emerald-500/10 hover:text-emerald-400 transition-all cursor-pointer"
                    >
                      Max Depth Stack limit
                    </button>
                    <button
                      onClick={() => applyPreset('standard')}
                      className="px-2 py-1 text-[10px] font-mono bg-[#1c1c1f] text-white/80 border border-white/5 rounded-md hover:bg-emerald-500/10 hover:text-emerald-400 transition-all cursor-pointer"
                    >
                      Alert System Payload
                    </button>
                    <button
                      onClick={() => applyPreset('simple')}
                      className="px-2 py-1 text-[10px] font-mono bg-[#1c1c1f] text-white/80 border border-white/5 rounded-md hover:bg-[#252528] transition-all cursor-pointer"
                    >
                      Simple level
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleEmitLog}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-550 active:scale-[0.99] text-white rounded-xl font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/30"
                >
                  <Play className="w-3.5 h-3.5 fill-white text-white" />
                  Emit Log with "logging" library
                </button>
              </div>

              {/* Dynamic Sensitive Keys Management Input Area */}
              <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2 text-white font-semibold font-display">
                    <ShieldAlert className="w-4.5 h-4.5 text-emerald-400" />
                    <h2>Real-time Redact List</h2>
                  </div>
                </div>

                <p className="text-xs text-white/50 leading-relaxed font-sans">
                  The logs pre-sanitizer recursive pipeline reads customized keys in real-time. Any value associated to keys matching this set are immediately scrubbed to <code className="text-emerald-400">[REDACTED]</code>.
                </p>

                {/* Submitting form to add custom keys */}
                <form onSubmit={handleAddSensitiveKey} className="flex gap-2">
                  <input
                    type="text"
                    value={newSensitiveKey}
                    onChange={(e) => setNewSensitiveKey(e.target.value)}
                    placeholder="Enter key to redact... (e.g., telephone)"
                    className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-[#1c1c1f] hover:bg-emerald-500 hover:text-black hover:border-emerald-400 text-white border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </form>

                {/* Dynamic tag displays */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest">
                    ACTIVE SENSITIVE DICTIONARY:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto bg-black/40 border border-white/5 p-2 rounded-xl">
                    {sensitiveKeys.length === 0 ? (
                      <span className="text-[10px] text-white/30 font-mono italic">No keys fetched.</span>
                    ) : (
                      sensitiveKeys.map((key) => (
                        <span 
                          key={key} 
                          className="px-2 py-0.5 text-[10px] font-mono bg-white/5 text-emerald-400 rounded-md border border-white/10 flex items-center"
                        >
                          {key}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Rate limiter / DDoS protection tester card */}
              <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2 text-white font-semibold font-display">
                    <Flame className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                    <h2>DDoS Attack Prevention</h2>
                  </div>
                </div>

                <p className="text-xs text-white/50 leading-relaxed font-sans">
                  Built-in rate-limiting and rotating structures shield production servers from getting storage space or RAM hogged by intentional log stress attacks.
                </p>

                <div className="bg-black/50 rounded-xl p-3 border border-white/5 text-center flex flex-col gap-2">
                  <div className="flex justify-between text-[11px] font-mono text-white/40">
                    <span>Limit Config:</span>
                    <span className="text-yellow-400">5 logs/sec max (10 burst capacity)</span>
                  </div>
                  <button
                    onClick={handleDdosSimulation}
                    disabled={isDdosTesting}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-550 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-mono text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                  >
                    <Activity className={`w-3.5 h-3.5 ${isDdosTesting ? 'animate-spin' : ''}`} />
                    {isDdosTesting ? 'Flooding Server...' : 'Trigger Flood Simulation (50 logs)'}
                  </button>
                </div>

                {/* Attack Simulator progress / analytical metrics layout */}
                {ddosResults && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#141416] border border-white/5 rounded-xl p-3 flex flex-col gap-2.5 font-mono text-xs"
                  >
                    <div className="text-[10px] font-semibold text-white/60 border-b border-white/5 pb-1.5 flex justify-between">
                      <span>DDoS MITIGATION LOGS REPORT</span>
                      <span className="text-emerald-400 font-bold">PASSED</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="bg-black/40 p-2 rounded border border-white/5">
                        <div className="text-white/30 text-[8px] mb-0.5">DISPATCHED</div>
                        <span className="text-white font-bold">{ddosResults.sent}</span>
                      </div>
                      <div className="bg-emerald-950/10 p-2 rounded border border-emerald-900/10">
                        <div className="text-emerald-500 text-[8px] mb-0.5">PERSISTED</div>
                        <span className="text-emerald-400 font-bold">{ddosResults.allowed}</span>
                      </div>
                      <div className="bg-red-950/10 p-2 rounded border border-red-900/10 font-bold">
                        <div className="text-red-500 text-[8px] mb-0.5">REJECTED</div>
                        <span className="text-red-400">{ddosResults.throttled}</span>
                      </div>
                    </div>

                    <p className="text-[9.5px] text-white/40 leading-normal">
                      <span className="text-amber-400 font-bold font-mono">Mitigation Insight:</span> 40 of 50 flood logs were instantly dropped at ingestion level to protect system resources.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Right side: Realtime streams and Recharts dashboard visualization */}
            <div className="lg:col-span-7 flex flex-col gap-6">

              {/* Recharts Analytics Distribution Dashboard */}
              <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-5 flex flex-col shadow-2xl gap-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold font-display text-white">Log Severity Distribution (Last 100 entries)</h3>
                  </div>
                  <span className="text-[10px] font-mono text-white/40 bg-[#1c1c1f] px-2 py-0.5 rounded border border-white/5">
                    RECHARTS DIAGRAM
                  </span>
                </div>

                <div className="h-44 w-full" id="recharts_container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis 
                        dataKey="name" 
                        stroke="#afafaf" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#afafaf" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false} 
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0d0d0f', borderColor: '#333', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                        labelStyle={{ color: '#888', fontSize: '10px' }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getLevelColor(entry.name)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-6 gap-1 sm:gap-2 text-center text-[10px] bg-black/30 p-2.5 rounded-xl border border-white/5 font-mono">
                  {chartData.map((item) => (
                    <div key={item.name} className="flex flex-col">
                      <span className="text-[8.5px] opacity-40 font-bold truncate">{item.name}</span>
                      <span className="text-xs font-extrabold" style={{ color: getLevelColor(item.name) }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Terminal Logs Listing card */}
              <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl flex-1 flex flex-col shadow-2xl overflow-hidden min-h-[500px]">
                
                {/* Console header */}
                <div className="bg-[#0d0d0f]/80 border-b border-white/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-xs sm:text-sm font-semibold font-mono tracking-wide text-white">
                      system.log (JSON entries)
                    </h2>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleDownloadLogs}
                      className="p-1.5 bg-[#141416] hover:bg-emerald-500 hover:text-[#0a0a0b] text-white border border-white/10 rounded-lg text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
                      title="Download clean logs JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Export JSON</span>
                    </button>
                    <button
                      onClick={() => setIsPolling(!isPolling)}
                      className={`p-1.5 rounded-lg border text-xs font-mono flex items-center gap-1 transition-all cursor-pointer ${
                        isPolling 
                          ? 'bg-emerald-950/20 border-emerald-800/80 text-emerald-400 hover:bg-emerald-950/40' 
                          : 'bg-black border-white/10 text-white/50 hover:text-white'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin' : ''}`} />
                      {isPolling ? 'Live Feed' : 'Paused'}
                    </button>
                    <button
                      onClick={handleClearLogs}
                      disabled={isWiping}
                      className="p-1.5 bg-black hover:bg-red-950/20 hover:text-red-400 border border-white/10 rounded-lg text-xs font-mono flex items-center gap-1 transition-all text-white/60 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  </div>
                </div>

                {/* Filters container */}
                <div className="bg-black/55 border-b border-white/5 px-5 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
                  <div className="flex-1 flex items-center bg-[#0d0d0f] border border-white/5 rounded-lg px-2.5 py-1.5">
                    <span className="text-white/30 mr-2 text-[10px] tracking-wider uppercase font-bold">grep:</span>
                    <input
                      type="text"
                      className="w-full bg-transparent border-none text-white text-xs focus:outline-none placeholder-white/20"
                      placeholder="Filter records message content..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 tracking-wider font-bold">FILTER:</span>
                    <select
                      className="bg-[#0d0d0f] border border-white/10 rounded-lg py-1 px-2 text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                      value={levelFilter}
                      onChange={(e) => setLevelFilter(e.target.value)}
                    >
                      <option value="ALL">ALL LEVELS</option>
                      <option value="SIMPLE">SIMPLE</option>
                      <option value="LOG">LOG</option>
                      <option value="INFO">INFO</option>
                      <option value="WARNING">WARNING</option>
                      <option value="ERROR">ERROR</option>
                      <option value="ALERT">ALERT</option>
                    </select>
                  </div>
                </div>

                {/* Console Terminal Log Box */}
                <div className="flex-1 bg-black/40 p-4 sm:p-5 overflow-y-auto font-mono text-[11px] sm:text-xs leading-relaxed flex flex-col gap-3.5 max-h-[580px]">
                  {filteredLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[#d1d5db]/30 gap-2 py-12 text-center">
                      <Terminal className="w-8 h-8 text-white/10 animate-pulse" />
                      <p>Terminal output buffer stream empty.</p>
                      <p className="text-[10px]">Emit a log payload dynamically to inspect matching outputs.</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {filteredLogs.map((log, index) => {
                        let levelClass = 'text-white/80 bg-white/[0.01] border-white/5';
                        if (log.level === 'ALERT') levelClass = 'text-rose-200 bg-rose-950/10 border-rose-900/30';
                        if (log.level === 'ERROR') levelClass = 'text-red-300 bg-red-950/10 border-red-900/30';
                        if (log.level === 'WARNING') levelClass = 'text-amber-300 bg-amber-950/10 border-amber-900/30';
                        if (log.level === 'INFO') levelClass = 'text-emerald-300 bg-emerald-950/10 border-emerald-900/30';
                        if (log.level === 'SIMPLE') levelClass = 'text-white/40 bg-white/[0.01] border-white/5';

                        return (
                          <motion.div
                            key={`${log.timestamp}-${index}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`border rounded-xl p-3 flex flex-col gap-2 ${levelClass}`}
                          >
                            <div className="flex items-center justify-between text-[10px] opacity-80 border-b border-white/5 pb-1">
                              <span className="flex items-center gap-1">
                                <span className={`px-1.5 py-0.5 rounded font-black tracking-wider text-[8px] sm:text-[9px] uppercase ${
                                  log.level === 'ALERT' || log.level === 'ERROR' ? 'bg-red-900 text-white' : 'bg-black/40 text-emerald-400 border border-white/5'
                                }`}>
                                  {log.level}
                                </span>
                                <span className="text-white/20">|</span>
                                <span className="opacity-60">{new Date(log.timestamp).toLocaleTimeString()}</span>
                              </span>
                              <span className="opacity-45 font-mono text-[9px]">system.log</span>
                            </div>

                            <p className="font-semibold text-white select-all text-xs">{log.message}</p>

                            {/* Metadata visualization */}
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="bg-black border border-white/5 rounded-lg p-2.5 text-[10px]">
                                <div className="text-[8px] text-white/30 uppercase tracking-widest font-black mb-1">
                                  SANITIZED META DATA:
                                </div>
                                <pre className="text-emerald-400 overflow-x-auto select-all leading-relaxed whitespace-pre-wrap">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Error payload */}
                            {log.error && (
                              <div className="bg-red-950/10 rounded-lg p-2.5 border border-red-900/20 text-[10px]">
                                <div className="text-[8px] text-red-400 uppercase tracking-widest font-black mb-1">
                                  RUNTIME EXCEPTION DETAILS:
                                </div>
                                <p className="text-red-200 font-bold mb-1">{log.error.name}: {log.error.message}</p>
                                {log.error.stack && (
                                  <pre className="text-red-400/80 overflow-x-auto font-mono text-[9px] leading-snug">
                                    {log.error.stack}
                                  </pre>
                                )}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>

                {/* Terminal status bar */}
                <div className="bg-black/90 border-t border-white/5 px-5 py-3 text-xs font-mono text-white/30 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Applet state: {statusFeedback}</span>
                  </div>
                  <div>
                    <span>{filteredLogs.length} matching inputs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Quick integration manual */}
        {activeTab === 'docs' && (
          <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col gap-6 font-sans" id="docs_layout">
            <div className="border-b border-white/5 pb-4">
              <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2 font-display">
                <Code className="w-5 h-5 text-emerald-400" />
                Logging Library Quick Manual
              </h2>
              <p className="text-xs text-white/40">Developer instructions for connecting backend operations seamlessly.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest font-mono">1. Bootstrapping configurations</h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  Import the centralized <code className="text-emerald-400 font-mono">LogManager</code> and call <code className="text-emerald-400 font-mono">getLogger('root')</code> to fetch an isolated interface matching enterprise standards.
                </p>
                <div className="bg-black p-4 rounded-xl border border-white/5">
                  <pre className="text-[10px] text-white/60 font-mono overflow-x-auto leading-normal">
{`import { LogManager, LogLevel } from 'logging';

// 1. Get LogManager Singleton instance
const manager = LogManager.getInstance();

// 2. Obtain named secure loggers (creates maps dynamically)
const gatewayLogger = manager.getLogger('gateway');
const dbLogger = manager.getLogger('database');`}
                  </pre>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest font-mono">2. Structured logging level routines</h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  All logging commands are purely asynchronous, matching non-blocking filesystem pools safely.
                </p>
                <div className="bg-black p-4 rounded-xl border border-white/5">
                  <pre className="text-[10px] text-white/60 font-mono overflow-x-auto leading-normal">
{`// 1. LOG
gatewayLogger.log("Incoming query checkout transaction limit.", { userId: 44 });

// 2. ALERTS (Support personnel pager triggers)
dbLogger.alert("Primary database replica pool is empty!");

// 3. INFO
dbLogger.info("Database pools initialized successfully.");

// 4. WARNING
gatewayLogger.warning("Latency limits breached config threshold.");

// 5. ERROR (Sanitizes stack structures)
try {
  throw new Error("Connection failed");
} catch(e) {
  dbLogger.error("Query failed.", e);
}

// 6. SIMPLE (Plain minimalist log string)
gatewayLogger.simple("Heartbeat check successful.");`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="bg-black/50 p-5 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center gap-4 mt-2">
              <div className="p-3 bg-emerald-950/20 text-emerald-400 rounded-xl border border-emerald-900/20">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-grow text-center sm:text-left">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-0.5 font-mono">Hardened Supply-chain Isolation</h4>
                <p className="text-xs text-white/40 leading-relaxed">
                  The package enforces zero external dependency files, operating solely via native modules (<code className="text-emerald-300 font-mono">fs</code>, <code className="text-emerald-300 font-mono">path</code>). This guarantees high resistance to common prototype leaks or upstream dependency hijack attempts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Security & Folder Architecture blueprints */}
        {activeTab === 'architecture' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans" id="architecture_layout">
            
            {/* Architecture directory tree */}
            <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                  <Code className="w-4.5 h-4.5 text-emerald-400" />
                  Source Code Inventory
                </h3>
                <p className="text-xs text-white/40">Clean, strict namespace decoupling matches target benchmarks.</p>
              </div>

              <div className="bg-black p-4 rounded-xl border border-white/5 font-mono text-[11px] text-white/70 flex flex-col gap-4 overflow-x-auto leading-normal">
                <div className="flex items-center gap-1.5 text-[9px] text-[#afafaf] opacity-40 border-b border-white/5 pb-2 font-bold tracking-widest uppercase">
                  <Hash className="w-3.5 h-3.5" />
                  <span>STRUCTURE</span>
                </div>
                
                <pre className="text-white/60 font-mono">
{`logging/
├── index.ts               # Main Entry Boundary Exports
├── package.json           # Registry Configuration specifications
├── README.md              # Installation details Manual
├── types/
│   └── index.ts           # LogLevel & Schema interfaces
├── utilities/
│   └── formatter.ts       # Structured JSON stringifiers
├── helpers/
│   ├── sanitizer.ts       # Redactors & Circular analyzers
│   └── validator.ts       # String caps & injection checks
├── core_logic/
│   ├── logger.ts          # Filesystem streaming & level routing
│   └── rate_limiter.ts    # Token-Bucket DDoS controller
└── business_logic/
    └── manager.ts         # Named Domain Controller orchestrator`}
                </pre>
              </div>

              <div className="flex flex-col gap-2 bg-black/40 p-4 rounded-xl border border-white/5">
                <h4 className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">File Responsibilities</h4>
                <p className="text-xs text-white/40 leading-relaxed font-sans">
                  Each directory enforces rigid logic isolation. Log formatting occurs statically inside formatting utilities, credentials removal inside sanitizer helper algorithms, and rate filtering strictly inside core engine blocks.
                </p>
              </div>
            </div>

            {/* In-depth Security Features explanation */}
            <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
                  DDoS & Data Leak Protective Shield
                </h3>
                <p className="text-xs text-white/40">Built-in hardening mechanics to safeguard system reliability.</p>
              </div>

              <div className="flex flex-col gap-5">
                
                {/* Security Feature 1 */}
                <div className="flex gap-3">
                  <div className="p-2 bg-red-950/20 text-red-400 rounded-lg h-fit border border-red-900/20 mt-0.5">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-0.5 font-mono">Token Bucket Controller</h4>
                    <p className="text-xs text-white/40 leading-relaxed font-sans">
                      Dampens deep log stress requests. In cases where clients trigger errors repeatedly, the pipeline instantly slows disk I/O stream requests down, substituting plain text logs with light metadata alerts.
                    </p>
                  </div>
                </div>

                {/* Security Feature 2 */}
                <div className="flex gap-3">
                  <div className="p-2 bg-emerald-950/20 text-emerald-400 rounded-lg h-fit border border-emerald-900/20 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-0.5 font-mono font-mono">Sanitized Data Obfuscator</h4>
                    <p className="text-xs text-[#afafaf] opacity-60 leading-relaxed font-sans">
                      Understands and sanitizes credentials, passwords, authorizations, cookies, or secrets recursively. High-performance string algorithms guarantee sensitive parameters are omitted safely before writing to disk.
                    </p>
                  </div>
                </div>

                {/* Security Feature 3 */}
                <div className="flex gap-3">
                  <div className="p-2 bg-amber-950/20 text-amber-500 rounded-lg h-fit border border-amber-900/20 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-0.5 font-mono">Recursive Reference Locks</h4>
                    <p className="text-xs text-white/40 leading-relaxed font-sans">
                      Standard JSON conversion crashes raw servers if nested objects reference their parent parameters recursively. This package logs references safely without interrupting key processing routines.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
