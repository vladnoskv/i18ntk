const fs = require('fs');
const path = require('path');
const SecurityUtils = require('./security');

function watchDirectory(dir, callback, watchers) {
  if (!SecurityUtils.safeExistsSync(dir, path.dirname(dir))) return;
  const watcher = fs.watch(dir, (event, filename) => {
    if (filename && filename.endsWith('.json')) {
      callback(path.join(dir, filename));
    }
  });
  watchers.push(watcher);

  try {
    const items = SecurityUtils.safeReaddirSync(dir, path.dirname(dir), { withFileTypes: true });
    if (items) {
      items.forEach(entry => {
        if (entry.isDirectory()) {
          watchDirectory(path.join(dir, entry.name), callback, watchers);
        }
      });
    }
  } catch (_) {
    // Cannot read directory contents
  }
}

function watchLocales(dirs, onChange) {
  const directories = Array.isArray(dirs) ? dirs : [dirs];
  const watchers = [];
  directories.forEach(d => watchDirectory(path.resolve(d), onChange, watchers));
  console.log(`Watching for changes in: ${directories.join(', ')}`);
  return () => watchers.forEach(w => w.close());
}

module.exports = watchLocales;