import path from "node:path";
import fs from "node:fs";

/**
 * Resolves a user-provided path to a safe, canonical path within a base directory.
 * Prevents path traversal attacks (CWE-23) by validating the resolved path stays within the base directory.
 * 
 * @param {string} userInput - The user-provided path to resolve
 * @param {string} baseDir - The base directory that the resolved path must stay within
 * @returns {string} - The canonical, safe path
 * @throws {Error} - If the path attempts directory traversal or is invalid
 */
export function resolveSafePath(userInput, baseDir) {
  if (typeof userInput !== "string" || userInput.length === 0) {
    throw new Error("Path required");
  }

  // 1) build absolute, canonical path from base + user input
  const candidate = path.resolve(baseDir, userInput);

  // 2) ensure the canonical path stays inside base (prevents ../, absolute drive jumps, etc.)
  const rel = path.relative(baseDir, candidate);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Path traversal attempt rejected");
  }

  // 3) optional: disallow symlinks to escape base
  const real = fs.realpathSync.native ? fs.realpathSync.native(candidate) : fs.realpathSync(candidate);
  const realRel = path.relative(baseDir, real);
  if (realRel.startsWith("..") || path.isAbsolute(realRel)) {
    throw new Error("Symlink traversal attempt rejected");
  }

  return real;
}

/**
 * Safe wrapper around fs.readdirSync that prevents path traversal attacks.
 * 
 * @param {string} userInput - The user-provided directory path to read
 * @param {string} baseDir - The base directory that the path must stay within
 * @param {Object} options - Options to pass to fs.readdirSync (optional)
 * @returns {Array} - Array of directory entries from fs.readdirSync
 * @throws {Error} - If the path attempts directory traversal or other security issues
 */
export function safeReaddirSync(userInput, baseDir, options = {}) {
  const p = resolveSafePath(userInput, baseDir);
  return fs.readdirSync(p, options);
}

/**
 * Validates if a path is safe (does not attempt directory traversal) without reading the directory.
 * 
 * @param {string} userInput - The user-provided path to validate
 * @param {string} baseDir - The base directory that the path must stay within
 * @returns {boolean} - True if the path is safe, false otherwise
 */
export function isPathSafe(userInput, baseDir) {
  try {
    resolveSafePath(userInput, baseDir);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Safe wrapper around fs.readdirSync with additional allowlist filtering.
 * Only allows reading from specified subdirectories within the base directory.
 * 
 * @param {string} userInput - The user-provided directory path to read
 * @param {string} baseDir - The base directory that the path must stay within
 * @param {Array<string>} allowedSubdirs - Array of allowed subdirectory names
 * @param {Object} options - Options to pass to fs.readdirSync (optional)
 * @returns {Array} - Array of directory entries from fs.readdirSync
 * @throws {Error} - If the path is not in the allowlist or attempts directory traversal
 */
export function safeReaddirSyncWithAllowlist(userInput, baseDir, allowedSubdirs, options = {}) {
  const p = resolveSafePath(userInput, baseDir);
  
  // Check if the resolved path is within allowed subdirectories
  const relativePath = path.relative(baseDir, p);
  const pathParts = relativePath.split(path.sep).filter(part => part.length > 0);
  
  if (pathParts.length === 0 || !allowedSubdirs.includes(pathParts[0])) {
    throw new Error(`Access denied: can only read from ${allowedSubdirs.join(', ')} directories`);
  }
  
  return fs.readdirSync(p, options);
}