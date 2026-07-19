const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { logger } = require('./logger');
const { envManager } = require('./env-manager');

const INTERNAL_MANIFEST_CACHE = {
  initialized: false,
  roots: new Set()
};

function findPackageRoot(startDir) {
  let current = path.resolve(startDir || process.cwd());
  while (true) {
    const manifest = path.join(current, 'package.json');
    if (fs.existsSync(manifest)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function initializeInternalRoots() {
  if (INTERNAL_MANIFEST_CACHE.initialized) {
    return INTERNAL_MANIFEST_CACHE.roots;
  }

  INTERNAL_MANIFEST_CACHE.initialized = true;
  const roots = INTERNAL_MANIFEST_CACHE.roots;
  const candidates = [
    process.cwd(),
    path.resolve(__dirname, '..'),
    findPackageRoot(process.cwd()),
    findPackageRoot(path.resolve(__dirname, '..'))
  ].filter(Boolean);

  for (const candidate of candidates) {
    roots.add(path.resolve(candidate));
  }

  const custom = String(envManager.get('I18NTK_INTERNAL_PATH_PREFIXES') || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  for (const prefix of custom) {
    const resolved = path.resolve(prefix);
    if ([...roots].some((root) => isPathInside(root, resolved))) {
      roots.add(resolved);
    }
  }

  return roots;
}

function normalizeForCompare(value) {
  return String(value || '').replace(/\\/g, '/').toLowerCase();
}

function isPathInside(root, target) {
  const normalizedRoot = normalizeForCompare(path.resolve(root));
  const normalizedTarget = normalizeForCompare(path.resolve(target));
  return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(`${normalizedRoot}/`);
}

function isInternalPath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    return false;
  }
  const roots = initializeInternalRoots();
  const absolute = path.resolve(inputPath);
  for (const root of roots) {
    if (isPathInside(root, absolute)) {
      return true;
    }
  }
  return false;
}

function detectDangerReason(filePath) {
  if (/\.\.(\/|\\|$)/.test(filePath)) return 'Contains parent directory traversal segments';
  if (/(^|[\/\\])~([\/\\]|$)/.test(filePath)) return 'Contains home-directory shorthand';
  if (/\$\{/.test(filePath)) return 'Contains variable expansion token';
  if (/`/.test(filePath)) return 'Contains command substitution token';
  if (/[|;&<>]/.test(filePath)) return 'Contains shell metacharacters';
  return null;
}


// Lazy load i18n to prevent initialization race conditions
let i18n;
function getI18n() {
  if (!i18n) {
    try {
      i18n = require('./i18n-helper');
    } catch (error) {
      // Fallback to simple identity function if i18n fails to load
      SecurityUtils.logSecurityEvent('i18n-helper not available, using fallback messages', 'warn');
      return { t: (key, params = {}) => key };
    }
  }
  return i18n;
}

/**
 * Security utility module for i18nTK
 * Provides secure file operations, path validation, and input sanitization
 * to prevent path traversal, code injection, and other security vulnerabilities
 */
class SecurityUtils {
  static MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  static MAX_JSON_SIZE = 50 * 1024 * 1024; // 50 MB
  static MAX_JSON_DEPTH = 1000;
  static MAX_FILENAME_LENGTH = 255;

// Whitelist patterns for our own package artifacts
static PACKAGE_ARTIFACT_WHITELIST = [
    /\.i18ntk-config\.temp-\d+\.\d+$/,           // .i18ntk-config.temp-1234.5678
    /\.i18ntk-config\.\d+\.\d+\.tmp$/,          // Legacy pattern: .i18ntk-config.1234.5678.tmp
    /config\.temp-\d+\.\d+$/,                    // config.temp-1234.5678
    /config\.\d+\.\d+\.tmp$/,                   // Legacy pattern: config.1234.5678.tmp
    /\.temp-config\.json$/,                        // .temp-config.json
    /\.last-config\.json$/,                        // .last-config.json
    /\.lock$/,                                      // .lock files
    /settings\.lock$/                               // settings.lock
];

// Static properties for operation tracking
static _operationStack = new Set();
static _logging = false;

  constructor() {
    // Instance constructor - static properties are already initialized
  }

  /**
   * Timeout wrapper for synchronous operations to prevent hanging
   * @param {Function} operation - The synchronous operation to wrap
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} operationName - Name of the operation for logging
   * @returns {*} - Operation result or null if timeout/error
   */
  static withTimeoutSync(operation, timeoutMs = 5000, operationName = 'operation') {
    // Track recursion to prevent infinite loops
    if (!SecurityUtils._operationStack) {
      SecurityUtils._operationStack = new Set();
    }

    if (SecurityUtils._operationStack.has(operationName)) {
      SecurityUtils.logSecurityEvent('Recursion detected while performing secure operation', 'warn', {
        operation: operationName,
        source: 'internal'
      });
      return null;
    }

    SecurityUtils._operationStack.add(operationName);

    try {
      // Simple timeout using setTimeout for synchronous operations
      let result = null;
      let hasResult = false;
      let timeoutId = null;

      timeoutId = setTimeout(() => {
        if (!hasResult) {
          SecurityUtils.logSecurityEvent('Secure operation timeout', 'warn', {
            operation: operationName,
            timeoutMs,
            source: 'internal'
          });
        }
      }, timeoutMs);

      // Execute operation synchronously
      result = operation();
      hasResult = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return result;
    } catch (error) {
      SecurityUtils.logSecurityEvent('Secure operation error', 'error', {
        operation: operationName,
        error: error.message,
        source: 'internal'
      });
      return null;
    } finally {
      SecurityUtils._operationStack.delete(operationName);
    }
  }

  /**
   * Logs security events for monitoring
   * @param {string} event - Security event description
   * @param {string} level - Log level (info, warn, error)
   * @param {object} details - Additional details
   */
  static logSecurityEvent(event, level = 'info', details = {}) {
    if (SecurityUtils._logging) {
      return;
    }

    SecurityUtils._logging = true;
    try {
      const debugMode = logger.isDebugMode();
      const explicitSecurityLogs = envManager.getBoolean('I18NTK_ENABLE_SECURITY_LOGS');
      const source = details && details.source ? String(details.source).toLowerCase() : 'internal';
      const levelName = String(level || 'info').toLowerCase();
      const normalizedLevel = levelName === 'warning' ? 'warn' : levelName;

      // Security warnings from internal paths are noise during builds.
      if (!debugMode && !explicitSecurityLogs && source !== 'user') {
        return;
      }

      logger.security(normalizedLevel, event, {
        ...details,
        pid: process.pid,
        nodeVersion: process.version
      });
    } finally {
      SecurityUtils._logging = false;
    }
  }

  // Add other static methods here...
  static validatePath(filePath, basePath = process.cwd(), verbose = false) {
    const i18n = getI18n();
    const useI18n = i18n && i18n.isInitialized && typeof i18n.t === 'function';

    try {
    if (!filePath || typeof filePath !== 'string') {
        const message = useI18n
          ? i18n.t('security.pathValidationFailed')
          : 'Path validation failed';
        const reason = useI18n
          ? i18n.t('security.invalidInputType')
          : 'Invalid input type';
        SecurityUtils.logSecurityEvent(message, 'error', {
          inputPath: filePath,
          reason
        });
        return null;
      }

      const isWindowsAbsolute = /^[A-Z]:[\/\\]/i.test(filePath);
      const isUnixAbsolute = filePath.startsWith('/') || filePath.startsWith('\\');
      const isAbsolutePath = isWindowsAbsolute || isUnixAbsolute;
      const dangerousReason = detectDangerReason(filePath);
      const source = isInternalPath(filePath) ? 'internal' : 'user';

      // Only host-native absolute paths may use the internal-root fast path.
      // A foreign drive path can otherwise resolve as a relative filename.
      if (path.isAbsolute(filePath) && isInternalPath(filePath)) {
        return path.resolve(filePath);
      }

      // For absolute paths, defer trust decision to base-path containment checks below,
      // but still reject obvious shell/injection markers.
      if (isAbsolutePath && dangerousReason) {
        const message = useI18n
          ? i18n.t('security.pathTraversalAttempt')
          : 'Path traversal attempt';
        SecurityUtils.logSecurityEvent(message, 'warning', {
          inputPath: filePath,
          reason: dangerousReason,
          source
        });
        return null;
      }

      // Check for obvious dangerous patterns first for relative paths
      if (!isAbsolutePath && !SecurityUtils.isSafePath(filePath)) {
        const message = useI18n
          ? i18n.t('security.pathTraversalAttempt')
          : 'Path traversal attempt';
        SecurityUtils.logSecurityEvent(message, 'warning', {
          inputPath: filePath,
          reason: dangerousReason || 'Contains unsafe path segments',
          source
        });
        return null;
      }

      // Resolve base and target paths
      const base = fs.realpathSync(basePath);
      const resolvedPath = path.resolve(base, filePath);

      // Resolve the nearest existing ancestor as well as an existing target.
      // A new file can otherwise be written through a pre-existing symlink or
      // Windows junction in one of its parent directories.
      let finalPath = resolvedPath;
      let existingAncestor = resolvedPath;
      const missingParts = [];
      while (!fs.existsSync(existingAncestor)) {
        const parent = path.dirname(existingAncestor);
        if (parent === existingAncestor) break;
        missingParts.unshift(path.basename(existingAncestor));
        existingAncestor = parent;
      }
      try {
        const resolvedAncestor = fs.realpathSync(existingAncestor);
        finalPath = path.join(resolvedAncestor, ...missingParts);
      } catch {
        // The base path is realpath-validated above. Retain the resolved path
        // only if an unexpected filesystem error prevents ancestor resolution.
      }

      // Check for actual path traversal (going outside the base directory)
      const relativePath = path.relative(base, finalPath);
      // path.isAbsolute() follows the host OS, so also reject foreign-platform
      // absolute forms (for example a Windows drive path while running on Linux).
      const foreignAbsolute = /^[A-Z]:[\\/]/i.test(relativePath) || /^\\\\/.test(relativePath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || foreignAbsolute) {
        const message = useI18n
          ? i18n.t('security.pathTraversalAttempt')
          : 'Path traversal attempt';
        SecurityUtils.logSecurityEvent(message, 'warning', {
          inputPath: filePath,
          resolvedPath: finalPath,
          basePath: base,
          relativePath: relativePath,
          source
        });
        return null;
      }

      // Allow absolute paths that resolve within the project structure
      // The isSafePath check above already filtered out dangerous absolute paths

      if (verbose) {
        const successMsg = useI18n
          ? i18n.t('security.pathValidated')
          : 'Path validated';
        SecurityUtils.logSecurityEvent(successMsg, 'info', {
          inputPath: filePath,
          resolvedPath: finalPath,
          source
        });
      }
      return finalPath;
    } catch (error) {
      const message = useI18n
        ? i18n.t('security.pathValidationError')
        : 'Path validation error';
      SecurityUtils.logSecurityEvent(message, 'error', {
        inputPath: filePath,
        error: error.message,
        source: isInternalPath(filePath) ? 'internal' : 'user'
      });
      return null;
    }
  }

  static safeExistsSync(filePath, basePath, timeoutMs = 3000) {
    return this.withTimeoutSync(() => {
      const validatedPath = this.validatePath(filePath, basePath);
      if (!validatedPath) {
        return false;
      }
      try {
        return fs.existsSync(validatedPath);
      } catch (error) {
        return false;
      }
    }, timeoutMs, 'safeExistsSync');
  }

  static safeReadFileSync(filePath, basePath, encoding = 'utf8') {
    const validatedPath = this.validatePath(filePath, basePath);
    if (!validatedPath) {
      return null;
    }
    const i18n = getI18n();
    try {
      // Check if file exists and is readable
      fs.accessSync(validatedPath, fs.constants.R_OK);

      // Read file with size limit (10MB max)
      const stats = fs.statSync(validatedPath);
      if (stats.size > 10 * 1024 * 1024) {
      SecurityUtils.logSecurityEvent('File too large', 'warn', { filePath: validatedPath });
      return null;
      }

      return fs.readFileSync(validatedPath, encoding);
    } catch (error) {
    SecurityUtils.logSecurityEvent('File read error', 'error', { errorMessage: error.message });
    return null;
    }
  }

  static safeWriteFileSync(filePath, content, basePath, encoding = 'utf8') {
    const validatedPath = this.validatePath(filePath, basePath);
    if (!validatedPath) {
      return false;
    }

    try {
      // Validate content is a string or Buffer
      if (typeof content !== 'string' && !Buffer.isBuffer(content)) {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent('File write error: Content must be a string or Buffer', 'error');
        return false;
      }

      // Validate content size (10MB max)
      const contentSize = typeof content === 'string' ? content.length : content.length;
      if (contentSize > 10 * 1024 * 1024) {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent('Content too large for file', 'warn', { filePath: validatedPath });
        return false;
      }

      // Ensure directory exists
      const dir = path.dirname(validatedPath);
      fs.mkdirSync(dir, { recursive: true });

      // Write file with proper permissions
      fs.writeFileSync(validatedPath, content, { encoding, mode: 0o644 });
      return true;
    } catch (error) {
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent('File write error', 'error', { errorMessage: error.message });
      return false;
    }
  }

  /**
   * Async compatibility wrapper for safeReadFileSync.
   * @param {string} filePath
   * @param {string} basePath
   * @param {string} encoding
   * @returns {Promise<string|null>}
   */
  static async safeReadFile(filePath, basePath, encoding = 'utf8') {
    return this.safeReadFileSync(filePath, basePath, encoding);
  }

  /**
   * Async compatibility wrapper for safeWriteFileSync.
   * @param {string} filePath
   * @param {string|Buffer} content
   * @param {string} basePath
   * @param {string} encoding
   * @returns {Promise<boolean>}
   */
  static async safeWriteFile(filePath, content, basePath, encoding = 'utf8') {
    return this.safeWriteFileSync(filePath, content, basePath, encoding);
  }

  static safeStatSync(filePath, basePath) {
    const validatedPath = this.validatePath(filePath, basePath);
    if (!validatedPath) {
      return null;
    }
    try {
      return fs.statSync(validatedPath);
    } catch {
      return null;
    }
  }

  static safeReaddirSync(dirPath, basePath, options) {
    const validatedPath = this.validatePath(dirPath, basePath);
    if (!validatedPath) {
      return [];
    }
    try {
      return fs.readdirSync(validatedPath, options);
    } catch {
      return [];
    }
  }

  static safeMkdirSync(dirPath, basePath, options = { recursive: true }) {
    const validatedPath = this.validatePath(dirPath, basePath);
    if (!validatedPath) {
      return false;
    }
    try {
      fs.mkdirSync(validatedPath, options);
      return true;
    } catch {
      return false;
    }
  }

  static safeUnlinkSync(filePath, basePath) {
    const validatedPath = this.validatePath(filePath, basePath);
    if (!validatedPath) {
      return false;
    }
    try {
      fs.unlinkSync(validatedPath);
      return true;
    } catch {
      return false;
    }
  }

  static safeRmdirSync(dirPath, basePath) {
    const validatedPath = this.validatePath(dirPath, basePath);
    if (!validatedPath) {
      return false;
    }
    try {
      fs.rmdirSync(validatedPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safely parse JSON content.
   * Accepts both raw JSON strings and already-parsed objects.
   * @param {string|object} input - JSON string or object
   * @param {*} fallback - Value to return on parse error
   * @returns {*}
   */
  static safeParseJSON(input, fallback = null) {
    if (input === null || input === undefined) {
      return fallback;
    }

    if (typeof input === 'object' && !Array.isArray(input)) {
      try {
        var check = JSON.stringify(input);
        if (check.length > SecurityUtils.MAX_JSON_SIZE) {
          SecurityUtils.logSecurityEvent('Oversized JSON input', 'error', { size: check.length });
          return fallback;
        }
        return JSON.parse(check);
      } catch (e) {
        SecurityUtils.logSecurityEvent('JSON re-parse failed', 'error', { error: e.message });
        return fallback;
      }
    }

    if (typeof input !== 'string') {
      return fallback;
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return fallback;
    }

    if (trimmed.length > SecurityUtils.MAX_JSON_SIZE) {
      SecurityUtils.logSecurityEvent('Oversized JSON string', 'error', { size: trimmed.length });
      return fallback;
    }

    // Quick heuristic for deeply nested JSON — reject content with excessive
    // bracket depth before attempting to parse.
    let depth = 0;
    let maxDepth = 0;
    for (let i = 0; i < Math.min(trimmed.length, 500000); i++) {
      if (trimmed[i] === '{' || trimmed[i] === '[') depth++;
      else if (trimmed[i] === '}' || trimmed[i] === ']') depth--;
      maxDepth = Math.max(maxDepth, depth);
    }
    if (maxDepth > SecurityUtils.MAX_JSON_DEPTH) {
      SecurityUtils.logSecurityEvent('Excessively deep JSON', 'error', { maxDepth });
      return fallback;
    }

    try {
      const normalized = trimmed.charCodeAt(0) === 0xFEFF ? trimmed.slice(1) : trimmed;
      return JSON.parse(normalized);
    } catch (error) {
      SecurityUtils.logSecurityEvent('Invalid JSON content', 'error', { error: error.message });
      return fallback;
    }
  }

  /**
   * Sanitize input string by removing HTML, scripts, and disallowed characters.
   * @param {string} input - Input string to sanitize
   * @param {object} [options] - Sanitization options
   * @param {RegExp} [options.allowedChars=/^[a-zA-Z0-9\s\-_\.\,\!\?\(\)\[\]:;"'\/]+$/] - Allowed character set.
   *   Default excludes: curly braces {}, @, $, %, ^, &, *, =, +, |, ~, `, <, >, backslash.
   *   Callers handling ICU messages, emails, currency, or code MUST override this.
   * @param {number} [options.maxLength=1000] - Maximum output length
   * @param {boolean} [options.removeHTML=true] - Strip HTML tags
   * @param {boolean} [options.removeScripts=true] - Strip script-like patterns
   * @returns {string} Sanitized string
   */
  static sanitizeInput(input, options = {}) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const {
      allowedChars = /^[a-zA-Z0-9\s\-_\.\,\!\?\(\)\[\]:;"'\/]+$/,
      maxLength = 1000,
      removeHTML = true,
      removeScripts = true
    } = options;

    let sanitized = input.trim();

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Remove HTML tags if requested
    if (removeHTML) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Remove script-like content
    if (removeScripts) {
      sanitized = sanitized.replace(/javascript:/gi, '');
      sanitized = sanitized.replace(/on\w+\s*=/gi, '');
      sanitized = sanitized.replace(/eval\s*\(/gi, '');
      sanitized = sanitized.replace(/function\s*\(/gi, '');
    }

    // Check against allowed characters - suppress warnings for normal operations
    if (!allowedChars.test(sanitized)) {
      // Skip warning for common file path characters and reduce verbosity
      const isFilePath = sanitized.includes('/') || sanitized.includes('\\') || sanitized.includes('.');
      const isCommonContent = sanitized.length < 1000 && !sanitized.includes('<script');
      if (!isFilePath && !isCommonContent) {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent('Input contains disallowed characters', 'warn');
      }
      // Strip characters outside the safe character set.
      // Build allowed set from the regex pattern: extract the character class from ^[...]+$
      const source = allowedChars.source;
      const classMatch = source.match(/^\^\[(.+)\]\+\$$/);
      if (classMatch) {
        // Use the raw character class directly (classes like a-z, s, d are ranges)
        const strictRegex = new RegExp(`[^${classMatch[1]}]`, 'g');
        sanitized = sanitized.replace(strictRegex, '');
      } else {
        // Safe fallback that excludes backslash, braces, angle brackets
        sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_\.\,\!\?\(\)\[\]:;"'\/]/g, '');
      }
    }

    return sanitized;
  }

  static generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  static safeJoin(basePath, ...paths) {
  if (!basePath || typeof basePath !== 'string') {
  return false;
  }
  try {
  const resolvedBase = path.resolve(basePath);
  const joinedPath = path.join(resolvedBase, ...paths);
  const resolvedPath = path.resolve(joinedPath);
  const relativePath = path.relative(resolvedBase, resolvedPath);
  
  // Ensure the final path is within the base directory
  if (relativePath.startsWith('..')) {
  SecurityUtils.logSecurityEvent('Path traversal attempt detected in safeJoin', 'error', {
  basePath,
  paths,
  resolvedPath,
  source: 'internal'
  });
  return false;
  }
  return resolvedPath;
  } catch (error) {
  SecurityUtils.logSecurityEvent('Error in safeJoin', 'error', {
  basePath,
  paths,
  error: error.message,
  source: 'internal'
  });
  return false;
  }
  }
  
  static isSafePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
  return false;
  }
  
    // Allow legitimate Windows drive letter paths
    if (filePath.match(/^[A-Z]:[\/\\]/)) {
      const afterDrive = filePath.substring(3);
      // Only check the part after the drive letter for dangerous patterns
      const dangerousPatterns = [
        /\.\./,           // Parent directory traversal
        /~/,              // Home directory
        /\$\{/,           // Variable expansion
        /`/,              // Command substitution
        /\|/,             // Pipe
        /;/,              // Command separator
        /&/,              // Background process
        />/,              // Redirect
        /</               // Redirect
      ];
      return !dangerousPatterns.some(pattern => pattern.test(afterDrive));
    }

    // Check for dangerous patterns in non-Windows paths
    const dangerousPatterns = [
      /\.\./,           // Parent directory traversal
      /^\//,            // Absolute path (Unix) - but allow for legitimate use
      /~/,              // Home directory
      /\$\{/,           // Variable expansion
      /`/,              // Command substitution
      /\|/,             // Pipe
      /;/,              // Command separator
      /&/,              // Background process
      />/,              // Redirect
      /</               // Redirect
    ];

    // Allow absolute paths that are within the project structure
    if (filePath.startsWith('/') || filePath.startsWith('\\')) {
      // Treat raw Unix-style absolute input as dangerous by default in this helper.
      // `validatePath` can still permit absolute paths if they resolve within basePath.
      const hasDangerousPatterns = dangerousPatterns.slice(1).some(pattern => pattern.test(filePath));
      return !hasDangerousPatterns;
    }

    return !dangerousPatterns.some(pattern => pattern.test(filePath));
  }
  static validateConfig(config) {
    if (!config || typeof config !== 'object') {
      SecurityUtils.logSecurityEvent('Invalid configuration object provided', 'error', {
        configType: typeof config
      });
      return {};
    }

    const sanitized = { ...config };
    const i18n = getI18n();

    // Define allowed configuration properties
    const allowedProperties = new Set([
      // Core directories and paths
      'projectRoot', 'sourceDir', 'i18nDir', 'outputDir', 'backupDir', 'tempDir', 'cacheDir', 'configDir',
      // Language settings
      'sourceLanguage', 'uiLanguage', 'language', 'defaultLanguages', 'supportedLanguages',
      // Translation markers and content
      'notTranslatedMarker', 'notTranslatedMarkers', 'translatedMarker', 'translatedMarkers',
      'allowedEnglishTerms', 'englishContentThresholdPercent',
      // File handling
      'supportedExtensions', 'excludeFiles', 'excludeDirs', 'includeFiles', 'includeDirs',
      // Operational settings
      'strictMode', 'debug', 'displayPaths', 'version', 'scriptDirectories', 'autoTranslate',
      // Framework and processing
      'framework', 'processing', 'performance', 'advanced',
      // UI and theme settings
      'theme', 'ui', 'setup', 'reports', 'display', 'interface',
      // Security and settings
      'security', 'settings', 'preferences', 'config', 'configuration',
// Extension-owned config sections. The CLI preserves these but ignores unknown nested keys.
      'extensions',
      // Custom namespace for preserving unknown user/extension config keys
      'custom',
      // Additional common properties
      'autoSave', 'autoBackup', 'validateOnSave', 'showWarnings', 'verbose',
      'timeout', 'retries', 'batchSize', 'maxConcurrency', 'cacheEnabled',
      // Date and reporting options used by existing settings
      'dateFormat', 'timeFormat', 'timezone', 'reportLanguage', 'dateTime'
    ]);

    // Remove unknown properties - preserve them under a custom namespace
    const customProperties = {};
    Object.keys(sanitized).forEach(key => {
      if (!allowedProperties.has(key)) {
        // Only log warnings for properties that might be security risks
        const value = sanitized[key];
        const isSuspicious = typeof value === 'string' &&
          (value.includes('..') || value.includes('/') || value.includes('\\') ||
           value.includes('$') || value.includes('`') || value.includes('|') ||
           value.includes(';') || value.includes('&'));

        if (isSuspicious) {
          SecurityUtils.logSecurityEvent('Removing potentially suspicious configuration property', 'warn', {
            property: key,
            value: sanitized[key]
          });
        } else {
          // Preserve unknown non-suspicious properties under custom namespace
          SecurityUtils.logSecurityEvent('Preserving unknown configuration property under custom namespace', 'info', {
            property: key,
            value: sanitized[key]
          });
          customProperties[key] = sanitized[key];
        }
        delete sanitized[key];
      }
    });

    // Store preserved custom properties
    if (Object.keys(customProperties).length > 0) {
      sanitized.custom = { ...(sanitized.custom || {}), ...customProperties };
    }

    // Validate and sanitize path properties
    const pathProperties = ['projectRoot', 'sourceDir', 'i18nDir', 'outputDir', 'backupDir', 'tempDir', 'cacheDir', 'configDir'];

    pathProperties.forEach(prop => {
      if (sanitized[prop] && typeof sanitized[prop] === 'string') {
        let originalPath = sanitized[prop];
        
        // Skip validation for legitimate absolute paths
        const isWindowsAbsolute = originalPath.match(/^[A-Z]:[\/\\]/i);
        const isUnixAbsolute = originalPath.startsWith('/') || originalPath.startsWith('\\');
        
        if (isWindowsAbsolute || isUnixAbsolute) {
          if (!SecurityUtils.isSafePath(originalPath)) {
            SecurityUtils.logSecurityEvent('Path validation failed for configuration property', 'warn', {
              property: prop,
              originalPath: originalPath
            });
          }
          return;
        }
        
        // Only validate relative paths for dangerous patterns
        if (!SecurityUtils.isSafePath(originalPath)) {
          SecurityUtils.logSecurityEvent('Path validation failed for configuration property', 'warn', {
            property: prop,
            originalPath: originalPath
          });
          
          // For relative paths, ensure they're safe
          let sanitizedPath = originalPath.replace(/\.\.[\/\\]/g, '');
          sanitizedPath = sanitizedPath.replace(/[|;&$`{}()[\]<>?]/g, '');
          
          if (sanitizedPath !== originalPath) {
            SecurityUtils.logSecurityEvent('Path sanitized for configuration property', 'info', {
              property: prop,
              originalPath: originalPath,
              sanitizedPath: sanitizedPath
            });
            sanitized[prop] = sanitizedPath;
          }
        }
      }
    });

    // Validate security settings
    if (sanitized.security) {
      const security = sanitized.security;

      // Validate session timeout (should be reasonable)
      if (security.sessionTimeout && (typeof security.sessionTimeout !== 'number' || security.sessionTimeout < 60000 || security.sessionTimeout > 86400000)) {
        SecurityUtils.logSecurityEvent('Invalid session timeout in security configuration', 'warn', {
          sessionTimeout: security.sessionTimeout
        });
        security.sessionTimeout = 1800000; // Default to 30 minutes
      }

      // Validate max failed attempts
      if (security.maxFailedAttempts && (typeof security.maxFailedAttempts !== 'number' || security.maxFailedAttempts < 1 || security.maxFailedAttempts > 10)) {
        SecurityUtils.logSecurityEvent('Invalid max failed attempts in security configuration', 'warn', {
          maxFailedAttempts: security.maxFailedAttempts
        });
        security.maxFailedAttempts = 3; // Default to 3 attempts
      }
    }

    // Validate language settings
    if (sanitized.sourceLanguage && typeof sanitized.sourceLanguage === 'string') {
      // Sanitize language code (only allow alphanumeric, hyphens, underscores)
      sanitized.sourceLanguage = sanitized.sourceLanguage.replace(/[^a-zA-Z0-9\-_]/g, '');
    }

    if (sanitized.uiLanguage && typeof sanitized.uiLanguage === 'string') {
      sanitized.uiLanguage = sanitized.uiLanguage.replace(/[^a-zA-Z0-9\-_]/g, '');
    }

    // Validate default languages array
    if (sanitized.defaultLanguages && Array.isArray(sanitized.defaultLanguages)) {
      sanitized.defaultLanguages = sanitized.defaultLanguages
        .filter(lang => typeof lang === 'string')
        .map(lang => lang.replace(/[^a-zA-Z0-9\-_]/g, ''))
        .filter(lang => lang.length > 0);
    }

    SecurityUtils.logSecurityEvent('Configuration validation completed', 'info', {
      propertiesCount: Object.keys(sanitized).length,
      sanitizedPaths: pathProperties.filter(prop => sanitized[prop]).length
    });

    return sanitized;
  }
}

module.exports = SecurityUtils;
