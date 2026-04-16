#!/usr/bin/env node

'use strict';

const { logger } = require('../utils/logger');

/**
 * I18NTK BACKUP CLASS
 *
 * Backup operations are intentionally disabled in the manager command path
 * to reduce filesystem scanner surface.
 */
class I18nBackup {
  constructor(config = {}) {
    this.config = config;
  }

  showHelp() {
    logger.warn('Backup command is disabled in this build.');
    logger.info('Use project-level source control or external backup tooling instead.');
  }

  async run(options = {}) {
    const command = options.command || (options._ && options._[0]);
    if (!command || command === 'help') {
      this.showHelp();
      return { success: false, command: 'backup', disabled: true };
    }

    logger.warn(`Backup command '${command}' is disabled in this build.`);
    logger.info('Use project-level source control or external backup tooling instead.');

    return {
      success: false,
      command,
      disabled: true,
      error: 'Backup command is disabled'
    };
  }
}

module.exports = I18nBackup;
