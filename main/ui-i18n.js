/**
 * UI Internationalization Module
 * Handles loading and managing UI translations for the i18n management tool
 */

const fs = require('fs');
const path = require('path');
const settingsManager = require('../settings/settings-manager');

// Get configuration from settings manager
function getConfig() {
  const settings = settingsManager.getSettings();
  return {
    uiLocalesDir: settings.directories?.uiLocalesDir || path.join(__dirname, '..', 'ui-locales'),
    configFile: settings.directories?.configFile || path.join(__dirname, '..', 'settings', 'user-config.json')
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

        // Use settings manager as the single source of truth
        const settings = settingsManager.getSettings();
        const configuredLanguage = settings.language;

        // Load language from settings manager or fallback
        if (configuredLanguage && this.availableLanguages.includes(configuredLanguage)) {
            this.loadLanguage(configuredLanguage);
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
                // Try to get English fallback if current language is not English
                if (this.currentLanguage !== 'en') {
                    const englishFallback = this.getEnglishFallback(keyPath, replacements);
                    if (englishFallback) {
                        return englishFallback;
                    }
                }
                console.warn(`⚠️  Translation key not found: ${keyPath}`);
                return keyPath; // Return the key path as fallback
            }
        }

        // Handle different data types
        if (typeof value === 'string') {
            // Check if the value is [NOT TRANSLATED] and provide English fallback
            if (value === '[NOT TRANSLATED]' && this.currentLanguage !== 'en') {
                const englishFallback = this.getEnglishFallback(keyPath, replacements);
                if (englishFallback) {
                    return `${englishFallback} [NOT TRANSLATED]`;
                }
                return `[NOT TRANSLATED: ${keyPath}]`;
            }
            
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
     * Get English fallback for a translation key
     * @param {string} keyPath - Dot-separated key path
     * @param {object} replacements - Object with replacement values
     * @returns {string|null} English translation or null if not found
     */
    getEnglishFallback(keyPath, replacements = {}) {
        try {
            const englishFile = path.join(this.uiLocalesDir, 'en.json');
            if (fs.existsSync(englishFile)) {
                const englishContent = fs.readFileSync(englishFile, 'utf8');
                const englishTranslations = JSON.parse(englishContent);
                
                const keys = keyPath.split('.');
                let value = englishTranslations;
                
                for (const key of keys) {
                    if (value && typeof value === 'object' && key in value) {
                        value = value[key];
                    } else {
                        return null;
                    }
                }
                
                if (typeof value === 'string') {
                    // Replace placeholders in English fallback
                    let result = value;
                    for (const [placeholder, replacement] of Object.entries(replacements)) {
                        result = result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), replacement);
                    }
                    return result;
                }
            }
        } catch (error) {
            // Silently fail and return null
        }
        return null;
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
        // Use the existing readline interface from the manager if available
        const rl = global.activeReadlineInterface;
        
        if (!rl) {
            console.error('❌ No active readline interface available');
            return this.currentLanguage;
        }

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
                    resolve(this.currentLanguage);
                } else if (choice >= 1 && choice <= this.availableLanguages.length) {
                    const selectedLang = this.availableLanguages[choice - 1];
                    this.changeLanguage(selectedLang);
                    console.log(this.t('language.changed', { language: this.getLanguageDisplayName(selectedLang) }));
                    resolve(selectedLang);
                } else {
                    console.log(this.t('language.invalid'));
                    resolve(this.currentLanguage);
                }
            });
        });
    }

    /**
     * Save language preference using settings manager
     * @param {string} language - Language code to save
     */
    saveLanguagePreference(language) {
        try {
            const settings = settingsManager.getSettings();
            settings.language = language;
            settingsManager.saveSettings(settings);
        } catch (error) {
            console.error(`❌ Error saving language preference:`, error.message);
        }
    }

    /**
     * Refresh language from current settings
     * Call this after settings changes to update UI language
     */
    refreshLanguageFromSettings() {
        const settings = settingsManager.getSettings();
        const configuredLanguage = settings.language;
        
        if (configuredLanguage && this.availableLanguages.includes(configuredLanguage)) {
            if (configuredLanguage !== this.currentLanguage) {
                this.loadLanguage(configuredLanguage);
                console.log(`🌍 UI language updated to: ${this.getLanguageDisplayName(configuredLanguage)}`);
            }
        }
    }

    /**
     * Remove the old loadUserConfig and saveUserConfig methods
     * as they're now handled by settings-manager
     */
}

// Export the class, not a singleton instance
module.exports = UIi18n;