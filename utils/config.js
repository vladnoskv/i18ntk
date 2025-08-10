const fs = require('fs');
const path = require('path');

const CONFIG_DIR = 'settings';
const CONFIG_FILE = 'i18ntk-config.json';

function getConfigPath(cwd = process.cwd()) {
  return path.join(cwd, CONFIG_DIR, CONFIG_FILE);
}

function loadConfig(cwd = process.cwd()) {
  const p = getConfigPath(cwd);
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveConfig(cfg, cwd = process.cwd()) {
  const dir = path.join(cwd, CONFIG_DIR);
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