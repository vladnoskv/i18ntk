#!/usr/bin/env node

/**
 * i18ntk-setup.js - Foundational Setup Script
 *
 * This script runs before all other initialization or operational scripts.
 * It configures the core framework, detects programming language/framework,
 * specifies translation file locations, and establishes essential prerequisites.
 */

const fs = require('fs');
const path = require('path');

const SecurityUtils = require('../utils/security');
const configManager = require('../utils/config-manager');
const SetupService = require('./manage/services/SetupService');

class I18nSetupManager {
    constructor() {
        // Use the new SetupService for core business logic
        this.setupService = new SetupService();
    }

    async setup() {
        // Delegate to SetupService for all business logic
        return await this.setupService.setup();
    }

    
}

function printHelp() {
    console.log([
        '',
        'i18ntk-setup - foundational i18n toolkit setup',
        '',
        'Usage:',
        '  i18ntk-setup [options]',
        '  node main/i18ntk-setup.js [options]',
        '',
        'Options:',
        '  -h, --help     Show this help message',
        '',
        'The setup command detects the current project, writes i18ntk settings,',
        'and generates i18ntk-setup-report.json in the current working directory.',
    ].join('\n'));
}

// CLI interface
if (require.main === module) {
    if (process.argv.slice(2).some(arg => arg === '--help' || arg === '-h')) {
        printHelp();
        process.exit(0);
    }

    const setupManager = new I18nSetupManager();
    setupManager.setup().catch(console.error);
}

// Export both the class and a run function for direct usage
module.exports = I18nSetupManager;
module.exports.run = async function() {
    const setupManager = new I18nSetupManager();
    return await setupManager.setup();
};
module.exports.printHelp = printHelp;
