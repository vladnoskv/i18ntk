const fs = require('fs');
const path = require('path');

function watchDirectory(dir, callback, watchers) {
  if (!fs.existsSync(dir)) return;
  const watcher = fs.watch(dir, (event, filename) => {
    if (filename && filename.endsWith('.json')) {
      callback(path.join(dir, filename));
    }
  });
  watchers.push(watcher);

  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
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