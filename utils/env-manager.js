/**
 * Centralized Environment Variable Manager
 * 
 * This module provides secure access to a fixed allowlist of environment variables.
 * Only explicitly defined environment variables are accessible, all others are ignored.
 * No secrets or sensitive data should ever be stored in environment variables.
 */

const ALLOWED_ENV_VARS = {
  // Logging and output
  'I18NTK_LOG_LEVEL': {
    default: 'error',
    validate: (value) => ['error', 'warn', 'info', 'debug', 'silent'].includes(value.toLowerCase()),
    transform: (value) => value.toLowerCase()
  },
  
  'I18NTK_OUTDIR': {
    default: './i18ntk-reports',
    validate: (value) => typeof value === 'string' && value.length > 0,
    transform: (value) => value.trim()
  },
  
  // UI and interaction
  'I18NTK_LANG': {
    default: 'en',
    validate: (value) => ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'].includes(value.toLowerCase()),
    transform: (value) => value.toLowerCase()
  },
  
  'I18NTK_SILENT': {
    default: 'false',
    validate: (value) => ['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase()),
    transform: (value) => {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes' ? 'true' : 'false';
    }
  },
  
  // Debug and development
  'I18NTK_DEBUG_LOCALES': {
    default: '0',
    validate: (value) => ['0', '1', 'true', 'false'].includes(value.toLowerCase()),
    transform: (value) => {
      const lower = value.toLowerCase();
      return lower === '1' || lower === 'true' ? '1' : '0';
    }
  },
  
  // Runtime configuration
  'I18NTK_RUNTIME_DIR': {
    default: null,
    validate: (value) => typeof value === 'string',
    transform: (value) => value.trim() || null
  },
  
  'I18NTK_I18N_DIR': {
    default: './locales',
    validate: (value) => typeof value === 'string' && value.length > 0,
    transform: (value) => value.trim()
  },
  
  'I18NTK_SOURCE_DIR': {
    default: './locales',
    validate: (value) => typeof value === 'string' && value.length > 0,
    transform: (value) => value.trim()
  },
  
  'I18NTK_PROJECT_ROOT': {
    default: '.',
    validate: (value) => typeof value === 'string' && value.length > 0,
    transform: (value) => value.trim()
  },
  
  // Framework detection
  'I18NTK_FRAMEWORK_PREFERENCE': {
    default: 'auto',
    validate: (value) => ['auto', 'vanilla', 'react', 'vue', 'angular', 'svelte', 'i18next', 'nuxt', 'next', 'django', 'flask', 'fastapi', 'spring-boot', 'laravel'].includes(value.toLowerCase()),
    transform: (value) => value.toLowerCase()
  },
  
  'I18NTK_FRAMEWORK_FALLBACK': {
    default: 'vanilla',
    validate: (value) => ['vanilla', 'react', 'vue', 'angular', 'svelte', 'i18next', 'nuxt', 'next', 'django', 'flask', 'fastapi', 'spring-boot', 'laravel'].includes(value.toLowerCase()),
    transform: (value) => value.toLowerCase()
  },
  
  'I18NTK_FRAMEWORK_DETECT': {
    default: 'true',
    validate: (value) => ['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase()),
    transform: (value) => {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes' ? 'true' : 'false';
    }
  }
};

// Security: Block access to sensitive environment variables
const BLOCKED_PATTERNS = [
  /^SECRET/i,
  /^PASSWORD/i,
  /^KEY/i,
  /^TOKEN/i,
  /^API_KEY/i,
  /^PRIVATE/i,
  /^AUTH/i,
  /^CREDENTIAL/i,
  /^AWS_/i,
  /^GITHUB_/i,
  /^NPM_/i,
  /^NODE_/i,
  /^PATH$/,
  /^HOME$/,
  /^USER$/,
  /^USERNAME$/,
  /^SHELL$/,
  /^TERM$/,
  /^DISPLAY$/,
  /^LANG$/,
  /^LC_/i
];

class EnvironmentManager {
  constructor() {
    this._cache = new Map();
    this._validated = new Set();
  }

  /**
   * Get a validated environment variable value
   * @param {string} name - Environment variable name
   * @returns {string|null} - Validated value or null if not allowed
   */
  get(name) {
    // Only allow explicitly defined variables
    if (!ALLOWED_ENV_VARS[name]) {
      return null;
    }

    // Check cache first
    if (this._cache.has(name)) {
      return this._cache.get(name);
    }

    const definition = ALLOWED_ENV_VARS[name];
    const rawValue = process.env[name];

    // Use default if not set
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      this._cache.set(name, definition.default);
      return definition.default;
    }

    // Validate and transform
    try {
      const transformed = definition.transform(rawValue);
      
      if (!definition.validate(transformed)) {
        console.warn(`[i18ntk] Invalid value for ${name}: "${rawValue}". Using default: ${definition.default}`);
        this._cache.set(name, definition.default);
        return definition.default;
      }

      this._cache.set(name, transformed);
      this._validated.add(name);
      return transformed;
    } catch (error) {
      console.warn(`[i18ntk] Error processing ${name}: ${error.message}. Using default: ${definition.default}`);
      this._cache.set(name, definition.default);
      return definition.default;
    }
  }

  /**
   * Check if an environment variable is allowed
   * @param {string} name - Environment variable name
   * @returns {boolean} - True if allowed
   */
  isAllowed(name) {
    return !!ALLOWED_ENV_VARS[name];
  }

  /**
   * Get all allowed environment variables with their current values
   * @returns {Object} - Object with variable names as keys and values
   */
  getAll() {
    const result = {};
    for (const name of Object.keys(ALLOWED_ENV_VARS)) {
      result[name] = this.get(name);
    }
    return result;
  }

  /**
   * Get documentation for all allowed environment variables
   * @returns {Array} - Array of documentation objects
   */
  getDocumentation() {
    return Object.entries(ALLOWED_ENV_VARS).map(([name, definition]) => ({
      name,
      default: definition.default,
      description: this._getDescription(name)
    }));
  }

  /**
   * Clear the cache (for testing)
   */
  clearCache() {
    this._cache.clear();
    this._validated.clear();
  }

  /**
   * Check if a variable name matches blocked patterns
   * @param {string} name - Variable name to check
   * @returns {boolean} - True if blocked
   */
  isBlocked(name) {
    return BLOCKED_PATTERNS.some(pattern => pattern.test(name));
  }

  /**
   * Get human-readable description for an environment variable
   * @param {string} name - Environment variable name
   * @returns {string} - Description
   */
  _getDescription(name) {
    const descriptions = {
      'I18NTK_LOG_LEVEL': 'Logging level (error, warn, info, debug, silent)',
      'I18NTK_OUTDIR': 'Output directory for reports and generated files',
      'I18NTK_LANG': 'UI language (en, de, es, fr, ru, ja, zh)',
      'I18NTK_SILENT': 'Run in silent mode without interactive prompts',
      'I18NTK_DEBUG_LOCALES': 'Enable debug logging for locale loading',
      'I18NTK_RUNTIME_DIR': 'Custom runtime directory path',
      'I18NTK_I18N_DIR': 'Directory containing i18n/locale files',
      'I18NTK_SOURCE_DIR': 'Source directory for scanning',
      'I18NTK_PROJECT_ROOT': 'Project root directory',
      'I18NTK_FRAMEWORK_PREFERENCE': 'Preferred framework (auto, react, vue, etc.)',
      'I18NTK_FRAMEWORK_FALLBACK': 'Fallback framework when auto-detection fails',
      'I18NTK_FRAMEWORK_DETECT': 'Enable automatic framework detection'
    };
    
    return descriptions[name] || 'Configuration option';
  }
}

// Create singleton instance
const envManager = new EnvironmentManager();

// Security check: Log any attempts to access blocked variables
if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
  const originalEnv = process.env;
  process.env = new Proxy(originalEnv, {
    get(target, prop) {
      if (typeof prop === 'string' && envManager.isBlocked(prop)) {
        console.warn(`[i18ntk] Security: Blocked access to sensitive environment variable: ${prop}`);
        return undefined;
      }
      return target[prop];
    }
  });
}

module.exports = {
  EnvironmentManager,
  envManager,
  ALLOWED_ENV_VARS,
  BLOCKED_PATTERNS
};