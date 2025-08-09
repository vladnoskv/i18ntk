const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-'));
process.chdir(tmpDir);

const settingsManager = require('../settings/settings-manager.js');
const newSettings = { ...settingsManager.settings, language: 'fr' };
settingsManager.saveSettings(newSettings);
settingsManager.resetToDefaults();

const configPath = path.join(tmpDir, 'settings', 'i18ntk-config.json');
const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
assert.deepStrictEqual(saved, settingsManager.defaultConfig, 'Config should match DEFAULT_CONFIG');

console.log('resetToDefaults test passed');
