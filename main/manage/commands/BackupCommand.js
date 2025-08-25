#!/usr/bin/env node

/**
 * I18NTK BACKUP COMMAND
 *
 * Handles backup operations for translation files and settings.
 */

const I18nBackup = require('../../i18ntk-backup-class');

class BackupCommand {
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
     * Execute the backup command
     */
    async execute(options = {}) {
        try {
            const backup = new I18nBackup();
            await backup.run(options);
            return { success: true, command: 'backup' };
        } catch (error) {
            console.error(`Backup command failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get command metadata
     */
    getMetadata() {
        return {
            name: 'backup',
            description: 'Create backups of translation files and settings',
            category: 'maintenance',
            aliases: [],
            usage: 'backup [options]',
            examples: [
                'backup',
                'backup --output-dir=./backups',
                'backup --include-settings'
            ]
        };
    }
}

module.exports = BackupCommand;