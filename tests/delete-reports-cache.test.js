const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, test } = require('node:test');

const I18nManager = require('../main/manage');

describe('delete reports cache cleanup', () => {
  test('getAllReportFiles can include all files for cache directories', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-cache-clean-'));

    try {
      const cacheDir = path.join(tempRoot, '.cache');
      const nestedDir = path.join(cacheDir, 'nested');
      fs.mkdirSync(nestedDir, { recursive: true });
      fs.writeFileSync(path.join(cacheDir, 'state.bin'), 'cache', 'utf8');
      fs.writeFileSync(path.join(nestedDir, 'entry'), 'cache', 'utf8');

      const manager = new I18nManager();
      const files = manager.getAllReportFiles(cacheDir, cacheDir, { includeAllFiles: true })
        .map((file) => path.relative(cacheDir, file).replace(/\\/g, '/'))
        .sort();

      assert.deepStrictEqual(files, ['nested/entry', 'state.bin']);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
