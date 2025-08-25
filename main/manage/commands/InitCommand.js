#!/usr/bin/env node

/**
 * I18NTK INIT COMMAND
 *
 * Handles project initialization and setup functionality.
 */

const I18nInitializer = require('../../i18ntk-init');

class InitCommand {
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
     * Execute the init command
     */
    async execute(options = {}) {
        try {
            const initializer = new I18nInitializer(this.config);
            await initializer.run(options);
            return { success: true, command: 'init' };
        } catch (error) {
            console.error(`Init command failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get command metadata
     */
    getMetadata() {
        return {
            name: 'init',
            description: 'Initialize i18n project structure',
            category: 'setup',
            aliases: [],
            usage: 'init [options]',
            examples: [
                'init',
                'init --source-dir=./src/locales',
                'init --i18n-dir=./locales'
            ]
        };
    }
}

module.exports = InitCommand;