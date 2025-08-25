/**
 * Interactive Menu Manager
 * @module managers/InteractiveMenu
 */

const { t } = require('../../../utils/i18n-helper');

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
      console.log(`\n${t('menu.title')}`);
      console.log(t('menu.separator'));
      console.log(`1. ${t('menu.options.init')}`);
      console.log(`2. ${t('menu.options.analyze')}`);
      console.log(`3. ${t('menu.options.validate')}`);
      console.log(`4. ${t('menu.options.usage')}`);
      console.log(`5. ${t('menu.options.complete')}`);
      console.log(`6. ${t('menu.options.sizing')}`);
      console.log(`7. ${t('menu.options.fix')}`);
      console.log(`8. ${t('menu.options.status')}`);
      console.log(`9. ${t('menu.options.delete')}`);
      console.log(`10. ${t('menu.options.settings')}`);
      console.log(`11. ${t('menu.options.help')}`);
      console.log(`12. ${t('menu.options.language')}`);
      console.log(`13. ${t('menu.options.scanner')}`);
      console.log(`0. ${t('menu.options.exit')}`);

      console.log('\n' + t('menu.nonInteractiveModeWarning'));
      console.log(t('menu.useDirectExecution'));
      console.log(t('menu.useHelpForCommands'));
      this.manager.safeClose();
      process.exit(0);
      return;
    }

    console.log(`\n${t('menu.title')}`);
    console.log(t('menu.separator'));
    console.log(`1. ${t('menu.options.init')}`);
    console.log(`2. ${t('menu.options.analyze')}`);
    console.log(`3. ${t('menu.options.validate')}`);
    console.log(`4. ${t('menu.options.usage')}`);
    console.log(`5. ${t('menu.options.complete')}`);
    console.log(`6. ${t('menu.options.sizing')}`);
    console.log(`7. ${t('menu.options.fix')}`);
    console.log(`8. ${t('menu.options.status')}`);
    console.log(`9. ${t('menu.options.delete')}`);
    console.log(`10. ${t('menu.options.settings')}`);
    console.log(`11. ${t('menu.options.help')}`);
    console.log(`12. ${t('menu.options.language')}`);
    console.log(`13. ${t('menu.options.scanner')}`);
    console.log(`0. ${t('menu.options.exit')}`);

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
          const cliHelper = require('../../../utils/cli-helper');
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
          const summaryTool = require('../../i18ntk-summary');
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