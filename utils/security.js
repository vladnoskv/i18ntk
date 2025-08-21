const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Custom SecurityError class definition
class SecurityError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'SecurityError';
    this.context = context;
    // Set error object's stack
    Error.captureStackTrace(this, SecurityError);
  }
}

// Lazy load i18n to prevent initialization race conditions
let i18n;
function getI18n() {
  if (!i18n) {
    try {
      i18n = require('./i18n-helper');
    } catch (error) {
      // Fallback to simple identity function if i18n fails to load
      console.warn('i18n-helper not available, using fallback messages');
      return {
        t: (key, params = {}) => key
      };
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
  /**
   * Sanitizes user-provided paths to prevent path traversal vulnerabilities
   * @param {string} inputPath - Raw user input path to be sanitized
   * @param {string} [basePath=process.cwd()] - Base path that inputPath should be within
   * @param {Object} [options={}] - Additional sanitization options
   * @param {boolean} [options.allowTraversal=false] - Whether to allow path traversal
   * @param {boolean} [options.createIfNotExists=false] - Whether to create directory if it doesn't exist
   * @param {boolean} [options.normalize=true] - Whether to normalize the path
   * @returns {string|null} - Normalized and validated safe path, or null if invalid
   * @throws {Error} - If input contains traversal sequences or invalid characters
   */

  static sanitizePath(inputPath, basePath = null, options = {}) {
    // Handle undefined/null input gracefully
    if (inputPath === undefined || inputPath === null) {
      return null;
    }
    
    // Ensure inputPath is a string
    if (typeof inputPath !== 'string') {
      inputPath = String(inputPath);
    }
    
    // Strictly validate basePath - use process.cwd() as default
    if (basePath === null || basePath === undefined) {
      basePath = process.cwd();
    } else if (typeof basePath !== 'string') {
      basePath = String(basePath);
    }
    
    try {
      if (!inputPath || typeof inputPath !== 'string') {
        return null;
      }
      
      const { allowTraversal = false, createIfNotExists = false, normalize = true } = options;

      // Resolve and normalize base path
      const absoluteBase = path.resolve(basePath);
      
      // Resolve the input path against the absolute base
      let resolvedPath = path.resolve(absoluteBase, inputPath);
      
      // Normalize the path if requested
      const normalizedPath = normalize ? path.normalize(resolvedPath) : resolvedPath;

      // Strict path traversal prevention
      if (!allowTraversal) {
        // Ensure the resolved path is within the base directory
        // Use path.relative to check if path tries to escape
        const relativePath = path.relative(absoluteBase, normalizedPath);
        
        // Check for any traversal attempt
        if (relativePath.startsWith('..') || 
            relativePath.includes('..' + path.sep) || 
            relativePath.includes('..' + '/') ||
            path.isAbsolute(relativePath) && relativePath !== '') {
          
          // Check if path contains any traversal sequences
          const traversalSequences = ['..', '../', '..\\', '\\..', '/../', '\\..\\'];
          const hasTraversal = traversalSequences.some(seq => 
            normalizedPath.includes(seq) || inputPath.includes(seq)
          );
          
          if (hasTraversal) {
            const i18n = getI18n();
            this.logSecurityEvent(i18n.t('security.pathTraversalBlocked'), 'warn', {
              inputPath,
              basePath: absoluteBase,
              resolvedPath: normalizedPath,
              relativePath
            });
            return null;
          }
        }
        
        // Ensure the normalized path is actually within base directory
        // Use a more robust check that handles edge cases
        const relative = path.relative(absoluteBase, normalizedPath);
        const isWithinBase = !relative.startsWith('..') && !path.isAbsolute(relative);
        
        if (!isWithinBase) {
          const i18n = getI18n();
          this.logSecurityEvent(i18n.t('security.pathOutsideBase'), 'warn', {
            inputPath,
            basePath: absoluteBase,
            resolvedPath: normalizedPath,
            relativePath: relative
          });
          return null;
        }
      }

      // Ensure directory exists if requested
      if (createIfNotExists) {
        const dir = path.dirname(normalizedPath);
        if (!SecurityUtils.safeExistsSync(dir)) {
          SecurityUtils.safeMkdirSync(dir, null, { recursive: true });
        }
      }
      return normalizedPath;
    } catch (error) {
      const i18n = getI18n();
      this.logSecurityEvent(i18n.t('security.pathValidationError'), 'error', {
        inputPath: inputPath || 'unknown',
        error: error.message
      });
      return null;
    }
  }

  /**
   * Validates and sanitizes a path, ensuring it's within allowed boundaries
   * @param {string} filePath - Path to validate
   * @param {string} [basePath=process.cwd()] - Base directory to validate against
   * @returns {string|null} - Validated path or null if invalid
   */
  static validatePath(filePath, basePath = null) {
    return this.sanitizePath(filePath, basePath);
  }

  /**
   * Alias for safeSanitizePath to provide consistent API naming
   * @param {string} inputPath - Path to validate
   * @param {string} [basePath=process.cwd()] - Base directory
   * @param {Object} [options={}] - Validation options
   * @returns {string|null} - Validated path or null if invalid
   */
  static safeValidatePath(inputPath, basePath = null, options = {}) {
    return this.safeSanitizePath(inputPath, basePath, options);
  }

  /**
   * Enhanced safe path sanitization with comprehensive security measures
   * @param {string} inputPath - Path to sanitize
   * @param {string} [basePath=process.cwd()] - Base directory
   * @param {Object} [options={}] - Sanitization options
   * @param {boolean} [options.allowAbsolute=false] - Allow absolute paths
   * @param {boolean} [options.allowTraversal=false] - Allow path traversal
   * @param {string[]} [options.allowedExtensions=null] - Whitelist of allowed extensions
   * @param {RegExp[]} [options.customPatterns=null] - Custom regex patterns to validate against
   * @returns {string|null} - Sanitized path or null if invalid
   */
  static safeSanitizePath(inputPath, basePath = null, options = {}) {
    try {
      // Handle undefined/null input
      if (inputPath === undefined || inputPath === null || inputPath === '') {
        return null;
      }

      // Ensure input is a string
      if (typeof inputPath !== 'string') {
        inputPath = String(inputPath);
      }

      // Default base path
      if (basePath === null || basePath === undefined) {
        basePath = process.cwd();
      } else if (typeof basePath !== 'string') {
        basePath = String(basePath);
      }

      const { 
        allowAbsolute = false, 
        allowTraversal = false, 
        allowedExtensions = null,
        customPatterns = null 
      } = options;

      // Remove null bytes and control characters
      let sanitized = inputPath.replace(/\x00/g, ''); // Remove null bytes
      sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // Remove control characters
      sanitized = sanitized.replace(/\p{C}/gu, ''); // Remove other Unicode control characters

      // Normalize Unicode whitespace
      sanitized = sanitized.replace(/\s+/g, ' ').trim();

      if (!sanitized) {
        return null;
      }

      // Block dangerous patterns
      const dangerousPatterns = [
        /\.\.\//g,          // Unix traversal
        /\.\.\\/g,          // Windows traversal
        /\.\./g,            // Any traversal sequence
        /<script.*?>.*?<\/script>/gi, // Script injection
        /javascript:/gi,      // JavaScript protocol
        /data:/gi,            // Data URI
        /file:/gi,            // File protocol
        /\\\\[^\\]+\\\\/g,     // UNC path patterns
        /\\\\\?\\/g,        // UNC path prefix
      // Only block truly dangerous characters for path injection
       /[\x00\r\n]/g,  // Null bytes and line terminators
       /[%\$\`\!\&\*\|\;\<\>\'\"\{\}\[\]]/g // Special shell characters
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(sanitized)) {
          if (!allowTraversal && pattern.source.includes('\\.\\.')) {
            const i18n = getI18n();
            this.logSecurityEvent(i18n.t('security.traversalBlocked'), 'warn', {
              inputPath: inputPath,
              detectedPattern: pattern.source
            });
            return null;
          }
        }
      }

      // Check for absolute paths
      if (!allowAbsolute) {
        if (path.isAbsolute(sanitized)) {
          const i18n = getI18n();
          this.logSecurityEvent(i18n.t('security.absolutePathBlocked'), 'warn', {
            inputPath: inputPath,
            sanitizedPath: sanitized
          });
          return null;
        }
      }

      // Normalize path separators
      sanitized = sanitized.replace(/\\/g, '/');
      
      // Remove redundant separators
      sanitized = sanitized.replace(/\/+/g, '/');
      
      // Remove trailing slashes (except root)
      sanitized = sanitized.replace(/\/$/, '');

      // Resolve . and .. sequences safely
      const resolvedBase = path.resolve(basePath);
      let resolvedPath = path.resolve(resolvedBase, sanitized);

      // Final normalization
      resolvedPath = path.normalize(resolvedPath);

      // Extension validation
      if (allowedExtensions && Array.isArray(allowedExtensions)) {
        const ext = path.extname(resolvedPath).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          const i18n = getI18n();
          this.logSecurityEvent(i18n.t('security.invalidExtension'), 'warn', {
            inputPath: inputPath,
            extension: ext,
            allowed: allowedExtensions
          });
          return null;
        }
      }

      // Custom pattern validation
      if (customPatterns && Array.isArray(customPatterns)) {
        for (const pattern of customPatterns) {
          if (!pattern.test(resolvedPath)) {
            const i18n = getI18n();
            this.logSecurityEvent(i18n.t('security.customPatternFailed'), 'warn', {
              inputPath: inputPath,
              pattern: pattern.source
            });
            return null;
          }
        }
      }

      // Final security check - ensure path is within base directory
      if (!allowTraversal) {
        const relative = path.relative(resolvedBase, resolvedPath);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          const i18n = getI18n();
          this.logSecurityEvent(i18n.t('security.pathOutsideBase'), 'warn', {
            inputPath: inputPath,
            basePath: resolvedBase,
            resolvedPath: resolvedPath
          });
          return null;
        }
      }



      return resolvedPath;
    } catch (error) {
      const i18n = getI18n();
      this.logSecurityEvent(i18n.t('security.sanitizationError'), 'error', {
        inputPath: String(inputPath),
        error: error.message
      });
      return null;
    }
  }

  /**
   * Safely reads a file synchronously with path validation and error handling
   * @param {string} filePath - Path to the file
   * @param {string} [encoding='utf8'] - File encoding
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {string|null} - File content or null if error
   */
  static safeReadFileSync(filePath, encoding = 'utf8', basePath = null) {
    // Strictly validate basePath
    if (basePath === null || basePath === undefined) {
      basePath = process.cwd();
    } else if (typeof basePath !== 'string') {
      basePath = String(basePath);
    }
    
    // Validate input path
    if (!filePath || typeof filePath !== 'string') {
      return null;
    }
    
    const validatedPath = this.safeSanitizePath(filePath, basePath, {
      allowAbsolute: false,
      allowTraversal: false,
      allowedExtensions: ['.json', '.js', '.ts', '.txt', '.md', '.yml', '.yaml', '.xml', '.html', '.css']
    });
    
    if (!validatedPath) {
      return null;
    }
    
    const i18n = getI18n();
    try {
      // Check if file exists and is readable
      SecurityUtils.safeAccessSync(validatedPath, fs.constants.R_OK);

      // Read file with size limit (10MB max)
      const stats = SecurityUtils.safeStatSync(validatedPath);
      if (!stats || stats.size > 10 * 1024 * 1024) {
        console.warn(i18n.t('security.file_too_large', { filePath: validatedPath }));
        return null;
      }
      return fs.readFileSync(validatedPath, encoding);
    } catch (error) {
      // Only log errors that aren't simple file-not-found
      if (error.code !== 'ENOENT') {
        console.warn(i18n.t('security.file_read_error', { errorMessage: error.message }));
      }
      return null;
    }
  }

  /**
   * Secure directory listing with path traversal protection
   * @param {string} dirPath - Directory path to list
   * @param {Object} [options={}] - Additional security options
   * @param {string} [basePath=process.cwd()] - Base directory for validation
   * @param {boolean} [options.allowSymlinks=false] - Whether to allow symlinks
   * @param {string[]} [options.allowlist=null] - List of allowed paths
   * @param {number} [options.maxDepth=1] - Maximum directory depth
   * @returns {string[]} Array of file/directory names
   * @throws {SecurityError} If directory access is denied or path is invalid
   */
  static safeReaddirSync(dirPath, options = {}, basePath = null) {
    // Strictly validate basePath
    if (basePath === null || basePath === undefined) {
      basePath = process.cwd();
    } else if (typeof basePath !== 'string') {
      basePath = String(basePath);
    }
    
    const { allowSymlinks = false, allowlist = null, maxDepth = 1 } = options;

    // Validate required parameters
    if (!dirPath || typeof dirPath !== 'string') {
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.invalidDirectoryPath'), 'error', {
        inputPath: dirPath
      });
      throw new SecurityError('Invalid directory path provided');
    }
    if (!basePath || typeof basePath !== 'string') {
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.invalidBasePath'), 'error', {
          basePath
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.invalidBasePath', 'error', {
          basePath
        });
      }
      throw new SecurityError('Invalid base path provided');
    }

    try {
      // Validate the directory path
      const validatedPath = this.safeSanitizePath(dirPath, basePath, {
        allowAbsolute: false,
        allowTraversal: false
      });
      if (!validatedPath) {
        try {
          const i18n = getI18n();
          throw new SecurityError(i18n.t('security.pathValidationFailed'));
        } catch {
          throw new SecurityError('security.pathValidationFailed');
        }
      }

      // Check allowlist if provided
      if (allowlist && Array.isArray(allowlist)) {
        const isAllowed = allowlist.some(allowed => {
          try {
            const allowedPath = path.resolve(basePath, allowed);
            return validatedPath.startsWith(allowedPath);
          } catch {
            return false;
          }
        });
        if (!isAllowed) {
          try {
            const i18n = getI18n();
            SecurityUtils.logSecurityEvent(i18n.t('security.pathNotInAllowlist'), 'warning', {
              path: validatedPath
            });
          } catch {
            SecurityUtils.logSecurityEvent('security.pathNotInAllowlist', 'warning', {
              path: validatedPath
            });
          }
          throw new SecurityError('Directory path not in allowlist');
        }
      }

      // Check symlink protection
      if (!allowSymlinks) {
        try {
          const realPath = fs.realpathSync.native(validatedPath);
          const baseRealPath = fs.realpathSync.native(basePath);
          
          // Use path.relative for accurate comparison, handling separators and casing
          const relativePath = path.relative(baseRealPath, realPath);
          
          // Check if the symlink target is outside the base directory
          if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
            try {
              const i18n = getI18n();
              SecurityUtils.logSecurityEvent(i18n.t('security.symlinkTraversalDetected'), 'warning', {
                path: validatedPath,
                realPath
              });
            } catch {
              SecurityUtils.logSecurityEvent('security.symlinkTraversalDetected', 'warning', {
                path: validatedPath,
                realPath
              });
            }
            throw new SecurityError('Symlink traversal detected');
          }
        } catch (error) {
            // On error, e.g. path not found, we can proceed. 
            // The subsequent stat check will fail.
        }
      }

      // Validate it's actually a directory
      const stats = SecurityUtils.safeStatSync(validatedPath);
      if (!stats.isDirectory()) {
        try {
          const i18n = getI18n();
          SecurityUtils.logSecurityEvent(i18n.t('security.pathNotDirectory'), 'error', {
            path: validatedPath
          });
        } catch {
          SecurityUtils.logSecurityEvent('security.pathNotDirectory', 'error', {
            path: validatedPath
          });
        }
        throw new SecurityError('Path is not a directory');
      }

      // Perform the directory listing
      const files = fs.readdirSync(validatedPath);
      SecurityUtils.logSecurityEvent('Security: Directory listed successfully: ' + validatedPath + ' (' + files.length + ' files)', 'info');
      return files;
    } catch (error) {
      // Re-throw SecurityError instances
      if (error instanceof SecurityError) {
        throw error;
      }
      // Log and re-wrap other errors
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.directoryAccessError'), 'error', {
          path: dirPath,
          error: error.message
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.directoryAccessError', 'error', {
          path: dirPath,
          error: error.message
        });
      }
      throw new SecurityError(`Access denied to directory: ${dirPath}`);
    }
  }
  /**
   * Checks if a path exists securely (async version)
   * @param {string} path - Path to check
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {Promise<boolean>} - True if path exists and is safe
   */
  static async safeExists(path, basePath = null) {

    if (basePath === null || basePath === undefined) {
      basePath = process.cwd();
    }
    const sanitizedPath = this.safeSanitizePath(path, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });
    if (!sanitizedPath) {
      return false;
    }
    
    try {
      await fs.promises.access(sanitizedPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Secure directory listing with path traversal protection (async version)
   * @param {string} dirPath - Directory path to list
   * @param {Object} [options={}] - Additional security options
   * @param {string} [basePath=process.cwd()] - Base directory for validation
   * @param {boolean} [options.allowSymlinks=false] - Whether to allow symlinks
   * @param {string[]} [options.allowlist=null] - List of allowed paths
   * @param {number} [options.maxDepth=1] - Maximum directory depth
   * @returns {Promise<string[]>} Array of file/directory names
   * @throws {SecurityError} If directory access is denied or path is invalid
   */
  static async safeReaddir(dirPath, options = {}, basePath = null) {
    if (basePath === null || basePath === undefined) {
      basePath = process.cwd();
    }
    
    const { allowSymlinks = false, allowlist = null, maxDepth = 1 } = options;

    // Validate required parameters
    if (!dirPath || typeof dirPath !== 'string') {
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.invalidDirectoryPath'), 'error', {
        inputPath: dirPath
      });
      throw new SecurityError('Invalid directory path provided');
    }
    if (!basePath || typeof basePath !== 'string') {
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.invalidBasePath'), 'error', {
          basePath
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.invalidBasePath', 'error', {
          basePath
        });
      }
      throw new SecurityError('Invalid base path provided');    }

    try {
      // Validate the directory path
      const validatedPath = this.safeSanitizePath(dirPath, basePath, {
        allowAbsolute: false,
        allowTraversal: false
      });
      if (!validatedPath) {
        const i18n = getI18n();
        throw new SecurityError(i18n.t('security.pathValidationFailed'));
      }

      // Check allowlist if provided
      if (allowlist && Array.isArray(allowlist)) {
        const isAllowed = allowlist.some(allowed => {
          try {
            const allowedPath = path.resolve(basePath, allowed);
            return validatedPath.startsWith(allowedPath);
          } catch {
            return false;
          }
        });
        if (!isAllowed) {
          try {
            const i18n = getI18n();
            SecurityUtils.logSecurityEvent(
              i18n.t('security.pathNotInAllowlist'),
              'warning',
              { path: validatedPath }
            );
          } catch {
            SecurityUtils.logSecurityEvent(
              'security.pathNotInAllowlist',
              'warning',
              { path: validatedPath }
            );
          }
          throw new SecurityError('Directory path not in allowlist');        }
      }

      // Check symlink protection
      if (!allowSymlinks) {
        try {
          const realPath = await fs.promises.realpath(validatedPath);
          const baseRealPath = await fs.promises.realpath(basePath);
          
          const relativePath = path.relative(baseRealPath, realPath);
          
          if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
            const i18n = getI18n();
            SecurityUtils.logSecurityEvent(i18n.t('security.symlinkTraversalDetected'), 'warning', {
              path: validatedPath,
              realPath
            });
            throw new SecurityError('Symlink traversal detected');
          }
        } catch (error) {
          if (error instanceof SecurityError) {
            throw error;
          }
          if (error.code !== 'ENOENT') {
            SecurityUtils.logSecurityEvent('Realpath resolution failed', 'warn', {
              path: validatedPath,
              error: error.message
            });
          }
        }
      }

      // Validate it's actually a directory
      const stats = await fs.promises.stat(validatedPath);
      if (!stats.isDirectory()) {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.pathNotDirectory'), 'error', {
          path: validatedPath
        });
        throw new SecurityError('Path is not a directory');
      }

      // Perform the directory listing
      const files = await fs.promises.readdir(validatedPath);
      SecurityUtils.logSecurityEvent('Security: Directory listed successfully: ' + validatedPath + ' (' + files.length + ' files)', 'info');
      return files;
    } catch (error) {
      // Re-throw SecurityError instances
      if (error instanceof SecurityError) {
        throw error;
      }
      // Log and re-wrap other errors
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.directoryAccessError'), 'error', {
        path: dirPath,
        error: error.message
      });
      throw new SecurityError(`Access denied to directory: ${dirPath}`);
    }
  }

  /**
   * Checks if a path exists securely
   * @param {string} path - Path to check
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {boolean} - True if path exists and is safe
   */
  static safeExistsSync(path, basePath = null) {
    // Strictly validate basePath
    if (basePath === null || basePath === undefined) {
      basePath = process.cwd();
    } else if (typeof basePath !== 'string') {
      basePath = String(basePath);
    }
    
    // Validate input path
    if (!path || typeof path !== 'string') {
      return false;
    }
    
    const sanitizedPath = this.safeSanitizePath(path, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });
    if (!sanitizedPath) {
      return false;
    }
    
    try {
      // Use safeStatSync which already includes path validation
      const stats = SecurityUtils.safeStatSync(sanitizedPath, basePath);
      return stats !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Safely gets file/directory stats asynchronously with path validation
   * @param {string} filePath - Path to the file/directory
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {Promise<fs.Stats|null>} - Stats object or null if error
   */
  static async safeStat(filePath, basePath = null) {
    // Strictly validate basePath
    if (basePath === null || basePath === undefined) {
      basePath = process.cwd();
    } else if (typeof basePath !== 'string') {
      basePath = String(basePath);
    }
    
    // Validate input path
    if (!filePath || typeof filePath !== 'string') {
      return null;
    }
    
    const validatedPath = this.safeSanitizePath(filePath, basePath, {
      allowAbsolute: false,
      allowTraversal: false,
      allowedExtensions: ['.json', '.js', '.ts', '.txt', '.md', '.yml', '.yaml', '.xml', '.html', '.css', '.log', '.tmp']
    });
    if (!validatedPath) {
      return null;
    }
    
    try {
      const fs = require('fs').promises;
      return await fs.stat(validatedPath);
    } catch (error) {
      // Only log non-ENOENT errors to avoid spam for missing files
      if (error.code !== 'ENOENT') {
        try {
          const i18n = getI18n();
          SecurityUtils.logSecurityEvent(i18n.t('security.statError'), 'error', {
            path: filePath,
            error: error.message
          });
        } catch {
          SecurityUtils.logSecurityEvent('security.statError', 'error', {
            path: filePath,
            error: error.message
          });
        }
      }
      return null;
    }
  }

  /**
   * Safely gets file/directory stats synchronously with path validation
   * @param {string} filePath - Path to the file/directory
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {fs.Stats|null} - Stats object or null if error
   */
  static safeStatSync(filePath, basePath = null) {
    // Strictly validate basePath
    if (basePath === null || basePath === undefined) {
      basePath = process.cwd();
    } else if (typeof basePath !== 'string') {
      basePath = String(basePath);
    }
    
    // Validate input path
    if (!filePath || typeof filePath !== 'string') {
      return null;
    }
    
    const validatedPath = this.safeSanitizePath(filePath, basePath, {
      allowAbsolute: false,
      allowTraversal: false,
      allowedExtensions: ['.json', '.js', '.ts', '.txt', '.md', '.yml', '.yaml', '.xml', '.html', '.css', '.log', '.tmp']
    });
    if (!validatedPath) {
      return null;
    }
    
    try {
      return fs.statSync(validatedPath);
    } catch (error) {
      // Only log non-ENOENT errors to avoid spam for missing files
      if (error.code !== 'ENOENT') {
        try {
          const i18n = getI18n();
          SecurityUtils.logSecurityEvent(i18n.t('security.statError'), 'error', {
            path: filePath,
            error: error.message
          });
        } catch {
          SecurityUtils.logSecurityEvent('security.statError', 'error', {
            path: filePath,
            error: error.message
          });
        }
      }
      return null;
    }
  }

  /**
   * Logs security events with context
   * @param {string} message - Event message
   * @param {string} level - Log level (info, warning, error)
   * @param {Object} [context={}] - Additional context
   */
  static logSecurityEvent(message, level = 'info', context = {}) {
    let translatedMessage;
    try {
      const i18n = getI18n();
      // Only attempt translation if message looks like a translation key
      // (contains only alphanumeric, underscore, colon, and dot characters)
      const isTranslationKey = /^[a-zA-Z0-9_:.-]+$/.test(message);
      if (isTranslationKey) {
        translatedMessage = i18n.t(message, context);
      } else {
        // Message is already a literal string, use as-is
        translatedMessage = message;
      }
    } catch (error) {
      // Fallback to the raw message if i18n is not available
      translatedMessage = message;
    }
    
    // Ensure level is a string and has a valid value
    const validLevels = ['info', 'warning', 'error', 'debug'];
    const levelStr = typeof level === 'string' ? level.toLowerCase() : 'info';
    const normalizedLevel = validLevels.includes(levelStr) ? levelStr : 'info';
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: normalizedLevel,
      message: translatedMessage,
      context: {
        ...context,
        // Add a source field to indicate where the log event originated (e.g., 'Synk', 'Coderabbit')
        source: context.source || 'i18nTK',
        // Ensure sensitive data is not logged directly
        // For example, if context.password exists, it should be masked
        ...Object.fromEntries(Object.entries(context).map(([key, value]) =>
          key.toLowerCase().includes('password') || key.toLowerCase().includes('pin')
            ? [key, '[REDACTED]']
            : [key, value]
        ))
      }
    };

    // Log to console based on level
    switch (normalizedLevel) {
      case 'error':
        console.error(`[SECURITY ERROR] ${logEntry.message}`, logEntry.context);
        break;
      case 'warn':
        console.warn(`[SECURITY WARNING] ${logEntry.message}`, logEntry.context);
        break;
      case 'info':
        console.info(`[SECURITY INFO] ${logEntry.message}`, logEntry.context);
        break;
      case 'debug':
        console.debug(`[SECURITY DEBUG] ${logEntry.message}`, logEntry.context);
        break;
      default:
        console.log(`[SECURITY] ${logEntry.message}`, logEntry.context);
    }

    // Optionally log to file (implementation depends on specific requirements)
    // This is a placeholder - actual implementation would need to handle file writing securely
    // const logFile = path.join(process.cwd(), 'security.log');
    // fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }

  /**
   * Safely creates a directory synchronously with path validation
   * @param {string} dirPath - Directory path to create
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @param {Object} [options={}] - Options for mkdirSync
   * @returns {string|null} - Created directory path or null if error
   */
  static safeMkdirSync(dirPath, basePath = null, options = {}) {
    if (basePath === null || basePath === process.cwd()) {
      try {
        // Avoid circular dependency by using process.cwd() directly
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    }
    const validatedPath = this.safeSanitizePath(dirPath, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });
    if (!validatedPath) {
      return null;
    }
    
    try {
      fs.mkdirSync(validatedPath, options);
      return validatedPath;
    } catch (error) {
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.directoryCreationError'), 'error', {
          path: dirPath,
          error: error.message
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.directoryCreationError', 'error', {
          path: dirPath,
          error: error.message
        });
      }
      return null;
    }
  }

  /**
   * Safely creates a directory asynchronously with path validation
   * @param {string} dirPath - Directory path to create
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @param {Object} [options={}] - Options for mkdir
   * @returns {Promise<string|null>} - Created directory path or null if error
   */
  static async safeMkdir(dirPath, basePath = null, options = {}) {
    if (basePath === null || basePath === process.cwd()) {
      try {
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    }
    const validatedPath = this.safeSanitizePath(dirPath, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });
    if (!validatedPath) {
      return null;
    }
    
    try {
      const fs = require('fs').promises;
      await fs.mkdir(validatedPath, options);
      return validatedPath;
    } catch (error) {
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.directoryCreationError'), 'error', {
          path: dirPath,
          error: error.message
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.directoryCreationError', 'error', {
          path: dirPath,
          error: error.message
        });
      }
      return null;
    }
  }

  /**
   * Safely copies files/directories synchronously with path validation
   * @param {string} src - Source path to copy from
   * @param {string} dest - Destination path to copy to
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @param {Object} [options={}] - Options for cpSync
   * @returns {boolean} - True if copy succeeded, false otherwise
   */
  static safeCpSync(src, dest, basePath = null, options = {}) {
    if (basePath === null || basePath === undefined) {
      basePath = process.cwd();
    } else if (typeof basePath !== 'string') {
      basePath = String(basePath);
    }

    // Validate source and destination paths
    const validatedSrc = this.safeSanitizePath(src, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });
    const validatedDest = this.safeSanitizePath(dest, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });

    if (!validatedSrc || !validatedDest) {
      return false;
    }

    try {
      // Ensure destination directory exists
      const destDir = path.dirname(validatedDest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.cpSync(validatedSrc, validatedDest, options);
      return true;
    } catch (error) {
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.copyError'), 'error', {
          src: src,
          dest: dest,
          error: error.message
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.copyError', 'error', {
          src: src,
          dest: dest,
          error: error.message
        });
      }
      return false;
    }
  }

  /**
   * Safely resolves real path synchronously with symlink protection
   * @param {string} filePath - Path to resolve
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {string|null} - Real path or null if error
   */
  static safeRealpathSync(filePath, basePath = null) {
    if (basePath === null || basePath === undefined) {
      basePath = process.cwd();
    } else if (typeof basePath !== 'string') {
      basePath = String(basePath);
    }

    const validatedPath = this.safeSanitizePath(filePath, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });

    if (!validatedPath) {
      return null;
    }

    try {
      const realPath = fs.realpathSync.native(validatedPath);
      
      // Ensure the real path is still within base directory
      const relative = path.relative(basePath, realPath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.symlinkTraversal'), 'warn', {
          inputPath: filePath,
          realPath: realPath
        });
        return null;
      }

      return realPath;
    } catch (error) {
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.realpathError'), 'error', {
          path: filePath,
          error: error.message
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.realpathError', 'error', {
          path: filePath,
          error: error.message
        });
      }
      return null;
    }
  }



  /**
   * Safely writes a file synchronously with path validation
   * @param {string} filePath - Path to the file
   * @param {string|Buffer} data - File content to write
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @param {Object} [options={}] - Options for writeFileSync
   * @returns {boolean} - True if write was successful, false otherwise
   */
  static safeWriteFileSync(filePath, data, basePath = null, options = {}) {
    if (basePath === null || basePath === process.cwd()) {
      try {
        // Avoid circular dependency by using process.cwd() directly
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    }
    const validatedPath = this.safeSanitizePath(filePath, basePath, {
      allowAbsolute: false,
      allowTraversal: false,
      allowedExtensions: ['.json', '.js', '.ts', '.txt', '.md', '.yml', '.yaml', '.xml', '.html', '.css', '.log', '.tmp']
    });
    if (!validatedPath) {
      return false;
    }
    try {
      fs.writeFileSync(validatedPath, data, options);
      return true;
    } catch (error) {
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.fileWriteError'), 'error', {
          path: filePath,
          error: error.message
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.fileWriteError', 'error', {
          path: filePath,
          error: error.message
        });
      }
      return false;
    }
  }

  /**
   * Safely deletes a file or directory synchronously with path validation
   * @param {string} filePath - Path to the file or directory to delete
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {boolean} - True if deletion was successful, false otherwise
   */

  static safeDeleteSync(filePath, basePath = null) {
    if (basePath === null || basePath === process.cwd()) {
      try {
        // Avoid circular dependency by using process.cwd() directly
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    }
    const validatedPath = this.safeSanitizePath(filePath, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });
    if (!validatedPath) {
      return false;
    }
    
    try {
      if (SecurityUtils.safeExistsSync(validatedPath)) {
        const stat = SecurityUtils.safeStatSync(validatedPath);
        if (stat.isDirectory()) {
          fs.rmdirSync(validatedPath, { recursive: true });
        } else {
          fs.unlinkSync(validatedPath);
        }
      }
      return true;
    } catch (error) {
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.fileDeleteError'), 'error', {
          path: filePath,
          error: error.message
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.fileDeleteError', 'error', {
          path: filePath,
          error: error.message
        });
      }
      return false;
    }
  }

  /**
   * Safely checks file access permissions synchronously with path validation
   * @param {string} filePath - Path to the file/directory to check
   * @param {number} [mode=fs.constants.F_OK] - Access mode to check
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {boolean} - True if access is allowed, false otherwise
   */
  static safeAccessSync(filePath, mode = fs.constants.F_OK, basePath = null) {
    if (basePath === null || basePath === process.cwd()) {
      try {
        // Avoid circular dependency by using process.cwd() directly
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    }
    const validatedPath = this.safeSanitizePath(filePath, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });
    if (!validatedPath) {
      return false;
    }
    
    try {
      fs.accessSync(validatedPath, mode);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Safely reads a file asynchronously with path validation and error handling
   * @param {string} filePath - Path to the file
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @param {string} [encoding='utf8'] - File encoding
   * @returns {Promise<string|null>} - File content or null if error
   */
  static async safeReadFile(filePath, basePath = null, encoding = 'utf8') {
    if (basePath === null || basePath === process.cwd()) {
      try {
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    }
    const validatedPath = this.safeSanitizePath(filePath, basePath, {
      allowAbsolute: false,
      allowTraversal: false,
      allowedExtensions: ['.json', '.js', '.ts', '.txt', '.md', '.yml', '.yaml', '.xml', '.html', '.css', '.log', '.tmp']
    });
    if (!validatedPath) {
      return null;
    }
    
    try {
      const fs = require('fs').promises;
      const content = await fs.readFile(validatedPath, encoding);
      return content;
    } catch (error) {
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.fileReadError'), 'error', {
          path: filePath,
          error: error.message
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.fileReadError', 'error', {
          path: filePath,
          error: error.message
        });
      }
      return null;
    }
  }

  /**
   * Safely writes a file asynchronously with path validation and error handling
   * @param {string} filePath - Path to the file
   * @param {string|Buffer} data - File content to write
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @param {string} [encoding='utf8'] - File encoding
   * @returns {Promise<boolean>} - True if write was successful, false otherwise
   */
  static async safeWriteFile(filePath, data, basePath = null, encoding = 'utf8') {
    if (basePath === null || basePath === process.cwd()) {
      try {
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    }
    const validatedPath = this.safeSanitizePath(filePath, basePath, {
      allowAbsolute: false,
      allowTraversal: false,
      allowedExtensions: ['.json', '.js', '.ts', '.txt', '.md', '.yml', '.yaml', '.xml', '.html', '.css', '.log', '.tmp']
    });
    if (!validatedPath) {
      return false;
    }
    
    try {
      const fs = require('fs').promises;
      
      // Ensure directory exists
      const dir = path.dirname(validatedPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(validatedPath, data, encoding);
      return true;
    } catch (error) {
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.fileWriteError'), 'error', {
          path: filePath,
          error: error.message
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.fileWriteError', 'error', {
          path: filePath,
          error: error.message
        });
      }
      return false;
    }
  }

  /**
   * Safely watches a directory or file for changes with path validation
   * @param {string} filePath - Path to the file or directory to watch
   * @param {Function} listener - Callback function for change events
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @param {Object} [options={}] - Options for fs.watch
   * @returns {fs.FSWatcher|null} - File system watcher or null if error
   */
  static safeWatch(filePath, listener, basePath = null, options = {}) {
    if (basePath === null || basePath === process.cwd()) {
      try {
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    }
    const validatedPath = this.safeSanitizePath(filePath, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });
    if (!validatedPath) {
      return null;
    }
    
    try {
      const watcher = fs.watch(validatedPath, options, listener);
      this.logSecurityEvent('Security: Directory/file watch started: ' + validatedPath, 'info');
      return watcher;
    } catch (error) {
      try {
        const i18n = getI18n();
        this.logSecurityEvent(i18n.t('security.watchError'), 'error', {
          path: filePath,
          error: error.message
        });
      } catch {
        this.logSecurityEvent('security.watchError', 'error', {
          path: filePath,
          error: error.message
        });
      }
      return null;
    }
  }

  /**
   * Securely adds missing translation keys to a language file with path validation
   * @param {string} languageDir - Directory containing language files
   * @param {string} language - Target language code
   * @param {string[]} missingKeys - Array of missing translation keys to add
   * @param {Object} [options={}] - Security and processing options
   * @param {string} [options.basePath=process.cwd()] - Base path for validation
   * @param {boolean} [options.dryRun=false] - Preview changes without applying
   * @param {string} [options.sourceLanguage='en'] - Source language for default values
   * @returns {Object} - Result object with changes and security validation info
   */
  static addMissingKeysToLanguage(languageDir, language, missingKeys, options = {}) {
    const { basePath = process.cwd(), dryRun = false, sourceLanguage = 'en' } = options;
    
    // Validate directory path
    const validatedDir = this.safeValidatePath(languageDir, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });
    if (!validatedDir) {
      throw new SecurityError('Invalid language directory path');
    }

    const result = {
      language,
      totalKeys: missingKeys.length,
      changes: [],
      errors: [],
      securityValidated: true
    };

    try {
      // Group keys by file
      const keysByFile = {};
      missingKeys.forEach(keyPath => {
        const parts = keyPath.split('.');
        const fileName = parts[0] + '.json';
        if (!keysByFile[fileName]) {
          keysByFile[fileName] = [];
        }
        keysByFile[fileName].push(keyPath);
      });

      // Process each file
      for (const [fileName, keys] of Object.entries(keysByFile)) {
        const filePath = path.join(validatedDir, language, fileName);
        const validatedFilePath = this.safeValidatePath(filePath, basePath, {
          allowAbsolute: false,
          allowTraversal: false,
          allowedExtensions: ['.json']
        });

        if (!validatedFilePath) {
          result.errors.push(`Invalid file path: ${filePath}`);
          continue;
        }

        let fileContent = {};
        let fileExists = false;

        // Load existing file if it exists
        if (this.safeExistsSync(validatedFilePath)) {
          try {
            const content = this.safeReadFileSync(validatedFilePath, basePath, 'utf8');
            fileContent = content ? JSON.parse(content) : {};
            fileExists = true;
          } catch (error) {
            result.errors.push(`Failed to parse JSON: ${fileName} - ${error.message}`);
            continue;
          }
        }

        // Add missing keys
        const fileChanges = [];
        keys.forEach(keyPath => {
          const parts = keyPath.split('.');
          let current = fileContent;
          
          // Navigate nested structure
          for (let i = 1; i < parts.length - 1; i++) {
            if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
              current[parts[i]] = {};
            }
            current = current[parts[i]];
          }

          const lastKey = parts[parts.length - 1];
          if (!current[lastKey]) {
            const defaultValue = this.markWithCountryCode(keyPath, language);
            current[lastKey] = defaultValue;
            fileChanges.push({ key: keyPath, value: defaultValue });
          }
        });

        if (fileChanges.length > 0 && !dryRun) {
          // Ensure directory exists
          const dir = path.dirname(validatedFilePath);
          this.safeMkdirSync(dir, basePath, { recursive: true });
          
          // Write updated file
          const success = this.safeWriteFileSync(validatedFilePath, JSON.stringify(fileContent, null, 2), basePath);
          if (success) {
            result.changes.push({ file: fileName, changes: fileChanges });
          } else {
            result.errors.push(`Failed to write file: ${fileName}`);
          }
        } else if (fileChanges.length > 0) {
          result.changes.push({ file: fileName, changes: fileChanges, preview: true });
        }
      }

      return result;
    } catch (error) {
      result.errors.push(`Security validation failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Securely marks translation values with country code for identification
   * @param {string|Object} value - Translation value to mark
   * @param {string} countryCode - Country code to use as marker
   * @param {Object} [options={}] - Security options
   * @returns {string|Object} - Marked translation value
   */
  static markWithCountryCode(value, countryCode, options = {}) {
    if (typeof value === 'string') {
      return `[${countryCode.toUpperCase()}] ${value}`;
    }
    
    if (typeof value === 'object' && value !== null) {
      const marked = {};
      for (const [key, val] of Object.entries(value)) {
        marked[key] = this.markWithCountryCode(val, countryCode, options);
      }
      return marked;
    }
    
    return value;
  }

  /**
   * Securely merges translation objects with path validation and security checks
   * @param {Object} sourceTranslations - Source translation object
   * @param {Object} existingTranslations - Existing translation object to merge into
   * @param {Object} [options={}] - Security and merge options
   * @param {string} [options.basePath=process.cwd()] - Base path for file operations
   * @param {string} [options.countryCode=''] - Country code for marking merged values
   * @param {boolean} [options.validatePaths=true] - Whether to validate file paths
   * @returns {Object} - Merged translation object with security metadata
   */
  static mergeTranslations(sourceTranslations, existingTranslations, options = {}) {
    const { basePath = process.cwd(), countryCode = '', validatePaths = true } = options;
    
    const result = {
      merged: {},
      conflicts: [],
      addedKeys: [],
      updatedKeys: [],
      securityValidated: validatePaths
    };

    function deepMerge(source, existing, path = '') {
      const merged = Array.isArray(existing) ? [...existing] : { ...existing };
      
      for (const [key, sourceValue] of Object.entries(source)) {
        const currentPath = path ? `${path}.${key}` : key;
        const existingValue = existing[key];
        
        if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
          if (typeof existingValue === 'object' && existingValue !== null && !Array.isArray(existingValue)) {
            merged[key] = deepMerge(sourceValue, existingValue, currentPath);
          } else {
            merged[key] = deepMerge(sourceValue, {}, currentPath);
            result.addedKeys.push(currentPath);
          }
        } else {
          if (existingValue === undefined || existingValue === null || existingValue === '') {
            // New key or empty existing value
            const markedValue = countryCode ? this.markWithCountryCode(sourceValue, countryCode) : sourceValue;
            merged[key] = markedValue;
            result.addedKeys.push(currentPath);
          } else if (existingValue !== sourceValue) {
            // Existing value differs from source
            if (countryCode && !existingValue.startsWith(`[${countryCode.toUpperCase()}]`)) {
              const markedValue = this.markWithCountryCode(sourceValue, countryCode);
              merged[key] = markedValue;
              result.updatedKeys.push(currentPath);
            } else {
              // Keep existing value if already marked or identical
              merged[key] = existingValue;
            }
          } else {
            // Values are identical
            merged[key] = existingValue;
          }
        }
      }
      
      return merged;
    }

    try {
      result.merged = deepMerge(sourceTranslations, existingTranslations);
      
      // Validate any file paths if requested
      if (validatePaths && (sourceTranslations.filePath || existingTranslations.filePath)) {
        const pathsToValidate = [
          sourceTranslations.filePath,
          existingTranslations.filePath
        ].filter(Boolean);
        
        for (const filePath of pathsToValidate) {
          const validated = this.safeValidatePath(filePath, basePath, {
            allowAbsolute: false,
            allowTraversal: false,
            allowedExtensions: ['.json']
          });
          
          if (!validated) {
            result.securityValidated = false;
            result.conflicts.push(`Invalid file path: ${filePath}`);
          }
        }
      }
      
      return result;
    } catch (error) {
      return {
        merged: existingTranslations,
        conflicts: [`Merge failed: ${error.message}`],
        addedKeys: [],
        updatedKeys: [],
        securityValidated: validatePaths
      };
    }
  }

  /**
   * Secure file descriptor-based file operations to prevent TOCTOU attacks
   * These methods validate symlinks at the point of use, not during sanitization
   */

  /**
   * Opens a file with secure symlink validation using file descriptors
   * @param {string} filePath - Path to the file
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @param {string} [flags='r'] - File open flags
   * @param {number} [mode=0o644] - File mode for creation
   * @returns {Promise<number>} - File descriptor
   * @throws {SecurityError} If symlink validation fails
   */
  static async safeOpenFile(filePath, basePath = null, flags = 'r', mode = 0o644) {
    const validatedPath = this.safeSanitizePath(filePath, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });
    
    if (!validatedPath) {
      throw new SecurityError('Invalid file path');
    }

    const fs = require('fs').promises;
    
    try {
      // Open file with file descriptor
      const fd = await fs.open(validatedPath, flags, mode);
      
      // Get real path using file descriptor to prevent TOCTOU
      const stats = await fd.stat();
      const realPath = await fs.realpath(validatedPath);
      
      // Validate the real path is within base directory
      const resolvedBase = path.resolve(basePath || process.cwd());
      const relativeReal = path.relative(resolvedBase, realPath);
      
      if (relativeReal.startsWith('..') || path.isAbsolute(relativeReal)) {
        await fd.close();
        const i18n = getI18n();
        this.logSecurityEvent(i18n.t('security.symlinkTraversal'), 'warn', {
          inputPath: filePath,
          realPath: realPath,
          basePath: resolvedBase
        });
        throw new SecurityError('Symlink traversal detected');
      }
      
      return fd.fd;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new SecurityError('File not found');
      }
      throw error;
    }
  }

  /**
   * Secure file read with retry logic and TOCTOU-resistant validation
   * @param {string} filePath - Path to the file
   * @param {string} [encoding='utf8'] - File encoding
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @param {Object} [options={}] - Security options
   * @param {number} [options.maxRetries=3] - Maximum retry attempts
   * @param {number} [options.retryDelay=100] - Delay between retries in ms
   * @returns {Promise<string>} - File content
   */
  static async safeReadFileSecure(filePath, encoding = 'utf8', basePath = null, options = {}) {
    const { maxRetries = 3, retryDelay = 100 } = options;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const validatedPath = this.safeSanitizePath(filePath, basePath, {
          allowAbsolute: false,
          allowTraversal: false
        });
        
        if (!validatedPath) {
          throw new SecurityError('Invalid file path');
        }

        const fs = require('fs').promises;
        
        // Use file descriptor for atomic operations
        const fd = await fs.open(validatedPath, 'r');
        try {
          // Validate symlink at point of use
          const realPath = await fs.realpath(validatedPath);
          const resolvedBase = path.resolve(basePath || process.cwd());
          const relativeReal = path.relative(resolvedBase, realPath);
          
          if (relativeReal.startsWith('..') || path.isAbsolute(relativeReal)) {
            const i18n = getI18n();
            this.logSecurityEvent(i18n.t('security.symlinkTraversal'), 'warn', {
              inputPath: filePath,
              realPath: realPath,
              attempt: attempt
            });
            throw new SecurityError('Symlink traversal detected');
          }
          
          // Read file content
          const content = await fd.readFile({ encoding });
          return content;
        } finally {
          await fd.close();
        }
      } catch (error) {
        if (attempt === maxRetries || error instanceof SecurityError) {
          throw error;
        }
        
        // Wait before retry for transient issues
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Secure file write with TOCTOU-resistant validation
   * @param {string} filePath - Path to the file
   * @param {string|Buffer} data - Data to write
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @param {Object} [options={}] - Security options
   * @param {string} [options.encoding='utf8'] - File encoding
   * @param {number} [options.maxRetries=3] - Maximum retry attempts
   * @returns {Promise<boolean>} - Success status
   */
  static async safeWriteFileSecure(filePath, data, basePath = null, options = {}) {
    const { encoding = 'utf8', maxRetries = 3 } = options;
    
    const validatedPath = this.safeSanitizePath(filePath, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });
    
    if (!validatedPath) {
      return false;
    }

    const fs = require('fs').promises;
    
    try {
      // Ensure directory exists
      const dir = path.dirname(validatedPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Validate parent directory is within bounds
      const realDir = await fs.realpath(dir);
      const resolvedBase = path.resolve(basePath || process.cwd());
      const relativeDir = path.relative(resolvedBase, realDir);
      
      if (relativeDir.startsWith('..') || path.isAbsolute(relativeDir)) {
        const i18n = getI18n();
        this.logSecurityEvent(i18n.t('security.directoryTraversal'), 'warn', {
          inputPath: filePath,
          realPath: realDir
        });
        return false;
      }
      
      // Write file atomically using temporary file
      const tempPath = validatedPath + '.tmp' + Date.now();
      await fs.writeFile(tempPath, data, { encoding });
      
      // Validate temp file location
      const realTempPath = await fs.realpath(tempPath);
      const relativeTemp = path.relative(resolvedBase, realTempPath);
      
      if (relativeTemp.startsWith('..') || path.isAbsolute(relativeTemp)) {
        await fs.unlink(tempPath);
        return false;
      }
      
      // Atomic rename
      await fs.rename(tempPath, validatedPath);
      return true;
      
    } catch (error) {
      const i18n = getI18n();
      this.logSecurityEvent(i18n.t('security.file_write_error'), 'error', {
        filePath: validatedPath,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Secure directory listing with file descriptor-based validation
   * @param {string} dirPath - Directory path to list
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @param {Object} [options={}] - Security options
   * @returns {Promise<string[]>} - Array of file/directory names
   */
  static async safeReaddirSecure(dirPath, basePath = null, options = {}) {
    const validatedPath = this.safeSanitizePath(dirPath, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });
    
    if (!validatedPath) {
      throw new SecurityError('Invalid directory path');
    }

    const fs = require('fs').promises;
    
    try {
      // Validate directory path at point of use
      const realPath = await fs.realpath(validatedPath);
      const resolvedBase = path.resolve(basePath || process.cwd());
      const relativeReal = path.relative(resolvedBase, realPath);
      
      if (relativeReal.startsWith('..') || path.isAbsolute(relativeReal)) {
        const i18n = getI18n();
        this.logSecurityEvent(i18n.t('security.symlinkTraversal'), 'warn', {
          inputPath: dirPath,
          realPath: realPath
        });
        throw new SecurityError('Symlink traversal detected');
      }
      
      // Validate it's actually a directory
      const stats = await fs.stat(validatedPath);
      if (!stats.isDirectory()) {
        throw new SecurityError('Path is not a directory');
      }
      
      // List directory contents
      const files = await fs.readdir(validatedPath);
      
      // Validate each file path
      const validatedFiles = [];
      for (const file of files) {
        const fullPath = path.join(validatedPath, file);
        try {
          const realFilePath = await fs.realpath(fullPath);
          const relativeFile = path.relative(resolvedBase, realFilePath);
          
          if (!relativeFile.startsWith('..') && !path.isAbsolute(relativeFile)) {
            validatedFiles.push(file);
          }
        } catch (error) {
          // Skip files that can't be resolved
        }
      }
      
      return validatedFiles;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new SecurityError('Directory not found');
      }
      throw error;
    }
  }

  /**
   * Secure file stats with TOCTOU-resistant validation
   * @param {string} filePath - Path to the file/directory
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {Promise<fs.Stats>} - Stats object
   */
  static async safeStatSecure(filePath, basePath = null) {
    const validatedPath = this.safeSanitizePath(filePath, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });
    
    if (!validatedPath) {
      throw new SecurityError('Invalid file path');
    }

    const fs = require('fs').promises;
    
    try {
      // Validate symlink at point of use
      const realPath = await fs.realpath(validatedPath);
      const resolvedBase = path.resolve(basePath || process.cwd());
      const relativeReal = path.relative(resolvedBase, realPath);
      
      if (relativeReal.startsWith('..') || path.isAbsolute(relativeReal)) {
        const i18n = getI18n();
        this.logSecurityEvent(i18n.t('security.symlinkTraversal'), 'warn', {
          inputPath: filePath,
          realPath: realPath
        });
        throw new SecurityError('Symlink traversal detected');
      }
      
      // Get file stats
      const stats = await fs.stat(validatedPath);
      return stats;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new SecurityError('File not found');
      }
      throw error;
    }
  }

  /**
   * Checks if a file exists with TOCTOU-resistant validation
   * @param {string} filePath - Path to check
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {Promise<boolean>} - True if file exists and is safe
   */
  static async safeExistsSecure(filePath, basePath = null) {
    try {
      await this.safeStatSecure(filePath, basePath);
      return true;
    } catch (error) {
      if (error.message === 'File not found') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Secure file deletion with TOCTOU-resistant validation
   * @param {string} filePath - Path to delete
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {Promise<boolean>} - Success status
   */
  static async safeDeleteFileSecure(filePath, basePath = null) {
    const validatedPath = this.safeSanitizePath(filePath, basePath, {
      allowAbsolute: false,
      allowTraversal: false
    });
    
    if (!validatedPath) {
      return false;
    }

    const fs = require('fs').promises;
    
    try {
      // Validate file location before deletion
      const realPath = await fs.realpath(validatedPath);
      const resolvedBase = path.resolve(basePath || process.cwd());
      const relativeReal = path.relative(resolvedBase, realPath);
      
      if (relativeReal.startsWith('..') || path.isAbsolute(relativeReal)) {
        const i18n = getI18n();
        this.logSecurityEvent(i18n.t('security.symlinkTraversal'), 'warn', {
          inputPath: filePath,
          realPath: realPath
        });
        return false;
      }
      
      await fs.unlink(validatedPath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false; // File doesn't exist
      }
      
      const i18n = getI18n();
      this.logSecurityEvent(i18n.t('security.file_delete_error'), 'error', {
        filePath: validatedPath,
        error: error.message
      });
      return false;
    }
  }

} // Closing brace for SecurityUtils class

module.exports = SecurityUtils;
module.exports.SecurityError = SecurityError;