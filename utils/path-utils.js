const path = require('path');
const fs = require('fs');
const SecurityUtils = require('./security');

function isWindows(p) {
  return /^[a-zA-Z]:\\/.test(p);
}

/**
 * Convert an absolute path to a relative path using forward slashes.
 * Works with both Windows and POSIX style paths.
 * @param {string} base - Base directory
 * @param {string} target - Target path
 * @returns {string} Relative path
 */
function toRelative(base, target) {
  const rel = isWindows(base) || isWindows(target)
    ? path.win32.relative(base, target)
    : path.posix.relative(base, target);
  return rel.split(/[\\/]/).join('/');
}

/**
 * Resolve an array of paths against a base directory.
 * Handles both Windows and POSIX style paths.
 * @param {string} base - Base directory
 * @param {string[]} paths - Paths to resolve
 * @returns {string[]} Resolved absolute paths
 */
function resolvePaths(base, paths) {
  const resolver = isWindows(base) ? path.win32.resolve : path.posix.resolve;
  return paths.map(p => resolver(base, p));
}

/**
 * Get the package root directory dynamically for npm packages
 * @returns {string} Package root directory
 */
function getPackageRoot() {
  // Start from current file and traverse up to find package.json
  let currentDir = __dirname;
  while (currentDir !== path.parse(currentDir).root) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (SecurityUtils.safeExistsSync(packageJsonPath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  // Fallback to current directory
  return __dirname;
}

/**
 * Resolve a path relative to the project root or package root
 * @param {string} relativePath - Relative path to resolve
 * @param {string} [baseDir] - Optional base directory (defaults to process.cwd())
 * @returns {string} Absolute path
 */
function resolveProjectPath(relativePath, baseDir = null) {
  const base = baseDir || process.cwd();
  return path.resolve(base, relativePath);
}

/**
 * Resolve a path relative to the package installation directory
 * @param {string} relativePath - Relative path within the package
 * @returns {string} Absolute path within the package
 */
function resolvePackagePath(relativePath) {
  const packageRoot = getPackageRoot();
  return path.resolve(packageRoot, relativePath);
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - Directory path to ensure
 * @returns {boolean} True if directory exists or was created
 */
function ensureDirectory(dirPath) {
  try {
    if (!SecurityUtils.safeExistsSync(dirPath)) {
      SecurityUtils.safeMkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the appropriate path separator for the current platform
 * @returns {string} Path separator
 */
function getPathSeparator() {
  return path.sep;
}

/**
 * Normalize a path to use forward slashes consistently
 * @param {string} filePath - Path to normalize
 * @returns {string} Normalized path with forward slashes
 */
function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

/**
 * Check if a path is within the project directory
 * @param {string} targetPath - Path to check
 * @param {string} [projectPath] - Project root path (defaults to process.cwd())
 * @returns {boolean} True if path is within project
 */
function isWithinProject(targetPath, projectPath = null) {
  const project = projectPath || process.cwd();
  const relative = path.relative(project, targetPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

module.exports = {
  toRelative,
  resolvePaths,
  getPackageRoot,
  resolveProjectPath,
  resolvePackagePath,
  ensureDirectory,
  getPathSeparator,
  normalizePath,
  isWithinProject
};
