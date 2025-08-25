#!/usr/bin/env node

/**
 * I18NTK SIZING COMMAND
 *
 * Handles translation sizing analysis functionality.
 */

const I18nSizingAnalyzer = require('../../i18ntk-sizing');

class SizingCommand {
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
     * Execute the sizing command
     */
    async execute(options = {}) {
        try {
            const sizingAnalyzer = new I18nSizingAnalyzer();
            await sizingAnalyzer.run(options);
            return { success: true, command: 'sizing' };
        } catch (error) {
            console.error(`Sizing command failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get command metadata
     */
    getMetadata() {
        return {
            name: 'sizing',
            description: 'Analyze translation file sizes and content metrics',
            category: 'analysis',
            aliases: [],
            usage: 'sizing [options]',
            examples: [
                'sizing',
                'sizing --source-dir=./src/locales',
                'sizing --output-dir=./reports'
            ]
        };
    }
}

module.exports = SizingCommand;