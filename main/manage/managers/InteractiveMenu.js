/**
 * Interactive Menu Manager
 * @module managers/InteractiveMenu
 * @deprecated This module is superseded by the I18nManager.showInteractiveMenu
 *   implementation in main/manage/index.js. This file is retained only for
 *   backward compatibility with existing test references and should not be
 *   used in new code.
 */

const { t } = require('../../../utils/i18n-helper');
const cliHelper = require('../../../utils/cli-helper');
const { buildMainMenuLines } = require('../../../utils/menu-layout');
const summaryTool = require('../../i18ntk-summary');

module.exports = class InteractiveMenu {
  constructor(manager) {
    this.manager = manager; // Reference to I18nManager for access to methods and properties
    this.adminAuth = manager.adminAuth;
    this.ui = manager.ui;
  }

  /**
   * Display the main interactive menu with 13 options
   */
  async showInteractiveMenu() {
    // Check if we're in non-interactive mode (like echo 0 | node script)
    if (this.manager.isNonInteractiveMode()) {
      console.log(buildMainMenuLines(t, { includeTranslate: false }).join('\n'));

      console.log('\n' + t('menu.nonInteractiveModeWarning'));
      console.log(t('menu.useDirectExecution'));
      console.log(t('menu.useHelpForCommands'));
      this.manager.safeClose();
      process.exit(0);
      return;
    }

    console.log(buildMainMenuLines(t, { includeTranslate: false }).join('\n'));

    const choice = await this.manager.prompt('\n' + t('menu.selectOptionPrompt'));

    switch (choice.trim()) {
      case '1':
        await this.manager.executeCommand('init', {fromMenu: true});
        break;
      case '2':
        await this.manager.executeCommand('analyze', {fromMenu: true});
        break;
      case '3':
        await this.manager.executeCommand('validate', {fromMenu: true});
        break;
      case '4':
        await this.manager.executeCommand('usage', {fromMenu: true});
        break;
      case '5':
        await this.manager.executeCommand('complete', {fromMenu: true});
        break;
      case '6':
        await this.manager.executeCommand('sizing', {fromMenu: true});
        break;
      case '7':
        await this.manager.executeCommand('fix', {fromMenu: true});
        break;
      case '8':
        // Check for PIN protection
        const authRequired = await this.adminAuth.isAuthRequiredForScript('summaryReports');
        if (authRequired) {
          console.log(`\n${t('adminCli.protectedAccess')}`);
          const pin = await cliHelper.promptPin(t('adminCli.enterPin') + ': ');
          const isValid = await this.adminAuth.verifyPin(pin);

          if (!isValid) {
            console.log(t('adminCli.invalidPin'));
            await this.manager.prompt(t('menu.pressEnterToContinue'));
            await this.showInteractiveMenu();
            return;
          }

          console.log(t('adminCli.accessGranted'));
        }

        console.log(t('summary.status.generating'));
        try {
          const summary = new summaryTool();
          await summary.run({ fromMenu: true });
          console.log(t('summary.status.completed'));

          // Check if we're in interactive mode before prompting
          if (!this.manager.isNonInteractiveMode()) {
            try {
              await this.manager.prompt('\n' + t('debug.pressEnterToContinue'));
              await this.showInteractiveMenu();
            } catch (error) {
              console.log(t('menu.returning'));
              process.exit(0);
            }
          } else {
            console.log(t('status.exitingCompleted'));
            process.exit(0);
          }
        } catch (error) {
          console.error(t('common.errorGeneratingStatusSummary', { error: error.message }));

          // Check if we're in interactive mode before prompting
          if (!this.manager.isNonInteractiveMode()) {
            try {
              await this.manager.prompt('\n' + t('debug.pressEnterToContinue'));
              await this.showInteractiveMenu();
            } catch (error) {
              console.log(t('menu.returning'));
              process.exit(0);
            }
          } else {
            console.log(t('common.errorExiting'));
            process.exit(1);
          }
        }
        break;
      case '9':
        await this.manager.deleteReports();
        break;
      case '10':
        await this.manager.showSettingsMenu();
        break;
      case '11':
        this.manager.showHelp();
        await this.manager.prompt(t('menu.returnToMainMenu'));
        await this.showInteractiveMenu();
        break;
      case '12':
        await this.manager.showLanguageMenu();
        break;
      case '13':
        await this.manager.executeCommand('scanner', {fromMenu: true});
        break;
      case '0':
        console.log(t('menu.goodbye'));
        this.manager.safeClose();
        process.exit(0);
      default:
        console.log(t('menu.invalidChoice'));
        await this.showInteractiveMenu();
    }
  }

  /**
   * Alias for showInteractiveMenu for backward compatibility
   */
  async show() {
    return this.showInteractiveMenu();
  }
};
