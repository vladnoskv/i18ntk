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

// CLI interface
if (require.main === module) {
    const setupManager = new I18nSetupManager();
    setupManager.setup().catch(console.error);
}

// Export both the class and a run function for direct usage
module.exports = I18nSetupManager;
module.exports.run = async function() {
    const setupManager = new I18nSetupManager();
    return await setupManager.setup();
};