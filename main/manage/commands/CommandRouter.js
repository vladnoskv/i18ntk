#!/usr/bin/env node

/**
 * I18NTK COMMAND ROUTER
 *
 * Central command routing system for i18n operations.
 * Handles command execution, authentication, and completion management.
 */

const path = require('path');
const { t } = require('../../../utils/i18n-helper');

// Import command handlers
const InitCommand = require('./InitCommand');
const AnalyzeCommand = require('./AnalyzeCommand');
const ValidateCommand = require('./ValidateCommand');
const CompleteCommand = require('./CompleteCommand');
const SummaryCommand = require('./SummaryCommand');
const SizingCommand = require('./SizingCommand');
const UsageCommand = require('./UsageCommand');
const BackupCommand = require('./BackupCommand');
const DoctorCommand = require('./DoctorCommand');
const FixerCommand = require('./FixerCommand');
const ScannerCommand = require('./ScannerCommand');

class CommandRouter {
    constructor(config = {}, ui = null, adminAuth = null) {
        this.config = config;
        this.ui = ui;
        this.adminAuth = adminAuth;
        this.prompt = null;
        this.isNonInteractiveMode = false;
        this.safeClose = null;

        // Initialize command handlers
        this.commandHandlers = {
            'init': new InitCommand(config, ui),
            'analyze': new AnalyzeCommand(config, ui),
            'validate': new ValidateCommand(config, ui),
            'complete': new CompleteCommand(config, ui),
            'summary': new SummaryCommand(config, ui),
            'sizing': new SizingCommand(config, ui),
            'usage': new UsageCommand(config, ui),
            'backup': new BackupCommand(config, ui),
            'doctor': new DoctorCommand(config, ui),
            'fix': new FixerCommand(config, ui),
            'scanner': new ScannerCommand(config, ui)
        };
    }

    /**
     * Set runtime dependencies for interactive operations
     */
    setRuntimeDependencies(prompt, isNonInteractiveMode, safeClose) {
        this.prompt = prompt;
        this.isNonInteractiveMode = isNonInteractiveMode;
        this.safeClose = safeClose;

        // Update command handlers with runtime dependencies
        Object.values(this.commandHandlers).forEach(handler => {
            if (typeof handler.setRuntimeDependencies === 'function') {
                handler.setRuntimeDependencies(prompt, isNonInteractiveMode, safeClose);
            }
        });
    }

    /**
     * Determine execution context based on options and environment
     */
    getExecutionContext(options = {}) {
        // Check if called from interactive menu
        if (options.fromMenu === true) {
            return { type: 'manager', source: 'interactive_menu' };
        }

        // Check if called from workflow/autorun
        if (options.fromWorkflow === true) {
            return { type: 'workflow', source: 'autorun_script' };
        }

        // Check if this is a direct command line execution
        if (process.argv.some(arg => arg.startsWith('--command='))) {
            return { type: 'direct', source: 'command_line' };
        }

        // Default to direct execution
        return { type: 'direct', source: 'unknown' };
    }

    /**
     * Check admin authentication for protected commands
     */
    async checkAdminAuth() {
        if (!this.adminAuth) {
            return true; // No auth service available, allow execution
        }

        const isRequired = await this.adminAuth.isAuthRequired();
        if (!isRequired) {
            return true;
        }

        console.log(t('adminCli.authRequired'));
        const cliHelper = require('../../../utils/cli-helper');
        const pin = await cliHelper.promptPin(t('adminCli.enterPin'));
        const isValid = await this.adminAuth.verifyPin(pin);

        if (!isValid) {
            console.log(t('adminCli.invalidPin'));
            return false;
        }

        console.log(t('adminCli.authSuccess'));
        return true;
    }

    /**
     * Execute a command with proper routing and error handling
     */
    async executeCommand(command, options = {}) {
        console.log(t('menu.executingCommand', { command }));

        // Enhanced context detection
        const executionContext = this.getExecutionContext(options);
        const isDirectCommand = executionContext.type === 'direct';
        const isWorkflowExecution = executionContext.type === 'workflow';
        const isManagerExecution = executionContext.type === 'manager';

        // Ensure UI language is refreshed from settings for workflow and direct execution
        if (isWorkflowExecution || isDirectCommand) {
            if (this.ui && typeof this.ui.refreshLanguageFromSettings === 'function') {
                this.ui.refreshLanguageFromSettings();
            }
        }

        // Check admin authentication for protected commands
        const authRequiredCommands = [
            'init', 'analyze', 'validate', 'usage', 'scanner',
            'complete', 'fix', 'sizing', 'workflow', 'status',
            'delete', 'settings', 'debug', 'backup', 'doctor'
        ];

        if (authRequiredCommands.includes(command)) {
            const authPassed = await this.checkAdminAuth();
            if (!authPassed) {
                if (!this.isNonInteractiveMode && !isDirectCommand && this.prompt) {
                    await this.prompt(t('menu.pressEnterToContinue'));
                    // Return to menu would be handled by caller
                }
                return;
            }
        }

        try {
            // Route command to appropriate handler
            const result = await this.routeCommand(command, options, executionContext);

            // Handle command completion based on execution context
            console.log(t('operations.completed'));

            if (isManagerExecution && !this.isNonInteractiveMode && this.prompt) {
                // Interactive menu execution - return to menu
                await this.prompt(t('menu.returnToMainMenu'));
                // Menu return would be handled by caller
            } else {
                // Direct commands, non-interactive mode, or workflow execution - exit immediately
                console.log(t('workflow.exitingCompleted'));
                if (this.safeClose) this.safeClose();
                process.exit(0);
            }

        } catch (error) {
            console.error(t('common.errorExecutingCommand', { error: error.message }));

            if (isManagerExecution && !this.isNonInteractiveMode && this.prompt) {
                // Interactive menu execution - show error and return to menu
                await this.prompt(t('menu.pressEnterToContinue'));
                // Menu return would be handled by caller
            } else if (isDirectCommand && !this.isNonInteractiveMode && this.prompt) {
                // Direct command execution - show "enter to continue" and exit with error
                await this.prompt(t('menu.pressEnterToContinue'));
                if (this.safeClose) this.safeClose();
                process.exit(1);
            } else {
                // Non-interactive mode or workflow execution - exit immediately with error
                if (this.safeClose) this.safeClose();
                process.exit(1);
            }
        }
    }

    /**
     * Route command to the appropriate handler
     */
    async routeCommand(command, options, executionContext) {
        const isManagerExecution = executionContext.type === 'manager';

        switch (command) {
            case 'init':
                return await this.commandHandlers.init.execute(options);

            case 'analyze':
                return await this.commandHandlers.analyze.execute(options);

            case 'validate':
                return await this.commandHandlers.validate.execute(options);

            case 'complete':
                return await this.commandHandlers.complete.execute(options);

            case 'summary':
                return await this.commandHandlers.summary.execute(options);

            case 'sizing':
                return await this.commandHandlers.sizing.execute(options);

            case 'usage':
                return await this.commandHandlers.usage.execute(options);

            case 'backup':
                return await this.commandHandlers.backup.execute(options);

            case 'doctor':
                return await this.commandHandlers.doctor.execute(options);

            case 'fix':
                return await this.commandHandlers.fix.execute(options);

            case 'scanner':
                return await this.commandHandlers.scanner.execute(options);

            case 'debug':
                console.log('Debug functionality is not available in this version.');
                return { success: false, message: 'Debug not available' };

            case 'help':
                this.showHelp();
                if (isManagerExecution && !this.isNonInteractiveMode && this.prompt) {
                    await this.prompt(t('menu.pressEnterToContinue'));
                    // Menu return would be handled by caller
                } else {
                    console.log(t('workflow.exitingCompleted'));
                    if (this.safeClose) this.safeClose();
                    process.exit(0);
                }
                return { success: true, command: 'help' };

            default:
                console.log(t('menu.unknownCommand', { command }));
                this.showHelp();
                return { success: false, error: 'Unknown command' };
        }
    }

    /**
     * Show help information
     */
    showHelp() {
        const localT = this.ui && this.ui.t ? this.ui.t.bind(this.ui) : (key) => key;

        console.log(t('help.usage'));
        console.log(t('help.interactiveMode'));
        console.log(t('help.initProject'));
        console.log(t('help.analyzeTranslations'));
        console.log(t('help.validateTranslations'));
        console.log(t('help.checkUsage'));
        console.log(t('help.showHelp'));
        console.log(t('help.availableCommands'));
        console.log(t('help.initCommand'));
        console.log(t('help.analyzeCommand'));
        console.log(t('help.validateCommand'));
        console.log(t('help.usageCommand'));
        console.log(t('help.sizingCommand'));
        console.log(t('help.completeCommand'));
        console.log(t('help.summaryCommand'));
        console.log(t('help.debugCommand'));
        console.log(t('help.scannerCommand'));
    }

    /**
     * Get list of available commands
     */
    getAvailableCommands() {
        return Object.keys(this.commandHandlers);
    }

    /**
     * Check if a command is available
     */
    isCommandAvailable(command) {
        return command in this.commandHandlers;
    }
}

module.exports = CommandRouter;