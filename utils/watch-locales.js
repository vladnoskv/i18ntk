const fs = require('fs');  try {
    const entries = SecurityUtils.safeReaddirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
      if (entry.isDirectory()) {
        watchDirectory(path.join(dir, entry.name), callback, watchers);
      }
    });
  } catch (error) {
    console.error(`Failed to read directory ${dir}: ${error.message}`);
  }const path = require('path');

function watchDirectory(dir, callback, watchers) {
const fs = require('fs');
const path = require('path');
const SecurityUtils = require('./security');  const watcher = fs.watch(dir, (event, filename) => {
    if (filename && filename.endsWith('.json')) {
      callback(path.join(dir, filename));
    }
  });
  watchers.push(watcher);

  SecurityUtils.safeReaddirSync(dir, { withFileTypes: true }).forEach(entry => {
    if (entry.isDirectory()) {
      watchDirectory(path.join(dir, entry.name), callback, watchers);
    }
  });
}

function watchLocales(dirs, onChange) {
  const directories = Array.isArray(dirs) ? dirs : [dirs];
  const watchers = [];
  directories.forEach(d => watchDirectory(path.resolve(d), onChange, watchers));
  console.log(`Watching for changes in: ${directories.join(', ')}`);
  return () => watchers.forEach(w => w.close());
}

module.exports = watchLocales;