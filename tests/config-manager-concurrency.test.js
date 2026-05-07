const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { describe, test } = require('node:test');

function loadFreshConfigManager() {
  const modulePath = require.resolve('../utils/config-manager');
  delete require.cache[modulePath];
  return require('../utils/config-manager');
}

describe('config-manager concurrency', () => {
  test('saveConfig handles concurrent writes without ENOENT races', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-save-race-'));
    const originalCwd = process.cwd();
    const originalAutosave = process.env.I18NTK_DISABLE_AUTOSAVE;

    try {
      process.chdir(tempRoot);
      delete process.env.I18NTK_DISABLE_AUTOSAVE;

      const configManager = loadFreshConfigManager();
      const base = configManager.loadConfig();

      const jobs = Array.from({ length: 20 }, (_, i) =>
        configManager.saveConfig({
          ...base,
          raceToken: i,
          updatedAt: Date.now() + i
        })
      );

      const results = await Promise.all(jobs);
      assert.ok(results.every(Boolean), 'All concurrent saves should resolve true');

      const configPath = path.join(tempRoot, '.i18ntk-config');
      assert.ok(fs.existsSync(configPath), '.i18ntk-config should exist after concurrent saves');

      const leftovers = fs.readdirSync(tempRoot).filter((name) =>
        name.startsWith('.i18ntk-config.') && name.endsWith('.tmp')
      );
      assert.strictEqual(leftovers.length, 0, 'No temporary config files should remain');
    } finally {
      if (originalAutosave === undefined) {
        delete process.env.I18NTK_DISABLE_AUTOSAVE;
      } else {
        process.env.I18NTK_DISABLE_AUTOSAVE = originalAutosave;
      }
      process.chdir(originalCwd);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('saveConfig honors I18NTK_DISABLE_AUTOSAVE in runtime environments', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-autosave-off-'));
    const originalCwd = process.cwd();
    const originalAutosave = process.env.I18NTK_DISABLE_AUTOSAVE;

    try {
      process.chdir(tempRoot);
      process.env.I18NTK_DISABLE_AUTOSAVE = '1';

      const configManager = loadFreshConfigManager();
      const base = configManager.loadConfig();
      const result = await configManager.saveConfig({ ...base, runtimeOnly: true });

      assert.strictEqual(result, false, 'saveConfig should return false when autosave is disabled');
      assert.strictEqual(fs.existsSync(path.join(tempRoot, '.i18ntk-config')), false, 'No config file should be persisted');
    } finally {
      if (originalAutosave === undefined) {
        delete process.env.I18NTK_DISABLE_AUTOSAVE;
      } else {
        process.env.I18NTK_DISABLE_AUTOSAVE = originalAutosave;
      }
      process.chdir(originalCwd);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
