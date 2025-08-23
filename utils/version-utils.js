/**
 * Lightweight semver comparison for i18ntk
 * Only handles basic version comparison (>, <, >=, <=, =, ===)
 */

/**
 * Compare two version strings using semver-like comparison
 * @param {string} v1 - First version string
 * @param {string} v2 - Second version string
 * @returns {number} - 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
  // Handle null/undefined
  if (v1 === v2) return 0;
  if (!v1) return -1;
  if (!v2) return 1;
  
  // Remove any non-digit or dot characters
  const clean = v => v.replace(/[^\d.]/g, '');
  
  const parts1 = clean(v1).split('.').map(Number);
  const parts2 = clean(v2).split('.').map(Number);
  
  // Compare each part
  const maxLength = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  
  return 0;
}

/**
 * Check if version is greater than or equal to minimum version
 * @param {string} version - Version to check
 * @param {string} minVersion - Minimum required version
 * @returns {boolean} - True if version >= minVersion
 */
function gte(version, minVersion) {
  return compareVersions(version, minVersion) >= 0;
}

module.exports = {
  compareVersions,
  gte
};
