const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, test } = require('node:test');

const watchLocales = require('../utils/watch-locales');

describe('watchLocales return API', () => {
  test('returned watcher is callable and exposes EventEmitter methods', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-watch-api-'));

    try {
      const watcher = watchLocales(tempRoot, () => {});

      assert.strictEqual(typeof watcher, 'function');
      assert.strictEqual(typeof watcher.stop, 'function');
      assert.strictEqual(typeof watcher.on, 'function');
      assert.strictEqual(typeof watcher.once, 'function');
      assert.deepStrictEqual(watcher.getWatchedPaths(), [path.resolve(tempRoot)]);

      watcher();
      assert.deepStrictEqual(watcher.getWatchedPaths(), []);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('maxDirectories caps recursive watchers', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-watch-cap-'));

    try {
      fs.mkdirSync(path.join(tempRoot, 'a', 'b', 'c'), { recursive: true });

      const watcher = watchLocales(tempRoot, { maxDirectories: 2 });

      assert.strictEqual(watcher.getWatchedPaths().length, 2);
      watcher.stop();
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
