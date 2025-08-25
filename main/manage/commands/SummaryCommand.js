#!/usr/bin/env node

/**
 * I18NTK SUMMARY COMMAND
 *
 * Handles summary and status reporting functionality.
 */

class SummaryCommand {
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
     * Execute the summary command
     */
    async execute(options = {}) {
        try {
            const summaryTool = require('../../i18ntk-summary');
            const summary = new summaryTool();
            await summary.run(options);
            return { success: true, command: 'summary' };
        } catch (error) {
            console.error(`Summary command failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get command metadata
     */
    getMetadata() {
        return {
            name: 'summary',
            description: 'Generate summary report of translation status',
            category: 'reporting',
            aliases: ['status'],
            usage: 'summary [options]',
            examples: [
                'summary',
                'summary --output-dir=./reports',
                'summary --format=json'
            ]
        };
    }
}

module.exports = SummaryCommand;