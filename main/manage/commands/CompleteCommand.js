#!/usr/bin/env node

/**
 * I18NTK COMPLETE COMMAND
 *
 * Handles completion analysis functionality.
 */

class CompleteCommand {
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
     * Execute the complete command
     */
    async execute(options = {}) {
        try {
            const completeTool = require('../../i18ntk-complete');
            const tool = new completeTool();
            await tool.run(options);
            return { success: true, command: 'complete' };
        } catch (error) {
            console.error(`Complete command failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get command metadata
     */
    getMetadata() {
        return {
            name: 'complete',
            description: 'Run complete analysis on translation files',
            category: 'analysis',
            aliases: [],
            usage: 'complete [options]',
            examples: [
                'complete',
                'complete --source-dir=./src/locales',
                'complete --output-dir=./reports'
            ]
        };
    }
}

module.exports = CompleteCommand;