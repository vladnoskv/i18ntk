const colors = require('./colors-new');
const { envManager } = require('./env-manager');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const DEFAULT_INTERNAL_PREFIXES = ['[BUILD]', '[WORKERS]', '[I18N]', '[SECURITY]', '[SUCCESS]', '[WARN]', '[ERROR]', '[INFO]', '[DEBUG]'];
const FIRST_ERROR_CONTEXT = new Map();

function asBoolean(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function resolveLevel() {
  const debugMode = envManager.getBoolean('DEBUG_MODE');
  const configured = String(envManager.get('I18NTK_LOG_LEVEL') || '').trim().toLowerCase();
  if (configured && Object.prototype.hasOwnProperty.call(LEVELS, configured)) {
    return configured;
  }

  if (debugMode) {
    return 'debug';
  }

  // Silent-by-default in production-like builds.
  if (envManager.get('NODE_ENV') === 'production' || envManager.getBoolean('CI')) {
    return 'error';
  }

  return 'warn';
}

function shouldLog(level) {
  const active = resolveLevel();
  return LEVELS[level] <= LEVELS[active];
}

function normalizePrefix(prefix, fallback) {
  const value = String(prefix || fallback || '[INFO]').trim();
  if (/^\[[^\]]+\]$/.test(value)) {
    return value;
  }
  return `[${value.replace(/^[\[]|[\]]$/g, '').toUpperCase()}]`;
}

function write(level, message, options = {}) {
  if (!shouldLog(level)) return;

  const jsonMode = envManager.getBoolean('JSON_LOG');
  const prefix = normalizePrefix(options.prefix, `[${level.toUpperCase()}]`);
  const details = options.details && typeof options.details === 'object' ? options.details : undefined;
  const text = String(message || '').trim();

  if (jsonMode) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      prefix,
      message: text,
      ...(details ? { details } : {})
    };
    const line = JSON.stringify(payload);
    if (level === 'error' || level === 'warn') {
      process.stderr.write(`${line}\n`);
    } else {
      process.stdout.write(`${line}\n`);
    }
    return;
  }

  const line = `${prefix}  ${text}`;
  if (level === 'error') {
    process.stderr.write(`${colors.red(line)}\n`);
    return;
  }
  if (level === 'warn') {
    process.stderr.write(`${colors.yellow(line)}\n`);
    return;
  }
  if (level === 'debug') {
    process.stdout.write(`${colors.gray(line)}\n`);
    return;
  }

  process.stdout.write(`${line}\n`);
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return 'instant';
  if (ms < 50) return 'instant';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m${seconds}s`;
}

function recordFirstError(key, context) {
  if (!key || FIRST_ERROR_CONTEXT.has(key)) {
    return;
  }

  FIRST_ERROR_CONTEXT.set(key, {
    timestamp: new Date().toISOString(),
    ...context
  });
}

function getFirstErrorContext(key) {
  return FIRST_ERROR_CONTEXT.get(key) || null;
}

function flushErrorContexts() {
  const entries = Array.from(FIRST_ERROR_CONTEXT.entries()).map(([key, value]) => ({ key, ...value }));
  FIRST_ERROR_CONTEXT.clear();
  return entries;
}

function emitErrorContextSummary({ force = false } = {}) {
  const contexts = Array.from(FIRST_ERROR_CONTEXT.entries());
  if (!contexts.length) return;
  if (!force && !envManager.getBoolean('DEBUG_MODE')) return;

  for (const [key, context] of contexts) {
    write('debug', `First error context (${key})`, { prefix: '[ERROR]', details: context });
  }
}

function logMissingTranslationKey(key, fallback = 'Configuration error') {
  write('warn', `Missing key: ${key} (fallback: '${fallback}')`, { prefix: '[I18N]' });
}

function createBuildProgressReporter(totalPages) {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  let lastBucket = 0;

  return {
    update(completedPages) {
      const completed = Math.max(0, Math.min(safeTotal, Number(completedPages) || 0));
      const percent = Math.floor((completed / safeTotal) * 100);
      const bucket = Math.floor(percent / 10) * 10;
      if (bucket <= lastBucket || bucket === 0) return;
      lastBucket = bucket;

      const pct = `${String(bucket).padStart(3, ' ')}%`;
      write('info', `${pct} (${completed}/${safeTotal} pages)`, { prefix: '[BUILD]' });
    }
  };
}

function buildSuccessSummary({ durationMs, pages, warnings = 0 }) {
  const duration = formatDuration(durationMs);
  write('info', `Build completed in ${duration} (${pages} pages, ${warnings} warnings)`, { prefix: '[SUCCESS]' });
}

function createWorkerPoolMonitor(activeWorkers = 0) {
  const startedAt = Date.now();
  let tasks = 0;
  let totalTaskDurationMs = 0;
  let workers = Math.max(0, Number(activeWorkers) || 0);

  return {
    setActive(count) {
      workers = Math.max(0, Number(count) || 0);
    },
    recordTask(durationMs) {
      tasks += 1;
      totalTaskDurationMs += Math.max(0, Number(durationMs) || 0);
    },
    report() {
      const avg = tasks > 0 ? (totalTaskDurationMs / tasks) / 1000 : 0;
      write('info', `${workers} active (avg ${avg.toFixed(1)}s/task)`, { prefix: '[WORKERS]' });
      return {
        workers,
        tasks,
        avgSecondsPerTask: Number(avg.toFixed(2)),
        elapsed: formatDuration(Date.now() - startedAt)
      };
    }
  };
}

const logger = {
  log(message, color = null) {
    const output = typeof color === 'function' ? color(String(message)) : String(message);
    write('info', output, { prefix: '[INFO]' });
  },
  info(message, details) {
    write('info', String(message), { prefix: '[INFO]', details });
  },
  warn(message, details) {
    write('warn', String(message), { prefix: '[WARN]', details });
  },
  error(message, details) {
    write('error', String(message), { prefix: '[ERROR]', details });
  },
  debug(message, details) {
    write('debug', String(message), { prefix: '[DEBUG]', details });
  },
  success(message, details) {
    write('info', String(message), { prefix: '[SUCCESS]', details });
  },
  security(level, message, details) {
    write(level, String(message), { prefix: '[SECURITY]', details });
  },
  build(message, details) {
    write('info', String(message), { prefix: '[BUILD]', details });
  },
  isDebugMode() {
    return envManager.getBoolean('DEBUG_MODE') || resolveLevel() === 'debug';
  },
  shouldLog,
  formatDuration,
  recordFirstError,
  getFirstErrorContext,
  flushErrorContexts,
  emitErrorContextSummary,
  buildSuccessSummary,
  logMissingTranslationKey,
  createBuildProgressReporter,
  createWorkerPoolMonitor,
  // Keep compatibility for callers that rely on known prefixes.
  KNOWN_PREFIXES: DEFAULT_INTERNAL_PREFIXES
};

module.exports = {
  colors,
  logger,
  formatDuration,
  createBuildProgressReporter,
  createWorkerPoolMonitor,
  recordFirstError,
  getFirstErrorContext,
  flushErrorContexts,
  emitErrorContextSummary
};
