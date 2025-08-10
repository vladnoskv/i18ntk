const fs = require('fs');
const path = require('path');

const settingsManager = require('../settings/settings-manager');
const CONFIG_FILE = 'i18ntk-config.json';

function getConfigPath(cwd = settingsManager.configDir) {
  return path.join(cwd, CONFIG_FILE);
}

function loadConfig(cwd = settingsManager.configDir) {
  const p = getConfigPath(cwd);
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveConfig(cfg, cwd = settingsManager.configDir) {
  const dir = cwd;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, CONFIG_FILE), JSON.stringify(cfg, null, 2), 'utf8');
}

function ensureConfigDefaults(cfg = {}) {
  return {
    initialized: cfg.initialized ?? false,
    i18nDir: cfg.i18nDir ?? null,
    sourceDir: cfg.sourceDir ?? null,
    framework: {
      detected: cfg.framework && cfg.framework.detected != null ? cfg.framework.detected : null,
      preference: cfg.framework && cfg.framework.preference != null ? cfg.framework.preference : 'none',
      prompt: cfg.framework && cfg.framework.prompt != null ? cfg.framework.prompt : 'always',
      lastPromptedVersion: cfg.framework && cfg.framework.lastPromptedVersion != null ? cfg.framework.lastPromptedVersion : null
    }
  };
}

module.exports = { getConfigPath, loadConfig, saveConfig, ensureConfigDefaults };