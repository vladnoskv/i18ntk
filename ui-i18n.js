/**
 * UI Internationalization Module
 * Handles loading and managing UI translations for the i18n management tool
 */

const fs = require('fs');
const path = require('path');
const settingsManager = require('./settings-manager');

// Get configuration from settings manager
function getConfig() {
  const settings = settingsManager.getSettings();
  return {
    uiLocalesDir: settings.directories?.uiLocalesDir || path.join(__dirname, 'ui-locales'),
    configFile: settings.directories?.configFile || path.join(__dirname, 'user-config.json')
  };
}

class UIi18n {
    constructor() {
        const config = getConfig();
        this.currentLanguage = 'en';
        this.translations = {};
        this.availableLanguages = ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'];
        this.uiLocalesDir = path.resolve(config.uiLocalesDir);
        this.configFile = path.resolve(config.configFile);

        // Load user config or create default
        this.userConfig = this.loadUserConfig();

        // Load language from config or fallback
        if (this.userConfig.language && this.availableLanguages.includes(this.userConfig.language)) {
            this.loadLanguage(this.userConfig.language);
        } else {
            this.loadLanguage('en');
        }
    }

    /**
     * Load translations for a specific language
     * @param {string} language - Language code (e.g., 'en', 'de', 'es')
     */
    loadLanguage(language) {
        if (!this.availableLanguages.includes(language)) {
            console.warn(`⚠️  Language '${language}' not available. Using English as fallback.`);
            language = 'en';
        }

        const translationFile = path.join(this.uiLocalesDir, `${language}.json`);
        
        try {
            if (fs.existsSync(translationFile)) {
                const content = fs.readFileSync(translationFile, 'utf8');
                this.translations = JSON.parse(content);
                this.currentLanguage = language;
            } else {
                console.warn(`⚠️  Translation file not found: ${translationFile}`);
                if (language !== 'en') {
                    this.loadLanguage('en'); // Fallback to English
                }
            }
        } catch (error) {
            console.error(`❌ Error loading translation file for '${language}':`, error.message);
            if (language !== 'en') {
                this.loadLanguage('en'); // Fallback to English
            }
        }
    }

    /**
     * Load user config from file or return default
     */
    loadUserConfig() {
        try {
            if (fs.existsSync(this.configFile)) {
                const content = fs.readFileSync(this.configFile, 'utf8');
                return JSON.parse(content);
            }
        } catch (error) {
            console.error(`❌ Error loading user config:`, error.message);
        }
        return { language: null, sizeLimit: null };
    }

    /**
     * Save user config to file
     */
    saveUserConfig() {
        try {
            fs.writeFileSync(this.configFile, JSON.stringify(this.userConfig, null, 2), 'utf8');
        } catch (error) {
            console.error(`❌ Error saving user config:`, error.message);
        }
    }

    /**
     * Run language selector on first run or when forced
     * @returns {Promise<string>} Selected language code
     */
    async initializeLanguage() {
        if (!this.userConfig.language) {
            const selectedLang = await this.selectLanguage();
            this.userConfig.language = selectedLang;
            this.saveUserConfig();
            this.changeLanguage(selectedLang);
            return selectedLang;
        } else {
            this.changeLanguage(this.userConfig.language);
            return this.userConfig.language;
        }
    }

    /**
     * Get translated text by key path
     * @param {string} keyPath - Dot-separated key path (e.g., 'menu.title')
     * @param {object} replacements - Object with replacement values
     * @returns {string|array|object} Translated text or data
     */
    t(keyPath, replacements = {}) {
        const keys = keyPath.split('.');
        let value = this.translations;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                console.warn(`⚠️  Translation key not found: ${keyPath}`);
                return keyPath; // Return the key path as fallback
            }
        }

        // Handle different data types
        if (typeof value === 'string') {
            // Replace placeholders in strings
            let result = value;
            for (const [placeholder, replacement] of Object.entries(replacements)) {
                result = result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), replacement);
            }
            return result;
        } else if (Array.isArray(value)) {
            // Return arrays as-is (for things like exampleList)
            return value;
        } else if (typeof value === 'object') {
            // Return objects as-is
            return value;
        } else {
            console.warn(`⚠️  Translation value has unexpected type: ${keyPath}`);
            return value;
        }
    }

    /**
     * Get current language code
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get list of available languages
     * @returns {Array} Array of language codes
     */
    getAvailableLanguages() {
        return this.availableLanguages;
    }

    /**
     * Change the current UI language
     * @param {string} language - New language code
     */
    changeLanguage(language) {
        this.loadLanguage(language);
        this.saveLanguagePreference(language);
    }

    /**
     * Get language display name
     * @param {string} langCode - Language code
     * @returns {string} Display name of the language
     */
    getLanguageDisplayName(langCode) {
        const displayNames = {
            'en': 'English',
            'de': 'Deutsch (German)',
            'es': 'Español (Spanish)',
            'fr': 'Français (French)',
            'ru': 'Русский (Russian)',
            'ja': '日本語 (Japanese)',
            'zh': '中文 (Chinese)'
        };
        return displayNames[langCode] || langCode;
    }

    /**
     * Interactive language selection menu
     * @returns {Promise<string>} Selected language code
     */
    async selectLanguage() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            console.log('\n' + this.t('language.title'));
            console.log(this.t('language.separator'));
            console.log(this.t('language.current', { language: this.getLanguageDisplayName(this.currentLanguage) }));
            console.log('\n' + this.t('language.available'));
            
            this.availableLanguages.forEach((lang, index) => {
                const displayName = this.getLanguageDisplayName(lang);
                const current = lang === this.currentLanguage ? ' ✓' : '';
                console.log(`  ${index + 1}. ${displayName}${current}`);
            });
            
            rl.question('\n' + this.t('language.prompt'), (answer) => {
                const choice = parseInt(answer);
                
                if (choice === 0) {
                    console.log(this.t('language.cancelled'));
                    rl.close();
                    resolve(this.currentLanguage);
                } else if (choice >= 1 && choice <= this.availableLanguages.length) {
                    const selectedLang = this.availableLanguages[choice - 1];
                    this.changeLanguage(selectedLang);
                    console.log(this.t('language.changed', { language: this.getLanguageDisplayName(selectedLang) }));
                    rl.close();
                    resolve(selectedLang);
                } else {
                    console.log(this.t('language.invalid'));
                    rl.close();
                    resolve(this.currentLanguage);
                }
            });
        });
    }

    /**
     * Save language preference to environment or config
     * @param {string} language - Language code to save
     */
    saveLanguagePreference(language) {
        this.userConfig.language = language;
        this.saveUserConfig();
        process.env.I18N_UI_LANGUAGE = language;
    }
}

// Export singleton instance
module.exports = new UIi18n();