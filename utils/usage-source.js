'use strict';

const path = require('path');
const SecurityUtils = require('./security');
const { SOURCE_DIRS } = require('./framework-detector');

const DEFAULT_SOURCE_DIRS = SOURCE_DIRS;

function resolveUsageSourceDir(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  const sourceDir = options.sourceDir ? path.resolve(projectRoot, options.sourceDir) : null;
  const i18nDir = options.i18nDir ? path.resolve(projectRoot, options.i18nDir) : null;

  if (options.explicitSourceDir) {
    return {
      sourceDir,
      disabled: false,
      reason: null,
    };
  }

  if (sourceDir && i18nDir && sourceDir === i18nDir) {
    for (const candidate of DEFAULT_SOURCE_DIRS) {
      const candidatePath = path.resolve(projectRoot, candidate);
      if (SecurityUtils.safeExistsSync(candidatePath, projectRoot)) {
        return {
          sourceDir: candidatePath,
          disabled: false,
          reason: `sourceDir equals i18nDir; using ${candidate}`,
        };
      }
    }

    return {
      sourceDir: null,
      disabled: true,
      reason: 'sourceDir equals i18nDir and no application source directory was found',
    };
  }

  return {
    sourceDir,
    disabled: !sourceDir,
    reason: sourceDir ? null : 'No source directory configured',
  };
}

module.exports = {
  DEFAULT_SOURCE_DIRS,
  resolveUsageSourceDir,
};
