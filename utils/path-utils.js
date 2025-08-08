const path = require('path');

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

module.exports = { toRelative, resolvePaths };
