const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const crypto = require('crypto');
const SecurityUtils = require('./security');

const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_MAX_DIRECTORIES = 50;

function sha256File(filePath) {
  try {
    const content = SecurityUtils.safeReadFileSync(filePath, path.dirname(filePath));
    if (content === null || content === undefined) return null;
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (_) {
    return null;
  }
}

function watchDirectory(dir, emitter, watchers, options = {}) {
  const {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    hashTracking = true,
    watchState = { count: 0, maxDirectories: DEFAULT_MAX_DIRECTORIES }
  } = options;

  if (!SecurityUtils.safeExistsSync(dir, path.dirname(dir))) return;
  if (watchState.count >= watchState.maxDirectories) {
    emitter.emit('error', new Error(`Maximum watched directories (${watchState.maxDirectories}) exceeded`));
    return;
  }

  const fileHashes = new Map();
  const debounceTimers = new Map();

  if (hashTracking) {
    try {
      const items = SecurityUtils.safeReaddirSync(dir, path.dirname(dir), { withFileTypes: true });
      if (items) {
        for (const entry of items) {
          if (entry.isFile() && entry.name.endsWith('.json')) {
            const fullPath = path.join(dir, entry.name);
            const h = sha256File(fullPath);
            if (h) fileHashes.set(fullPath, h);
          }
        }
      }
    } catch (_) { /* initial read may fail */ }
  }

  let watcher;
  try {
    watcher = fs.watch(dir, (event, filename) => {
      if (!filename || !filename.endsWith('.json')) return;

      const fullPath = path.join(dir, filename);
      const validated = SecurityUtils.validatePath(fullPath, path.dirname(dir));
      if (!validated) return;

      if (debounceTimers.has(fullPath)) {
        clearTimeout(debounceTimers.get(fullPath));
      }

      debounceTimers.set(fullPath, setTimeout(() => {
        debounceTimers.delete(fullPath);

        try {
          if (event === 'rename') {
            if (SecurityUtils.safeExistsSync(fullPath, path.dirname(fullPath))) {
              if (hashTracking) {
                const h = sha256File(fullPath);
                if (h) fileHashes.set(fullPath, h);
              }
              emitter.emit('add', fullPath);
            } else {
              fileHashes.delete(fullPath);
              emitter.emit('unlink', fullPath);
            }
          } else if (event === 'change') {
            if (hashTracking) {
              const newHash = sha256File(fullPath);
              const oldHash = fileHashes.get(fullPath);
              if (newHash && newHash === oldHash) return;
              if (newHash) fileHashes.set(fullPath, newHash);
            }
            emitter.emit('change', fullPath);
          }
        } catch (err) {
          emitter.emit('error', err);
        }
      }, debounceMs));
    });

    watcher.on('error', (err) => {
      emitter.emit('error', err);
    });
  } catch (err) {
    emitter.emit('error', err);
    return;
  }

  watchers.push({ watcher, path: dir, debounceTimers });
  watchState.count++;

  try {
    const items = SecurityUtils.safeReaddirSync(dir, path.dirname(dir), { withFileTypes: true });
    if (items) {
      for (const entry of items) {
        if (entry.isDirectory()) {
          watchDirectory(path.join(dir, entry.name), emitter, watchers, options);
        }
      }
    }
  } catch (_) {
    // Cannot read directory contents
  }
}

function watchLocales(dirs, onChange, options = {}) {
  const directories = Array.isArray(dirs) ? dirs : [dirs];
  const emitter = new EventEmitter();
  emitter.on('error', () => {});
  const watchers = [];

  // Backward-compatible onChange callback
  if (typeof onChange === 'function') {
    emitter.on('change', onChange);
    emitter.on('add', onChange);
    emitter.on('unlink', onChange);
  } else if (typeof onChange === 'object' && onChange !== null && typeof onChange.onChange === 'function') {
    emitter.on('change', onChange.onChange);
    emitter.on('add', onChange.onChange);
    emitter.on('unlink', onChange.onChange);
  }

  const {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    hashTracking = true,
    maxDirectories = DEFAULT_MAX_DIRECTORIES
  } = (typeof onChange === 'object' && onChange !== null) ? onChange : options;

  const watchState = { count: 0, maxDirectories };
  for (const d of directories) {
    if (watchState.count >= watchState.maxDirectories) {
      emitter.emit('error', new Error(`Maximum watched directories (${watchState.maxDirectories}) exceeded`));
      break;
    }

    const resolved = path.resolve(d);
    const validated = SecurityUtils.validatePath(resolved, path.dirname(resolved));
    if (!validated) {
      emitter.emit('error', new Error(`Path validation failed for: ${d}`));
      continue;
    }

    watchDirectory(validated, emitter, watchers, { debounceMs, hashTracking, watchState });
  }

  const stop = () => {
    for (const entry of watchers) {
      if (entry.debounceTimers) {
        for (const timer of entry.debounceTimers.values()) {
          clearTimeout(timer);
        }
        entry.debounceTimers.clear();
      }
      try { entry.watcher.close(); } catch (_) { /* ignore */ }
    }
    watchers.length = 0;
    emitter.removeAllListeners();
  };

  stop.stop = stop;
  stop.emitter = emitter;
  stop.on = emitter.on.bind(emitter);
  stop.once = emitter.once.bind(emitter);
  stop.off = emitter.off ? emitter.off.bind(emitter) : emitter.removeListener.bind(emitter);
  stop.emit = emitter.emit.bind(emitter);
  stop.removeListener = emitter.removeListener.bind(emitter);
  stop.removeAllListeners = emitter.removeAllListeners.bind(emitter);
  stop.getWatchedPaths = () => watchers.map(w => w.path);
  stop.getDebounceMs = () => debounceMs;

  return stop;
}

module.exports = watchLocales;
