/**
 * Debug Menu Manager
 * @module managers/DebugMenu
 */

const path = require('path');
const fs = require('fs');
const { t } = require('../../../utils/i18n-helper');

module.exports = class DebugMenu {
  constructor(manager) {
    this.manager = manager; // Reference to I18nManager for access to methods and properties
    this.adminAuth = manager.adminAuth;
  }

  /**
   * Display the debug tools menu
   */
  async showDebugMenu() {
    // Check for PIN protection
    const authRequired = await this.adminAuth.isAuthRequiredForScript('debugMenu');
    if (authRequired) {
      console.log(`\n${t('adminPin.protectedAccess')}`);
      const cliHelper = require('../../../utils/cli-helper');
      const pin = await cliHelper.promptPin(t('adminPin.enterPin') + ': ');
      const isValid = await this.adminAuth.verifyPin(pin);

      if (!isValid) {
        console.log(t('adminPin.invalidPin'));
        await this.manager.prompt(t('menu.pressEnterToContinue'));
        await this.manager.showInteractiveMenu();
        return;
      }

      console.log(t('adminPin.accessGranted'));
    }

    console.log(`\n${t('debug.title')}`);
    console.log(t('debug.separator'));
    console.log(t('debug.mainDebuggerSystemDiagnostics'));
    console.log(t('debug.debugLogs'));
    console.log(t('debug.backToMainMenu'));

    const choice = await this.manager.prompt('\n' + t('debug.selectOption'));

    switch (choice.trim()) {
      case '1':
        await this.runDebugTool('debugger.js', 'Main Debugger');
        break;
      case '2':
        await this.viewDebugLogs();
        break;
      case '0':
        await this.manager.showInteractiveMenu();
        return;
      default:
        console.log(t('debug.invalidChoiceSelectRange'));
        await this.showDebugMenu();
    }
  }

  /**
   * Run a specific debug tool
   */
  async runDebugTool(toolName, displayName) {
    console.log(t('debug.runningDebugTool', { displayName }));
    try {
      const toolPath = path.join(__dirname, '..', '..', 'scripts', 'debug', toolName);
      if (fs.existsSync(toolPath)) {
        console.log(`Debug tool available: ${toolName}`);
        console.log(`To run this tool manually: node "${toolPath}"`);
        console.log(`Working directory: ${path.join(__dirname, '..', '..')}`);
      } else {
        console.log(t('debug.debugToolNotFound', { toolName }));
      }
    } catch (error) {
      console.error(t('debug.errorRunningDebugTool', { displayName, error: error.message }));
    }

    await this.manager.prompt('\n' + t('menu.pressEnterToContinue'));
    await this.showDebugMenu();
  }

  /**
   * View debug logs
   */
  async viewDebugLogs() {
    console.log(`\n${t('debug.recentDebugLogs')}`);
    console.log('============================================================');

    try {
      const logsDir = path.join(__dirname, '..', '..', 'scripts', 'debug', 'logs');
      if (fs.existsSync(logsDir)) {
        const files = fs.readdirSync(logsDir)
          .filter(file => file.endsWith('.log') || file.endsWith('.txt'))
          .sort((a, b) => {
            const statA = fs.statSync(path.join(logsDir, a));
            const statB = fs.statSync(path.join(logsDir, b));
            return statB.mtime - statA.mtime;
          })
          .slice(0, 5);

        if (files.length > 0) {
          files.forEach((file, index) => {
            const filePath = path.join(logsDir, file);
            const stats = fs.statSync(filePath);
            console.log(`${index + 1}. ${file} (${stats.mtime.toLocaleString()})`);
          });

          const choice = await this.manager.prompt('\n' + t('debug.selectLogPrompt', { count: files.length }));
          const fileIndex = parseInt(choice) - 1;

          if (fileIndex >= 0 && fileIndex < files.length) {
            const logContent = fs.readFileSync(path.join(logsDir, files[fileIndex]), 'utf8');
            console.log(`\n${t('debug.contentOf', { filename: files[fileIndex] })}:`);
            console.log('============================================================');
            console.log(logContent.slice(-2000)); // Show last 2000 characters
            console.log('============================================================');
          }
        } else {
          console.log(t('debug.noDebugLogsFound'));
        }
      } else {
        console.log(t('debug.debugLogsDirectoryNotFound'));
      }
    } catch (error) {
      console.error(t('errors.errorReadingDebugLogs', { error: error.message }));
    }

    await this.manager.prompt('\n' + t('menu.pressEnterToContinue'));
    await this.manager.showInteractiveMenu();
  }

  /**
   * Alias for showDebugMenu for backward compatibility
   */
  async show() {
    return this.showDebugMenu();
  }
};