/**
 * Settings Menu Manager
 * @module managers/SettingsMenu
 */

const { t } = require('../../../utils/i18n-helper');

module.exports = class SettingsMenu {
  constructor(manager) {
    this.manager = manager; // Reference to I18nManager for access to methods and properties
    this.adminAuth = manager.adminAuth;
  }

  /**
   * Display the settings management menu
   */
  async showSettingsMenu() {
    try {
      // Check for PIN protection
      const authRequired = await this.adminAuth.isAuthRequiredForScript('settingsMenu');
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

      const SettingsCLI = require('../../../settings/settings-cli');
      const settingsCLI = new SettingsCLI();
      await settingsCLI.run();
    } catch (error) {
      console.error('❌ Error opening settings:', error.message);
      await this.manager.prompt(t('menu.pressEnterToContinue'));
    }
    await this.manager.showInteractiveMenu();
  }

  /**
   * Alias for showSettingsMenu for backward compatibility
   */
  async show() {
    return this.showSettingsMenu();
  }
};