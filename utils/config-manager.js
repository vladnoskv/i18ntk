const fs = require('fs');
const path = require('path');
const os = require('os');
const SecurityUtils = require('./security');

// Determine package directory and user project root
const packageDir = path.resolve(__dirname, '..');
const userProjectRoot = process.cwd();

// Always use current working directory for settings to support test environments
// This ensures config works correctly when tests change the working directory
const PROJECT_CONFIG_PATH = path.join(process.cwd(), '.i18ntk-config');
const PROJECT_SETTINGS_DIR = path.dirname(PROJECT_CONFIG_PATH);

// Setup tracking file
const SETUP_COMPLETED_FILE = path.join(PROJECT_SETTINGS_DIR, 'setup.json');

// Legacy home directory config (for migration only)
const LEGACY_CONFIG_DIR = path.join(os.homedir(), '.i18ntk');
const LEGACY_CONFIG_PATH = path.join(LEGACY_CONFIG_DIR, 'i18ntk-config.json');

// Package defaults fallback (read-only) - always points to package internals
const PACKAGE_SETTINGS_DIR = path.join(packageDir, 'settings');
const PACKAGE_CONFIG_PATH = path.join(PACKAGE_SETTINGS_DIR, 'i18ntk-config.json');

// Keep projectRoot for path resolution functions
const projectRoot = userProjectRoot;

// Back-compat: expose CONFIG_DIR/CONFIG_PATH but point to project settings
const CONFIG_DIR = PROJECT_SETTINGS_DIR;
const CONFIG_PATH = PROJECT_CONFIG_PATH;

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

// Environment variable support has been removed in favor of exclusive .i18ntk-config configuration

let currentConfig = null;
let configLoadInProgress = false;
let recursionDepth = 0;
const MAX_RECURSION_DEPTH = 15; // Increased to handle legitimate sequential calls

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
  // Only create settings directory within the package, not in user projects
  // Since PROJECT_SETTINGS_DIR is now set to package internals, no action needed
  // if directory doesn't exist, we'll use package defaults
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

    const data = SecurityUtils.safeReadFileSync(filePath, 'utf8');
    if (!data || data.trim() === '') {
      console.warn(`[i18ntk] Warning: Empty or invalid JSON file at ${filePath}`);
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (parseError) {
      console.error(`[i18ntk] Error parsing JSON from ${filePath}: ${parseError.message}`);
      // Create a backup of the corrupted file
      const backupPath = `${filePath}.corrupted-${Date.now()}.bak`;
      try {
        SecurityUtils.safeWriteFileSync(backupPath, data, 'utf8');
        console.warn(`[i18ntk] Created backup of corrupted config at ${backupPath}`);
      } catch (backupError) {
        console.error(`[i18ntk] Failed to create backup of corrupted config: ${backupError.message}`);
      }
      return null;
    }
  } catch (error) {
    console.error(`[i18ntk] Error reading config file at ${filePath}: ${error.message}`);
    return null;
  }
}

async function migrateLegacyIfNeeded(baseCfg) {
  // If project config does not exist but legacy exists, migrate once
  if (!SecurityUtils.safeExistsSync(PROJECT_CONFIG_PATH) && SecurityUtils.safeExistsSync(LEGACY_CONFIG_PATH)) {
    const legacy = tryReadJson(LEGACY_CONFIG_PATH);
    if (legacy && typeof legacy === 'object') {
      const merged = deepMerge(clone(baseCfg), legacy);
      // Mark migration completion in the merged config (QoL telemetry)
      try { merged.migrationComplete = true; } catch (_) {}
      ensureProjectSettingsDir();
      try {
        await fs.promises.writeFile(PROJECT_CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf8');
        // Best-effort removal of legacy file to prevent future use
        try { fs.unlinkSync(LEGACY_CONFIG_PATH); } catch (_) {}
        // Deprecation notice
        console.warn('[i18ntk] Deprecated config location detected (~/.i18ntk). Your config has been migrated to .i18ntk-settings. Please commit the .i18ntk-settings file to your project.');
        return merged;
      } catch (_) {
        // If write fails, fall back to in-memory config without deleting legacy
        console.warn('[i18ntk] Deprecated config location detected (~/.i18ntk). Using migrated settings in memory; failed to persist to settings/. Ensure the project has write permissions.');
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
      console.warn('[i18ntk] Configuration loading already in progress, returning defaults');
      resetRecursionGuard();
      return clone(DEFAULT_CONFIG);
    }

    configLoadInProgress = true;

    try {
      let cfg = clone(DEFAULT_CONFIG);
   // 1) Project config (primary)
   const projectCfg = tryReadJson(PROJECT_CONFIG_PATH);
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
         console.warn('[i18ntk] Detected legacy config at ~/.i18ntk. Migrating to project settings directory...');
         const _ = (async () => { await migrateLegacyIfNeeded(DEFAULT_CONFIG); })();
       }
     }
   }
     applyEnvOverrides(cfg);
     currentConfig = cfg;
     return currentConfig;
   } catch (error) {
     console.error('[i18ntk] Error in loadConfig:', error.message);
     currentConfig = clone(DEFAULT_CONFIG);
     return currentConfig;
   } finally {
     configLoadInProgress = false;
     recursionDepth = Math.max(0, recursionDepth - 1);
   }
}

async function saveConfig(cfg = currentConfig) {
  if (!cfg) return;

  try {
    // Ensure settings directory exists
    if (!SecurityUtils.safeExistsSync(PROJECT_SETTINGS_DIR)) {
      fs.mkdirSync(PROJECT_SETTINGS_DIR, { recursive: true });
    }

    // Save configuration to the project settings directory
    await fs.promises.writeFile(PROJECT_CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
    currentConfig = cfg;
  } catch (error) {
    console.error('[i18ntk] Error saving configuration:', error.message);
    throw error;
  }
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
     // Ensure settings directory exists
     if (!SecurityUtils.safeExistsSync(PROJECT_SETTINGS_DIR)) {
       fs.mkdirSync(PROJECT_SETTINGS_DIR, { recursive: true });
     }

     // Setup is now handled automatically by the unified config system
     // No need to check here - handled by getUnifiedConfig

     // Check if config file exists
     if (SecurityUtils.safeExistsSync(PROJECT_CONFIG_PATH)) {
       const config = JSON.parse(SecurityUtils.safeReadFileSync(PROJECT_CONFIG_PATH, 'utf8'));
       currentConfig = config;
       return resolvePaths(config);
     }

     // Check for legacy config for migration
     if (SecurityUtils.safeExistsSync(LEGACY_CONFIG_PATH)) {
       console.log('📦 Migrating legacy configuration...');
       const legacyConfig = JSON.parse(SecurityUtils.safeReadFileSync(LEGACY_CONFIG_PATH, 'utf8'));
       const migratedConfig = { ...DEFAULT_CONFIG, ...legacyConfig };
       saveConfig(migratedConfig);
       currentConfig = migratedConfig;

       // Clean up legacy config
       try {
         fs.unlinkSync(LEGACY_CONFIG_PATH);
         if (fs.readdirSync(LEGACY_CONFIG_DIR).length === 0) {
           fs.rmdirSync(LEGACY_CONFIG_DIR);
         }
       } catch (cleanupError) {
         // Ignore cleanup errors
       }

       return resolvePaths(migratedConfig);
     }

     // Use package defaults for new installation
     console.log('📦 Initializing with default configuration...');
     saveConfig(DEFAULT_CONFIG);
     currentConfig = DEFAULT_CONFIG;
     return resolvePaths(DEFAULT_CONFIG);

   } catch (error) {
     console.warn('⚠️  Error loading configuration, using defaults:', error.message);
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
  deepMerge(cfg, patch);
  // Don't save to disk - use in-memory config only
  return cfg;
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
}