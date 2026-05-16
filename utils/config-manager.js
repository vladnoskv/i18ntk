const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const SecurityUtils = require('./security');
const { logger } = require('./logger');
const { envManager } = require('./env-manager');

// Determine package directory and user project root
const packageDir = path.resolve(__dirname, '..');

function getUserProjectRoot() {
  return path.resolve(process.cwd());
}

function getProjectConfigPath() {
  const root = getUserProjectRoot();
  const configPath = SecurityUtils.safeJoin(root, '.i18ntk-config');
  if (!configPath) {
    throw new Error('Invalid project config path - potential path traversal attempt');
  }
  return configPath;
}

const CONFIG_LOCK_TIMEOUT_MS = 5000;
const CONFIG_LOCK_STALE_MS = 15000;
const CONFIG_LOCK_RETRY_MS = 50;
let autosaveDisabledWarned = false;
let defaultConfigNoticeShown = false;
let configFallbackNoticeShown = false;

function logInfo(message, details) {
  logger.info(message, details);
}

function logWarn(message, details) {
  logger.warn(message, details);
}

function logError(message, details) {
  logger.error(message, details);
}

function notifyDefaultConfig(reason, error) {
  if (defaultConfigNoticeShown) {
    return;
  }
  defaultConfigNoticeShown = true;

  logger.info('Using default configuration (reason: configuration error)', { reason });
  if (logger.isDebugMode() && error) {
    logger.debug(`Default configuration reason details: ${error.message}`, {
      stack: error.stack
    });
  }
}

function notifyConfigFallback(error) {
  if (!configFallbackNoticeShown) {
    configFallbackNoticeShown = true;
    logger.info('Using default configuration (reason: configuration error)', {
      reason: 'configuration error'
    });
  }

  logger.recordFirstError('config:load-fallback', {
    message: error && error.message ? error.message : 'Unknown configuration error',
    stack: error && error.stack ? error.stack : null
  });

  if (logger.isDebugMode() && error) {
    logger.debug(`Configuration load fallback details: ${error.message}`, {
      stack: error.stack
    });
  }
}

// Setup tracking file
const getSetupCompletedFile = () => path.join(path.dirname(getProjectConfigPath()), 'setup.json');

// Legacy home directory config (for migration only)
const LEGACY_CONFIG_DIR = path.join(os.homedir(), '.i18ntk');
const LEGACY_CONFIG_PATH = path.join(LEGACY_CONFIG_DIR, 'i18ntk-config.json');

// Package defaults fallback (read-only) - always points to package internals
const PACKAGE_SETTINGS_DIR = path.join(packageDir, 'settings');
const PACKAGE_CONFIG_PATH = path.join(PACKAGE_SETTINGS_DIR, 'i18ntk-config.json');

// Back-compat: expose CONFIG_DIR/CONFIG_PATH but point to project settings
const getConfigDir = () => path.dirname(getProjectConfigPath());
const getConfigPath = getProjectConfigPath;

// Default configuration values - comprehensive configuration
const DEFAULT_CONFIG = {
  "language": "en",
  "uiLanguage": "en",
  "theme": "system",
  "projectRoot": ".",
  "sourceDir": "./locales",
  "i18nDir": "./locales",
  "outputDir": "./i18ntk-reports",
  "setup": {
    "completed": false,
    "completedAt": null,
    "version": null,
    "setupId": null
  },
  "framework": {
    "preference": "auto", // one of: auto | vanilla | react | vue | angular | svelte | i18next | nuxt | next
    "fallback": "vanilla", // when auto detects nothing, use this value
    "detect": true,
    "supported": ["react", "vue", "angular", "svelte", "i18next", "nuxt", "next", "vanilla"]
  },
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
  "autoTranslate": {
    "placeholderMode": "preserve",
    "concurrency": 6,
    "batchSize": 100,
    "progressInterval": 25,
    "retryCount": 3,
    "retryDelay": 1000,
    "timeout": 15000,
    "dryRunFirst": true,
    "reportStdout": true,
    "bom": false,
    "protectionEnabled": true,
    "protectionFile": "./i18ntk-auto-translate.json",
    "promptProtectionSetup": true,
    "promptProtectionUpdate": true
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
    "location": "./i18ntk-backups",
    "singleFileMode": false,
    "singleBackupFile": "i18ntk-central-backup.json",
    "retentionDays": 30,
    "maxBackups": 1
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

// Environment variable support has been removed in favor of exclusive .i18ntk-config configuration

let currentConfig = null;
let configLoadInProgress = false;
let recursionDepth = 0;
const MAX_RECURSION_DEPTH = 15; // Increased to handle legitimate sequential calls
let configSaveQueue = Promise.resolve();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireConfigLock(timeoutMs = CONFIG_LOCK_TIMEOUT_MS) {
  const lockPath = `${getProjectConfigPath()}.lock`;
  const start = Date.now();
  let lockHandle = null;

  while (!lockHandle) {
    try {
      lockHandle = await fs.promises.open(lockPath, 'wx');
      await lockHandle.writeFile(String(process.pid), 'utf8');
      break;
    } catch (error) {
      if (!error || error.code !== 'EEXIST') {
        throw error;
      }

      // Recover from stale lock files left by crashed processes.
      try {
        const stats = await fs.promises.stat(lockPath);
        if (Date.now() - stats.mtimeMs > CONFIG_LOCK_STALE_MS) {
          await fs.promises.unlink(lockPath);
          continue;
        }
      } catch (_) {
        // Lock may have been released between exists check and stat/unlink.
      }

      if (Date.now() - start >= timeoutMs) {
        throw new Error(`Timed out waiting for config lock after ${timeoutMs}ms`);
      }

      await sleep(CONFIG_LOCK_RETRY_MS);
    }
  }

  return async function releaseConfigLock() {
    try {
      if (lockHandle) {
        await lockHandle.close();
      }
    } catch (_) {
      // Best-effort close only.
    }
    try {
      await fs.promises.unlink(lockPath);
    } catch (_) {
      // Best-effort cleanup only.
    }
  };
}

function isAutosaveDisabled() {
  const raw = process.env.I18NTK_DISABLE_AUTOSAVE;
  if (raw !== undefined && raw !== null && raw !== '') {
    return ['true', '1', 'yes'].includes(String(raw).trim().toLowerCase());
  }
  return envManager.getBoolean('I18NTK_DISABLE_AUTOSAVE');
}

function clone(obj) {
   return JSON.parse(JSON.stringify(obj));
}

function checkRecursionGuard() {
    // Disabled recursion detection to prevent false positives on legitimate sequential calls
    // TODO: Implement more sophisticated recursion detection in future versions
    return null;
}

function resetRecursionGuard() {
    recursionDepth = 0;
    configLoadInProgress = false;
}

function ensureProjectSettingsDir() {
  const settingsDir = path.dirname(getProjectConfigPath());
  try {
    fs.mkdirSync(settingsDir, { recursive: true });
  } catch (_) {
    // Directory may already exist or be unwritable
  }
}

function normalizePathValue(keyPath, value) {
  if (typeof value !== 'string') return value;
  const last = keyPath.split('.').pop();
  if (/dir|directory|root|path$/i.test(last)) {
    // Always resolve paths relative to user's project root, not package directory
    const userProjectRoot = process.cwd();
    const abs = path.resolve(userProjectRoot, value);
    return toRelative(abs);
  }
  return value;
}

// Deep merge that also normalizes path-like leaves based on their key path
function deepMerge(target, source, basePath = '') {
  if (!target || typeof target !== 'object') target = {};
  for (const [key, val] of Object.entries(source || {})) {
    const pathKey = basePath ? `${basePath}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      deepMerge(target[key], val, pathKey);
    } else {
      target[key] = normalizePathValue(pathKey, val);
    }
  }
  return target;
}

function applyEnvOverrides(cfg) {
  // Environment variable support has been removed in favor of exclusive .i18ntk-config configuration
  // This function is kept for backward compatibility but does nothing
  return cfg;
}

function tryReadJson(filePath) {
  try {
    if (!SecurityUtils.safeExistsSync(filePath)) {
      return null;
    }

    const data = SecurityUtils.safeReadFileSync(filePath, path.dirname(filePath), 'utf8');
    if (!data || data.trim() === '') {
      logWarn(`[i18ntk] Warning: Empty or invalid JSON file at ${filePath}`);
      return null;
    }

    const parsed = SecurityUtils.safeParseJSON(data);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }

    logError(`[i18ntk] Error parsing JSON from ${filePath}: Invalid JSON content`);
    // Create a backup of the corrupted file
    const backupPath = `${filePath}.corrupted-${Date.now()}.bak`;
    try {
      SecurityUtils.safeWriteFileSync(backupPath, data, path.dirname(backupPath), 'utf8');
      logWarn(`[i18ntk] Created backup of corrupted config at ${backupPath}`);
    } catch (backupError) {
      logError(`[i18ntk] Failed to create backup of corrupted config: ${backupError.message}`);
    }
    return null;
  } catch (error) {
    logError(`[i18ntk] Error reading config file at ${filePath}: ${error.message}`);
    return null;
  }
}

async function migrateLegacyIfNeeded(baseCfg) {
  // If project config does not exist but legacy exists, migrate once
  const configPath = getProjectConfigPath();
  if (!SecurityUtils.safeExistsSync(configPath) && SecurityUtils.safeExistsSync(LEGACY_CONFIG_PATH)) {
    const legacy = tryReadJson(LEGACY_CONFIG_PATH);
    if (legacy && typeof legacy === 'object') {
      const merged = deepMerge(clone(baseCfg), legacy);
      // Mark migration completion in the merged config (QoL telemetry)
      try { merged.migrationComplete = true; } catch (_) {}
      ensureProjectSettingsDir();
      try {
        await fs.promises.writeFile(configPath, JSON.stringify(merged, null, 2), 'utf8');
        // Best-effort removal of legacy file to prevent future use
        try { SecurityUtils.safeUnlinkSync(LEGACY_CONFIG_PATH, path.dirname(LEGACY_CONFIG_PATH)); } catch (_) {}
        // Deprecation notice
        logWarn('[i18ntk] Deprecated config location detected (~/.i18ntk). Configuration was migrated to project .i18ntk-config.');
        return merged;
      } catch (_) {
        // If write fails, fall back to in-memory config without deleting legacy
        logWarn('[i18ntk] Deprecated config location detected (~/.i18ntk). Using migrated settings in memory; failed to persist to .i18ntk-config.');
        return merged;
      }
    }
  }
  return null;
}

function loadConfig() {
    // Check for recursion
    const recursionFallback = checkRecursionGuard();
    if (recursionFallback) return recursionFallback;

    // Return cached config if available
    if (currentConfig) {
      resetRecursionGuard();
      return currentConfig;
    }

    // Prevent concurrent loading
    if (configLoadInProgress) {
      logWarn('[i18ntk] Configuration loading already in progress, returning defaults');
      resetRecursionGuard();
      return clone(DEFAULT_CONFIG);
    }

    configLoadInProgress = true;

    try {
      let cfg = clone(DEFAULT_CONFIG);
   const configPath = getProjectConfigPath();
   // 1) Project config (primary)
   const projectCfg = tryReadJson(configPath);
   if (projectCfg) {
     cfg = deepMerge(clone(DEFAULT_CONFIG), projectCfg);
   } else {
     // 2) Package default (read-only)
     const pkgCfg = tryReadJson(PACKAGE_CONFIG_PATH);
     if (pkgCfg) {
       cfg = deepMerge(clone(DEFAULT_CONFIG), pkgCfg);
     }
     // 3) Legacy migration (read-only source)
     if (!projectCfg) {
       const fromLegacy = tryReadJson(LEGACY_CONFIG_PATH);
       if (fromLegacy) {
         cfg = deepMerge(clone(DEFAULT_CONFIG), fromLegacy);
         // Attempt to migrate to project settings
         // Ignore migration errors; we still return merged cfg in memory
         // eslint-disable-next-line no-unused-vars
         logWarn('[i18ntk] Detected legacy config at ~/.i18ntk. Migrating to project settings directory...');
         const _ = (async () => { await migrateLegacyIfNeeded(DEFAULT_CONFIG); })();
       }
     }
   }
     applyEnvOverrides(cfg);
     currentConfig = cfg;
     return currentConfig;
   } catch (error) {
     logError('[i18ntk] Error in loadConfig', { error: error.message });
     notifyConfigFallback(error);
     currentConfig = clone(DEFAULT_CONFIG);
     return currentConfig;
   } finally {
     configLoadInProgress = false;
     recursionDepth = Math.max(0, recursionDepth - 1);
   }
}

async function saveConfig(cfg = currentConfig) {
  if (!cfg || typeof cfg !== 'object') return;

  // Runtime/server safety valve: allow disabling disk writes entirely.
  if (isAutosaveDisabled()) {
    currentConfig = cfg;
    if (!autosaveDisabledWarned) {
      autosaveDisabledWarned = true;
      logWarn('[i18ntk] Autosave disabled by I18NTK_DISABLE_AUTOSAVE. Keeping configuration in memory only.');
    }
    return false;
  }

  configSaveQueue = configSaveQueue.then(async () => {
    let tempPath = null;
    let releaseLock = null;
    try {
      const settingsDir = path.dirname(getProjectConfigPath());
      const configFilePath = getProjectConfigPath();
      // Ensure settings directory exists before any lock/file operations.
      await fs.promises.mkdir(settingsDir, { recursive: true });

      releaseLock = await acquireConfigLock();

      const serialized = JSON.stringify(cfg, null, 2);
      if (typeof serialized !== 'string' || serialized.length === 0) {
        throw new Error('Cannot save empty configuration payload');
      }

      // Use a unique temp file to avoid concurrent writer races.
      // Create temp files in the same directory as the config file to ensure they're safe
      // Use a simpler naming pattern to avoid triggering security warnings
      const nonce = `${process.pid}.${Date.now()}`;
      const tempFileName = `.i18ntk-config.temp-${nonce}`;
      tempPath = path.join(settingsDir, tempFileName);
      await fs.promises.writeFile(tempPath, serialized, 'utf8');

      try {
        await fs.promises.rename(tempPath, configFilePath);
      } catch (renameError) {
        // If destination dir disappeared between checks, recreate and retry once.
        if (renameError && renameError.code === 'ENOENT') {
          await fs.promises.mkdir(settingsDir, { recursive: true });
          await fs.promises.rename(tempPath, configFilePath);
        } else {
          throw renameError;
        }
      }

      currentConfig = cfg;
      return true;
    } catch (error) {
      logError('[i18ntk] Error saving configuration', { error: error.message });
      return false;
    } finally {
      if (releaseLock) {
        await releaseLock();
      }
      if (tempPath) {
        try {
          SecurityUtils.safeUnlinkSync(tempPath, path.dirname(tempPath));
        } catch (_) {
          // Best-effort temp cleanup only.
        }
      }
    }
  });

  return configSaveQueue;
}

function getConfig() {
    // Check for recursion
    const recursionFallback = checkRecursionGuard();
    if (recursionFallback) return resolvePaths(recursionFallback);

    if (currentConfig) {
      resetRecursionGuard();
      return resolvePaths(currentConfig);
    }

   try {
     const configPath = getProjectConfigPath();
     const settingsDir = path.dirname(configPath);
     // Ensure settings directory exists
     if (!SecurityUtils.safeExistsSync(settingsDir)) {
       fs.mkdirSync(settingsDir, { recursive: true });
     }

     // Setup is now handled automatically by the unified config system
     // No need to check here - handled by getUnifiedConfig

     // Check if config file exists
     if (SecurityUtils.safeExistsSync(configPath)) {
       const rawConfig = SecurityUtils.safeReadFileSync(configPath, settingsDir, 'utf8');
       const config = SecurityUtils.safeParseJSON(rawConfig);
       if (config && typeof config === 'object') {
         currentConfig = config;
         return resolvePaths(config);
       }
       throw new Error('Invalid project configuration JSON');
     }

     // Check for legacy config for migration
     if (SecurityUtils.safeExistsSync(LEGACY_CONFIG_PATH)) {
       logInfo('Migrating legacy configuration');
       const legacyRaw = SecurityUtils.safeReadFileSync(LEGACY_CONFIG_PATH, path.dirname(LEGACY_CONFIG_PATH), 'utf8');
       const legacyConfig = SecurityUtils.safeParseJSON(legacyRaw);
       if (!legacyConfig || typeof legacyConfig !== 'object') {
         throw new Error('Invalid legacy configuration JSON');
       }
       const migratedConfig = { ...DEFAULT_CONFIG, ...legacyConfig };
       saveConfig(migratedConfig).catch((err) => {
         logWarn('[i18ntk] Warning: failed to persist migrated configuration', { error: err.message });
       });
       currentConfig = migratedConfig;

        // Clean up legacy config
        try {
          SecurityUtils.safeUnlinkSync(LEGACY_CONFIG_PATH, path.dirname(LEGACY_CONFIG_PATH));
          if (SecurityUtils.safeReaddirSync(LEGACY_CONFIG_DIR, path.dirname(LEGACY_CONFIG_DIR)).length === 0) {
            SecurityUtils.safeRmdirSync(LEGACY_CONFIG_DIR, path.dirname(LEGACY_CONFIG_DIR));
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
        }

       return resolvePaths(migratedConfig);
     }

     // Use package defaults for new installation
     notifyDefaultConfig('default initialization');
     saveConfig(DEFAULT_CONFIG).catch((err) => {
       logWarn('[i18ntk] Warning: failed to persist default configuration', { error: err.message });
     });
     currentConfig = DEFAULT_CONFIG;
     return resolvePaths(DEFAULT_CONFIG);

   } catch (error) {
     notifyConfigFallback(error);
     currentConfig = DEFAULT_CONFIG;
     return resolvePaths(DEFAULT_CONFIG);
   }
}

async function setConfig(cfg) {
  currentConfig = deepMerge(clone(DEFAULT_CONFIG), cfg || {});
  // Don't save to disk - use in-memory config only
  return currentConfig;
}

async function updateConfig(patch) {
  const cfg = loadConfig();
  const cloned = clone(cfg);
  deepMerge(cloned, patch);
  currentConfig = cloned;
  return cloned;
}

async function resetToDefaults() {
  currentConfig = clone(DEFAULT_CONFIG);
  // Don't save to disk - use in-memory config only
  return currentConfig;
}

function resolvePaths(cfg) {
    if (!cfg) {
      cfg = clone(DEFAULT_CONFIG);
    }
   const root = path.resolve(getUserProjectRoot(), cfg.projectRoot || '.');
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
   const rel = path.relative(getUserProjectRoot(), absPath);
   const normalized = rel ? `./${rel.replace(/\\/g, '/')}` : '.';
   return normalized;
}



module.exports = {
  get CONFIG_PATH() { return getProjectConfigPath(); },
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  loadSettings: loadConfig,
  saveSettings: saveConfig,
  getConfig,
  updateConfig,
  setConfig,
  resetToDefaults,
  resolvePaths,
  toRelative,
  normalizePathValue,
  migrateLegacyIfNeeded,
}




