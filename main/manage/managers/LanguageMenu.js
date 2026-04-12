/**
 * Language Menu Manager
 * @module managers/LanguageMenu
 */

const { t } = require('../../../utils/i18n-helper');
const { loadTranslations } = require('../../../utils/i18n-helper');
const SecurityUtils = require('../../../utils/security');

module.exports = class LanguageMenu {
  constructor(manager) {
    this.manager = manager; // Reference to I18nManager for access to methods and properties
    this.ui = manager.ui;
  }

  /**
   * Display the language selection menu
   */
  async showLanguageMenu() {
    console.log(`\n${t('language.title')}`);
    console.log(t('language.separator'));
    console.log(t('language.current', { language: this.ui.getLanguageDisplayName(this.ui.getCurrentLanguage()) }));
    console.log('\n' + t('language.available'));

    this.ui.availableLanguages.forEach((lang, index) => {
      const displayName = this.ui.getLanguageDisplayName(lang);
      const current = lang === this.ui.getCurrentLanguage() ? ' ✓' : '';
      console.log(t('language.languageOption', { index: index + 1, displayName, current }));
    });

    console.log(`0. ${t('language.backToMainMenu')}`);

    const choice = await this.manager.prompt('\n' + t('language.prompt'));
    const choiceNum = parseInt(choice);

    if (choiceNum === 0) {
      await this.manager.showInteractiveMenu();
      return;
    } else if (choiceNum >= 1 && choiceNum <= this.ui.availableLanguages.length) {
      const selectedLang = this.ui.availableLanguages[choiceNum - 1];
      try {
        await this.ui.changeLanguage(selectedLang);
        console.log(t('language.changed', { language: this.ui.getLanguageDisplayName(selectedLang) }));
      } catch (error) {
        console.error(t('language.changeFailed', { error: error.message }));
        SecurityUtils.logSecurityEvent('Language change failed', 'error', { error: error.message, language: selectedLang });
      }

      // Force reload translations for the entire system
      loadTranslations(selectedLang);

      // Return to main menu with new language
      await this.manager.prompt('\n' + t('language.pressEnterToContinue'));
      await this.manager.showInteractiveMenu();
    } else {
      console.log(t('language.invalid'));
      await this.manager.prompt('\n' + t('language.pressEnterToContinue'));
      await this.showLanguageMenu();
    }
  }

  /**
   * Alias for showLanguageMenu for backward compatibility
   */
  async show() {
    return this.showLanguageMenu();
  }
};
