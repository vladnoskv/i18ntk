/**
 * Authentication Service
 * Handles PIN protection, admin authentication, and security checks
 * @module services/AuthenticationService
 */

const AdminAuth = require('../../../utils/admin-auth');

module.exports = class AuthenticationService {
  constructor(config = {}) {
    this.config = config;
    this.settings = null;
    this.configManager = null;
    this.adminAuth = new AdminAuth();
  }

  /**
   * Initialize the service with required dependencies
   * @param {Object} configManager - Configuration manager instance
   */
  initialize(configManager) {
    this.configManager = configManager;
    this.settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
  }

  /**
   * Check if authentication is required for the system
   * @returns {Promise<boolean>} True if authentication is required
   */
  async isAuthRequired() {
    return await this.adminAuth.isAuthRequired();
  }

  /**
   * Check if authentication is required for a specific script
   * @param {string} scriptName - Name of the script to check
   * @returns {Promise<boolean>} True if authentication is required
   */
  async isAuthRequiredForScript(scriptName) {
    return await this.adminAuth.isAuthRequiredForScript(scriptName);
  }

  /**
   * Verify PIN for authentication
   * @param {string} pin - PIN to verify
   * @returns {Promise<boolean>} True if PIN is valid
   */
  async verifyPin(pin) {
    return await this.adminAuth.verifyPin(pin);
  }

  /**
   * Check admin authentication for protected operations
   * @param {Object} ui - UI instance for translations (optional)
   * @returns {Promise<boolean>} True if authentication passed
   */
  async checkAdminAuth(ui = null) {
    const isRequired = await this.isAuthRequired();
    if (!isRequired) {
      return true;
    }

    // Check if admin PIN was provided via command line
    const args = this.parseArgs();
    if (args.adminPin) {
      const isValid = await this.verifyPin(args.adminPin);
      if (isValid) {
        console.log(ui ? ui.t('adminCli.authSuccess') : 'Authentication successful');
        return true;
      } else {
        console.log(ui ? ui.t('adminCli.invalidPin') : 'Invalid PIN');
        return false;
      }
    }

    console.log(ui ? ui.t('adminCli.authRequired') : 'Admin authentication required');
    const cliHelper = require('../../../utils/cli-helper');
    const pin = await cliHelper.promptPin(ui ? ui.t('adminCli.enterPin') : 'Enter PIN: ');
    const isValid = await this.verifyPin(pin);

    if (!isValid) {
      console.log(ui ? ui.t('adminCli.invalidPin') : 'Invalid PIN');
      return false;
    }

    console.log(ui ? ui.t('adminCli.authSuccess') : 'Authentication successful');
    return true;
  }

  /**
   * Parse command line arguments for authentication-related flags
   * @returns {Object} Parsed arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};

    args.forEach(arg => {
      if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        const sanitizedKey = key?.trim();
        const sanitizedValue = value !== undefined ? value.trim() : true;

        switch (sanitizedKey) {
          case 'admin-pin':
            parsed.adminPin = sanitizedValue || '';
            break;
          case 'no-prompt':
            parsed.noPrompt = true;
            break;
          default:
            break;
        }
      }
    });

    return parsed;
  }

  /**
   * Check if we're in non-interactive mode
   * @returns {boolean} True if in non-interactive mode
   */
  isNonInteractiveMode() {
    return !process.stdin.isTTY || process.stdin.destroyed;
  }

  /**
   * Prompt user for input with fallback for non-interactive mode
   * @param {string} question - Question to ask
   * @returns {Promise<string>} User input or empty string
   */
  async prompt(question) {
    const cliHelper = require('../../../utils/cli-helper');
    // If interactive not available, return empty string to avoid hangs
    if (!process.stdin.isTTY || process.stdin.destroyed) {
      console.log('\n⚠️ Interactive input not available, using default response.');
      return Promise.resolve('');
    }
    return cliHelper.prompt(`${question} `);
  }

  /**
   * Safe method to close readline interface
   */
  safeClose() {
    // This would be implemented if we had a readline interface to close
    // For now, it's a placeholder for compatibility
  }

  /**
   * Get execution context based on options and environment
   * @param {Object} options - Execution options
   * @returns {Object} Execution context information
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
   * Execute command with authentication checks
   * @param {string} command - Command to execute
   * @param {Object} options - Execution options
   * @param {Object} ui - UI instance for translations (optional)
   * @returns {Promise<boolean>} True if command should proceed
   */
  async executeCommandWithAuth(command, options = {}, ui = null) {
    console.log(ui ? ui.t('menu.executingCommand', { command }) : `Executing command: ${command}`);

    // Enhanced context detection
    const executionContext = this.getExecutionContext(options);
    const isDirectCommand = executionContext.type === 'direct';
    const isWorkflowExecution = executionContext.type === 'workflow';
    const isManagerExecution = executionContext.type === 'manager';

    // Check admin authentication for all commands when PIN protection is enabled
    const authRequiredCommands = ['init', 'analyze', 'validate', 'usage', 'scanner', 'complete', 'fix', 'sizing', 'workflow', 'status', 'delete', 'settings', 'debug'];
    if (authRequiredCommands.includes(command)) {
      const authPassed = await this.checkAdminAuth(ui);
      if (!authPassed) {
        if (!this.isNonInteractiveMode() && !isDirectCommand) {
          await this.prompt(ui ? ui.t('menu.pressEnterToContinue') : 'Press Enter to continue...');
        }
        return false;
      }
    }

    return true;
  }

  /**
   * Handle command completion based on execution context
   * @param {Object} executionContext - Execution context information
   * @param {Object} ui - UI instance for translations (optional)
   * @returns {Promise<void>}
   */
  async handleCommandCompletion(executionContext, ui = null) {
    const isDirectCommand = executionContext.type === 'direct';
    const isWorkflowExecution = executionContext.type === 'workflow';
    const isManagerExecution = executionContext.type === 'manager';

    console.log(ui ? ui.t('operations.completed') : 'Operation completed');

    if (isManagerExecution && !this.isNonInteractiveMode()) {
      // Interactive menu execution - return to menu
      await this.prompt(ui ? ui.t('menu.returnToMainMenu') : 'Press Enter to return to main menu...');
    } else {
      // Direct commands, non-interactive mode, or workflow execution - exit immediately
      console.log(ui ? ui.t('workflow.exitingCompleted') : 'Exiting...');
      this.safeClose();
      process.exit(0);
    }
  }

  /**
   * Handle command error based on execution context
   * @param {Error} error - Error that occurred
   * @param {Object} executionContext - Execution context information
   * @param {Object} ui - UI instance for translations (optional)
   * @returns {Promise<void>}
   */
  async handleCommandError(error, executionContext, ui = null) {
    const isDirectCommand = executionContext.type === 'direct';
    const isWorkflowExecution = executionContext.type === 'workflow';
    const isManagerExecution = executionContext.type === 'manager';

    if (ui && ui.t) {
      console.error(ui.t('common.errorExecutingCommand', { error: error.message }));
    } else {
      console.error(`Error executing command: ${error.message}`);
    }

    if (isManagerExecution && !this.isNonInteractiveMode()) {
      // Interactive menu execution - show error and return to menu
      await this.prompt(ui ? ui.t('menu.pressEnterToContinue') : 'Press Enter to continue...');
    } else if (isDirectCommand && !this.isNonInteractiveMode()) {
      // Direct command execution - show "enter to continue" and exit with error
      await this.prompt(ui ? ui.t('menu.pressEnterToContinue') : 'Press Enter to continue...');
      this.safeClose();
      process.exit(1);
    } else {
      // Non-interactive mode or workflow execution - exit immediately with error
      this.safeClose();
      process.exit(1);
    }
  }
};