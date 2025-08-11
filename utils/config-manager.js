const fs = require('fs');
const path = require('path');
const os = require('os');

// Project root is where commands are executed
const projectRoot = process.cwd();
const CONFIG_DIR = path.join(os.homedir(), '.i18ntk');
const CONFIG_PATH = path.join(CONFIG_DIR, 'i18ntk-config.json');

// Default configuration values - comprehensive configuration
const DEFAULT_CONFIG = {
  "language": "en",
  "uiLanguage": "en",
  "theme": "system",
  "projectRoot": ".",
  "sourceDir": "./locales",
  "i18nDir": "./locales",
  "outputDir": "./i18ntk-reports",
  "scriptDirectories": {
    "init": null,
    "analyze": null,
    "validate": null,
    "usage": null,
    "sizing": null,
    "summary": null,
    "complete": null,
    "manage": null
  },
  "processing": {
    "batchSize": 2000,
    "concurrency": 32,
    "maxFileSize": 524288,
    "timeout": 3000,
    "retryAttempts": 0,
    "retryDelay": 0,
    "cacheEnabled": true,
    "cacheTTL": 180000,
    "validateOnSave": false,
    "autoBackup": false,
    "validateOnLoad": false,
    "fileFilter": "**/*.json",
    "notTranslatedMarker": "NOT_TRANSLATED",
    "excludeFiles": [
      ".DS_Store",
      "Thumbs.db",
      "*.tmp",
      "*.bak",
      "*.log",
      "~*",
      "*.swp"
    ],
    "performanceMode": "ultra-extreme",
    "memoryLimit": "256MB",
    "gcInterval": 250,
    "streaming": true,
    "compression": "brotli",
    "parallelProcessing": true,
    "minimalLogging": true
  },
  "reports": {
    "format": "json",
    "includeStats": true,
    "includeMissingKeys": true,
    "includeUnusedKeys": true,
    "includeUsageStats": true,
    "includeValidationErrors": true,
    "outputFormat": "both",
    "generateSummary": true,
    "generateDetailed": true,
    "saveToFile": true,
    "filenameTemplate": "i18n-report-{timestamp}"
  },
  "ui": {
    "showProgress": true,
    "showDetailedOutput": false,
    "colorOutput": true,
    "interactive": true,
    "confirmActions": true,
    "autoSave": true,
    "autoLoad": true
  },
  "behavior": {
    "autoDetectLanguage": true,
    "strictMode": false,
    "caseSensitive": true,
    "ignoreComments": false,
    "ignoreWhitespace": true,
    "normalizeKeys": true,
    "validateOnStartup": false
  },
  "notifications": {
    "enabled": true,
    "types": {
      "success": true,
      "warning": true,
      "error": true,
      "info": true,
      "warnings": true,
      "errors": true,
      "progress": true
    },
    "sound": false,
    "desktop": false,
    "webhook": null
  },
  "dateTime": {
    "format": "YYYY-MM-DD HH:mm:ss",
    "timezone": "local",
    "locale": "en-US"
  },
  "advanced": {
    "backupBeforeChanges": true,
    "validateSettings": true,
    "logLevel": "error",
    "performanceTracking": true,
    "memoryLimit": "256MB",
    "enableExperimental": true,
    "batchSize": 2000,
    "maxConcurrentFiles": 32,
    "enableProgressBars": false,
    "enableColorOutput": false,
    "strictMode": false,
    "enableAuditLog": false,
    "validateOnSave": false,
    "sizingThreshold": 50,
    "sizingFormat": "table",
    "timeout": 3000,
    "performanceMode": "ultra-extreme",
    "gcInterval": 250,
    "streaming": true,
    "compression": "brotli",
    "parallelProcessing": true,
    "aggressiveGC": true,
    "memoryPooling": true,
    "stringInterning": true
  },
  "backup": {
    "enabled": false,
    "singleFileMode": false,
    "singleBackupFile": "i18ntk-central-backup.json",
    "retentionDays": 30,
    "maxBackups": 100
  },
  "security": {
    "adminPinEnabled": false,
    "adminPinPromptOnInit": true,
    "keepAuthenticatedUntilExit": true,
    "sessionTimeout": 30,
    "maxFailedAttempts": 3,
    "lockoutDuration": 15,
    "enablePathValidation": true,
    "maxFileSize": 10485760,
    "allowedExtensions": [
      ".json",
      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      ".vue",
      ".svelte"
    ],
    "notTranslatedMarker": "[NOT TRANSLATED]",
    "excludeFiles": [
      "node_modules",
      ".git",
      "dist",
      "build"
    ],
    "strictMode": false,
    "pinProtection": {
      "enabled": true,
      "protectedScripts": {
        "debugMenu": true,
        "deleteReports": true,
        "summaryReports": true,
        "settingsMenu": true,
        "init": false,
        "analyze": false,
        "validate": false,
        "complete": false,
        "manage": false,
        "sizing": false,
        "usage": false
      }
    }
  },
  "debug": {
    "enabled": false,
    "showSecurityLogs": false,
    "verboseLogging": false,
    "logLevel": "info",
    "saveDebugLogs": false,
    "debugLogPath": "./debug.log"
  },
  "sourceLanguage": "en",
  "defaultLanguages": [
    "de",
    "es",
    "fr",
    "ru"
  ],
  "reportLanguage": "auto",
  "autoSave": true,
  "dateFormat": "DD/MM/YYYY",
  "timeFormat": "24h",
  "timezone": "auto"
};

// Mapping of supported environment variables to config keys
const ENV_VAR_MAP = {
  I18NTK_PROJECT_ROOT: 'projectRoot',
  I18NTK_SOURCE_DIR: 'sourceDir',
  I18NTK_I18N_DIR: 'i18nDir',
  I18NTK_OUTPUT_DIR: 'outputDir',
};

let currentConfig = null;

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function normalizePathValue(keyPath, value) {
  if (typeof value !== 'string') return value;
  const last = keyPath.split('.').pop();
  if (/dir|directory|root|path$/i.test(last)) {
    const abs = path.resolve(projectRoot, value);
    return toRelative(abs);
  }
  return value;
}

function deepMerge(target, source, basePath = '') {
  for (const [key, val] of Object.entries(source || {})) {
    const pathKey = basePath ? `${basePath}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      deepMerge(target[key], val, pathKey);
    } else {
      target[key] = normalizePathValue(pathKey, val);
    }
  }
  return target;
}

function applyEnvOverrides(cfg) {
  const overrides = {};
  for (const [envVar, key] of Object.entries(ENV_VAR_MAP)) {
    if (process.env[envVar]) {
      overrides[key] = process.env[envVar];
    }
  }
  if (Object.keys(overrides).length > 0) {
    deepMerge(cfg, overrides);
  }
  return cfg;
}

function loadConfig() {
  if (currentConfig) return currentConfig;
  let cfg = clone(DEFAULT_CONFIG);
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(data);
      cfg = deepMerge(clone(DEFAULT_CONFIG), parsed);
    }
  } catch (_) {
    // ignore and use defaults
  }
  applyEnvOverrides(cfg);
  currentConfig = cfg;
  return currentConfig;
}

async function saveConfig(cfg = currentConfig) {
  if (!cfg) return;
  ensureConfigDir();
  const data = JSON.stringify(cfg, null, 2);
  try {
    await fs.promises.writeFile(CONFIG_PATH, data, 'utf8');
  } catch (err) {
    console.warn(`Warning: Async config save failed: ${err.message}`);
    try {
      fs.writeFileSync(CONFIG_PATH, data, 'utf8');
    } catch (syncErr) {
      console.error(`Fallback sync save failed: ${syncErr.message}`);
    }
  }
}

function getConfig() {
  return loadConfig();
}

async function setConfig(cfg) {
  currentConfig = deepMerge(clone(DEFAULT_CONFIG), cfg || {});
  await saveConfig();
  return currentConfig;
}

async function updateConfig(patch) {
  const cfg = loadConfig();
  deepMerge(cfg, patch);
  await saveConfig();
  return cfg;
}

async function resetToDefaults() {
  currentConfig = clone(DEFAULT_CONFIG);
  await saveConfig();
  return currentConfig;
}

function resolvePaths(cfg = getConfig()) {
  const root = path.resolve(projectRoot, cfg.projectRoot || '.');
  const resolved = clone(cfg);
  resolved.projectRoot = root;
  ['sourceDir', 'i18nDir', 'outputDir'].forEach(key => {
    if (resolved[key]) resolved[key] = path.resolve(root, resolved[key]);
  });
  if (resolved.scriptDirectories) {
    resolved.scriptDirectories = { ...resolved.scriptDirectories };
    for (const [k, v] of Object.entries(resolved.scriptDirectories)) {
      if (v) resolved.scriptDirectories[k] = path.resolve(root, v);
    }
  }
  return resolved;
}

function toRelative(absPath) {
  if (!absPath) return absPath;
  const rel = path.relative(projectRoot, absPath);
  const normalized = rel ? `./${rel.replace(/\\/g, '/')}` : '.';
  return normalized;
}

module.exports = {
  CONFIG_PATH,
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  getConfig,
  updateConfig,
  setConfig,
  resetToDefaults,
  resolvePaths,
  toRelative,
  normalizePathValue,
};
