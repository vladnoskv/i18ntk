'use strict';

/**
 * Update checks were intentionally removed to avoid outbound network access
 * during CLI startup and to reduce scanner noise in restricted environments.
 *
 * We keep the same exported API for backwards compatibility.
 */

async function checkNpmOutdated() {
  return null;
}

async function printUpgradeWarningIfOutdated() {
  return;
}

module.exports = { checkNpmOutdated, printUpgradeWarningIfOutdated };
