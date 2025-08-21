/**
 * Path Security Utility
 * Provides comprehensive path validation and sanitization to prevent directory traversal attacks
 */

const fs = require('fs');
const path = require('path');

class PathSecurity {
  /**
   * Validates and sanitizes a file path to prevent directory traversal
   * @param {string} inputPath - The path to validate
   * @param {string} basePath - The base directory that the path must be within
   * @param {Object} options - Validation options
   * @param {boolean} options.createDir - Whether to create the directory if it doesn't exist
   * @param {boolean} options.allowSymlinks - Whether to allow symbolic links
   * @param {string[]} options.allowedExtensions - Array of allowed file extensions
   * @returns {string|null} - Sanitized absolute path or null if invalid
   */
  static sanitizePath(inputPath, basePath, options = {}) {
    try {
      if (!inputPath || !basePath) {
        return null;
      }

      // Normalize input paths
      const normalizedBase = path.normalize(basePath);
      const normalizedInput = path.normalize(inputPath);

      // Resolve to absolute paths
      const absoluteBase = path.resolve(normalizedBase);
      let absolutePath;

      // Handle both relative and absolute input paths
      if (path.isAbsolute(normalizedInput)) {
        absolutePath = normalizedInput;
      } else {
        absolutePath = path.resolve(absoluteBase, normalizedInput);
      }

      // Check if path contains null bytes or control characters
      if (inputPath.includes('\0') || /[\x00-\x1F\x7F]/.test(inputPath)) {
        return null;
      }

      // Check for directory traversal patterns
      const traversalPatterns = [
        /\.\.[\/\\]/,  // Block ../ and ..\ traversal
        /^\//,         // Block absolute paths (Unix)
        /^[A-Za-z]:/,  // Block absolute paths (Windows)
        /\/\//,        // Block double slashes
       ];
      
      // Platform-specific handling for Windows
      if (process.platform === 'win32') {
        // Normalize Windows paths to use forward slashes for consistent checking
        inputPath = inputPath.replace(/\\/g, '/');
      }

      for (const pattern of traversalPatterns) {
        if (pattern.test(inputPath)) {
          return null;
        }
      }
      // Ensure the resolved path is within the base directory
      const relativePath = path.relative(absoluteBase, absolutePath);
      if (relativePath.startsWith('..')) {
        return null;
      }

      // Check if the path exists and handle symlinks
      if (fs.existsSync(absolutePath)) {
        const stats = fs.lstatSync(absolutePath);
        
        // Handle symlinks
        if (stats.isSymbolicLink()) {
          if (!options.allowSymlinks) {
            return null;
          }
          
          // Resolve symlink and ensure it points within base directory
          try {
            const realPath = fs.realpathSync(absolutePath);
            const realRelative = path.relative(absoluteBase, realPath);
            if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
              return null;
            }
            absolutePath = realPath;
          } catch (error) {
            return null;
          }
        }
      }

      // Check file extension if specified
      if (options.allowedExtensions && options.allowedExtensions.length > 0) {
        const ext = path.extname(absolutePath).toLowerCase();
        if (!options.allowedExtensions.includes(ext)) {
          return null;
        }
      }

      // Create directory if requested and it doesn't exist
      if (options.createDir && !fs.existsSync(path.dirname(absolutePath))) {
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      }

      return absolutePath;
    } catch (error) {
      console.error('Path sanitization error:', error.message);
      return null;
    }
  }

  /**
   * Validates that a directory path is safe and within allowed boundaries
   * @param {string} dirPath - Directory path to validate
   * @param {string} basePath - Base directory
   * @returns {boolean} - Whether the directory path is valid
   */
  static validateDirectoryPath(dirPath, basePath) {
    const sanitized = this.sanitizePath(dirPath, basePath);
    if (!sanitized) return false;

    try {
      const stats = fs.statSync(sanitized);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * Validates that a file path is safe and within allowed boundaries
   * @param {string} filePath - File path to validate
   * @param {string} basePath - Base directory
   * @returns {boolean} - Whether the file path is valid
   */
  static validateFilePath(filePath, basePath) {
    const sanitized = this.sanitizePath(filePath, basePath);
    if (!sanitized) return false;

    try {
      const stats = fs.statSync(sanitized);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  /**
   * Securely removes a directory with validation
   * @param {string} dirPath - Directory path to remove
   * @param {string} basePath - Base directory for validation
   * @param {Object} options - Removal options
   * @returns {boolean} - Whether removal was successful
   */
  static safeRmdirSync(dirPath, basePath, options = {}) {
    try {
      const sanitized = this.sanitizePath(dirPath, basePath);
      if (!sanitized) {
        console.error('Invalid directory path for removal:', dirPath);
        return false;
      }

      // Ensure the path exists and is a directory
      if (!fs.existsSync(sanitized)) {
        console.warn('Directory does not exist:', sanitized);
        return true; // Consider already removed as success
      }

      const stats = fs.statSync(sanitized);
      if (!stats.isDirectory()) {
        console.error('Path is not a directory:', sanitized);
        return false;
      }
      
      // Additional safety check - prevent removal of critical directories
      const criticalPaths = [process.cwd(), path.dirname(process.cwd())];
      
      // Add platform-specific critical paths
      if (process.platform === 'win32') {
        criticalPaths.push(
          'C:\\',
          'C:\\Windows',
          'C:\\Program Files',
          'C:\\Program Files (x86)',
          process.env.USERPROFILE || 'C:\\Users'
        );
      } else {
        criticalPaths.push(
          '/',
          '/home',
          '/root',
          '/etc',
          '/usr',
          '/var',
          '/bin',
          '/sbin'
        );
      }

      for (const critical of criticalPaths) {
        if (sanitized === path.resolve(critical)) {
          console.error('Attempted to remove critical directory:', sanitized);
          return false;
        }
      }

      // Remove the directory
      // Use fs.rmSync (Node.js v14.14.0+) to avoid deprecation warnings
      if (typeof fs.rmSync === 'function') {
        fs.rmSync(sanitized, { recursive: true, force: true });
      } else {
        // Fallback for older Node.js versions
        fs.rmdirSync(sanitized, { recursive: true });
      }
      return true;
    } catch (error) {
      console.error('Failed to remove directory:', error.message);
      return false;
    }
  }

  /**
   * Securely creates a directory with validation
   * @param {string} dirPath - Directory path to create
   * @param {string} basePath - Base directory for validation
      const sanitized = this.sanitizePath(dirPath, basePath, { createDir: false });
      if (!sanitized) {
        console.error('Invalid directory path for creation:', dirPath);
        return false;
      }
      fs.mkdirSync(sanitized, { recursive: true });
   */
  static safeMkdirSync(dirPath, basePath, options = {}) {
    try {
      const sanitized = this.sanitizePath(dirPath, basePath, { createDir: false });
      fs.mkdirSync(sanitized, { recursive: true });
      return true;
    } catch (error) {
      console.error('Failed to create directory:', error.message);
      return false;
    }
  }

  /**
   * Validates command line arguments for path traversal attempts
   * @param {string[]} args - Command line arguments to validate
   * @returns {Object} - Validation result with sanitized paths and any errors
   */
  static validateCommandLineArgs(args, basePath) {
    const result = {
      valid: true,
      paths: {},
      errors: []
    };

    const suspiciousPatterns = [
      /^\.\.([\/\\]|$)/,                      // Starts with ../
      /[\/\\]\.\.([\/\\]|$)/,                 // Contains /../ or \..\
      /^\/etc\/passwd$/,                       // Exactly /etc/passwd
      /^[A-Za-z]:[\/\\]windows[\/\\]system32/i, // Windows system paths
      /^\$\{[^}]*\}/                           // Starts with ${...} expansion
    ];

    for (const arg of args) {
      if (typeof arg === 'string') {
        // Check for suspicious patterns
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(arg)) {
            result.errors.push(`Suspicious path pattern detected: ${arg}`);
            result.valid = false;
            break;
          }
        }

        // If it looks like a path, sanitize it
        if ((arg.includes('/') || arg.includes('\\') || arg.includes('.')) &&
            !arg.startsWith('http://') && !arg.startsWith('https://')) {
          const sanitized = this.sanitizePath(arg, basePath);
          if (sanitized) {
            result.paths[arg] = sanitized;
          } else {
            result.errors.push(`Invalid path argument: ${arg}`);
            result.valid = false;
          }
        }
      }
    }

    return result;
  }

  /**
   * Generates a secure temporary directory path
   * @param {string} basePath - Base directory for the temp directory
   * @param {string} prefix - Prefix for the temp directory name
   * @returns {string} - Secure temporary directory path
   */
  static secureTempDir(basePath, prefix = 'i18ntk') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const tempDir = path.join(basePath, `${prefix}-${timestamp}-${random}`);
    
    const sanitized = this.sanitizePath(tempDir, basePath);
    if (!sanitized) {
      throw new Error('Failed to create secure temporary directory path');
    }
    return sanitized;
   }
}
module.exports = PathSecurity;