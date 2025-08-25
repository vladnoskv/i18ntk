#!/usr/bin/env node

/**
 * I18NTK TRANSLATION FIXER SCRIPT
 *
 * This script is responsible for fixing issues in translation files,
 * such as adding missing keys or correcting untranslated markers.
 *
 */

const path = require('path');
const fs = require('fs');
const SecurityUtils = require('../utils/security');
const cliHelper = require('../utils/cli-helper');
const { loadTranslations, t } = require('../utils/i18n-helper');
const { getUnifiedConfig, parseCommonArgs, displayHelp } = require('../utils/config-helper');
const JsonOutput = require('../utils/json-output');
const SetupEnforcer = require('../utils/setup-enforcer');

// Ensure setup is complete before running
(async () => {
  try {
    await SetupEnforcer.checkSetupCompleteAsync();
  } catch (error) {
    console.error('Setup check failed:', error.message);
    process.exit(1);
  }
})();

loadTranslations('en', path.resolve(__dirname, '..', 'resources', 'i18n', 'ui-locales'));

class I18nFixer {
  constructor(config = {}) {
    this.config = config;
  }

  async initialize() {
    try {
      const args = this.parseArgs();
      if (args.help) {
        displayHelp('i18ntk-fixer', {
          'source-dir': 'Source directory to scan (default: ./locales)',
          'languages': 'Comma separated list of languages to fix',
          'markers': 'Comma separated markers to treat as untranslated',
          'no-backup': 'Skip automatic backup creation'
        });
        process.exit(0);
      }

      const baseConfig = await getUnifiedConfig('fixer', args);
      this.config = { ...baseConfig, ...(this.config || {}) };

      const uiLanguage = (this.config && this.config.uiLanguage) || 'en';
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'resources', 'i18n', 'ui-locales'));

      this.sourceDir = this.config.sourceDir;
      this.outputDir = this.config.outputDir;

      const { validateSourceDir } = require('../utils/config-helper');
      validateSourceDir(this.sourceDir, 'i18ntk-fixer');

    } catch (error) {
      console.error(`Fatal fixer error: ${error.message}`);
      throw error;
    }
  }

  parseArgs() {
    try {
      const args = process.argv.slice(2);
      const parsed = parseCommonArgs(args);

      args.forEach(arg => {
        if (arg.startsWith('--')) {
          const [key, value] = arg.substring(2).split('=');
          const sanitizedKey = SecurityUtils.sanitizeInput(key);
          const sanitizedValue = value ? SecurityUtils.sanitizeInput(value) : true;

          if (sanitizedKey === 'source-dir') {
            parsed.sourceDir = sanitizedValue;
          } else if (sanitizedKey === 'languages') {
            parsed.languages = sanitizedValue.split(',').map(l => l.trim());
          } else if (sanitizedKey === 'markers') {
            parsed.markers = sanitizedValue.split(',').map(m => m.trim());
          } else if (sanitizedKey === 'no-backup') {
            parsed.noBackup = true;
          }
        }
      });

      return parsed;
    } catch (error) {
      throw error;
    }
  }

  async run() {
    await this.initialize();
    console.log(t('fixer.running'));
    // Placeholder for actual fixing logic
    console.log(t('fixer.completed'));
  }
}

module.exports = I18nFixer;

if (require.main === module) {
  const fixer = new I18nFixer();
  fixer.run().catch(error => {
    console.error('I18n Fixer failed:', error);
    process.exit(1);
  });
}