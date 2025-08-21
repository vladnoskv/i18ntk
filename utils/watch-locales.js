const path = require('path');
const fs = require('fs');
const SecurityUtils = require('./security');

function isPathInside(childPath, parentPath) {
  const relative = path.relative(parentPath, childPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

function watchDirectory(dir, callback, watchers, baseRoot) {
  const root = baseRoot || dir;
  const watcher = SecurityUtils.safeWatch(dir, (event, filename) => {
    // Normalize and validate target path before use
    const full = filename ? path.resolve(dir, String(filename)) : null;
    if (!full) return;
    // Resolve symlinks; ensure the real target remains within root
    let real = full;
    try {
      real = SecurityUtils.safeRealpathSync
        ? SecurityUtils.safeRealpathSync(full)
        : fs.realpathSync.native(full);
    } catch (_) {
      // File may have been created/removed rapidly; ignore and let future events handle it
    }
    if (path.extname(real).toLowerCase() === '.json' && isPathInside(real, root)) {
      try {
        callback(real);
      } catch (err) {
        console.error('watchLocales callback error:', err && err.message ? err.message : err);
      }
    }
   });
  
  if (watcher) {
    watchers.push(watcher);
  }

  try {
    const entries = SecurityUtils.safeReaddirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
      if (entry.isDirectory()) {
        watchDirectory(path.join(dir, entry.name), callback, watchers, root);
      }
    });
  } catch (error) {
    console.error(`Failed to read directory ${dir}: ${error.message}`);
  }
}

function watchLocales(dirs, onChange) {
  const directories = (Array.isArray(dirs) ? dirs : [dirs]).filter(Boolean);
  const resolved = directories.map(d => path.resolve(d));
  const unique = Array.from(new Set(resolved));
  const watchers = [];
  unique.forEach(d => watchDirectory(d, onChange, watchers, d));
  console.log(`Watching for changes in: ${unique.join(', ')}`);
  return () => {
    for (const w of watchers) {
      try { w.close(); } catch (_) { /* no-op */ }
    }
    watchers.length = 0; // idempotent
  };
}

// Back-compat: default export is the function, also expose named export.
module.exports = Object.assign(watchLocales, { watchLocales });