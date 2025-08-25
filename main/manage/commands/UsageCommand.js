#!/usr/bin/env node

/**
 * I18NTK USAGE COMMAND
 *
 * Handles usage analysis functionality.
 */

const I18nUsageAnalyzer = require('../../i18ntk-usage');

class UsageCommand {
    constructor(config = {}, ui = null) {
        this.config = config;
        this.ui = ui;
        this.prompt = null;
        this.isNonInteractiveMode = false;
        this.safeClose = null;
    }

    /**
     * Set runtime dependencies for interactive operations
     */
    setRuntimeDependencies(prompt, isNonInteractiveMode, safeClose) {
        this.prompt = prompt;
        this.isNonInteractiveMode = isNonInteractiveMode;
        this.safeClose = safeClose;
    }

    /**
     * Execute the usage command
     */
    async execute(options = {}) {
        try {
            const usageAnalyzer = new I18nUsageAnalyzer();
            await usageAnalyzer.run(options);
            return { success: true, command: 'usage' };
        } catch (error) {
            console.error(`Usage command failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get command metadata
     */
    getMetadata() {
        return {
            name: 'usage',
            description: 'Check translation usage in code',
            category: 'analysis',
            aliases: [],
            usage: 'usage [options]',
            examples: [
                'usage',
                'usage --source-dir=./src',
                'usage --output-dir=./reports'
            ]
        };
    }
}

module.exports = UsageCommand;