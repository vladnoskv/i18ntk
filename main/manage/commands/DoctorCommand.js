#!/usr/bin/env node

/**
 * I18NTK DOCTOR COMMAND
 *
 * Handles diagnostic functionality for i18n toolkit.
 */

const I18nDoctor = require('../../i18ntk-doctor');

class DoctorCommand {
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
     * Execute the doctor command
     */
    async execute(options = {}) {
        try {
            const doctor = new I18nDoctor();
            await doctor.run(options);
            return { success: true, command: 'doctor' };
        } catch (error) {
            console.error(`Doctor command failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get command metadata
     */
    getMetadata() {
        return {
            name: 'doctor',
            description: 'Run diagnostic checks on i18n setup and configuration',
            category: 'diagnostic',
            aliases: ['diagnose'],
            usage: 'doctor [options]',
            examples: [
                'doctor',
                'doctor --verbose',
                'doctor --fix'
            ]
        };
    }
}

module.exports = DoctorCommand;