/**
 * UI Internationalization Module
 * Handles loading and managing UI translations for the i18n management tool
 */

const fs = require('fs');
const path = require('path');
const configManager = require('../utils/config-manager');

class UIi18n {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.uiLocalesDir = null;
        this.availableLanguages = [];
        this.configFile = path.resolve(configManager.CONFIG_PATH);
        
        // Initialize with safe defaults
        this.initialize();
    }
    
    initialize() {
        try {
            const config = configManager.getConfig();
            const paths = configManager.resolvePaths();

            const bundledDir = path.resolve(__dirname, '..', 'ui-locales');

            // Start with path from configuration if it exists, otherwise fallback to bundled
            let resolvedDir = paths?.uiLocalesDir;
            if (resolvedDir) {
                try {
                    resolvedDir = path.resolve(resolvedDir);
                    if (!fs.existsSync(resolvedDir)) {
                        resolvedDir = bundledDir;
                    }
                } catch {
                    resolvedDir = bundledDir;
                }
            } else {
                resolvedDir = bundledDir;
            }

            this.uiLocalesDir = resolvedDir;
            this.availableLanguages = this.detectAvailableLanguages();

            // If configured directory has no locales, fallback to bundled one
            if (this.availableLanguages.length === 0 && resolvedDir !== bundledDir) {
                this.uiLocalesDir = bundledDir;
                this.availableLanguages = this.detectAvailableLanguages();
            }

            const configuredLanguage = config?.language || config?.uiLanguage || 'en';

            // Load language from settings manager or fallback
            if (configuredLanguage && this.availableLanguages.includes(configuredLanguage)) {
                this.loadLanguage(configuredLanguage);
            } else {
                this.loadLanguage('en');
            }
        } catch (error) {
            console.warn('UIi18n: Failed to initialize with config, using defaults:', error.message);
            this.uiLocalesDir = path.resolve(__dirname, '..', 'ui-locales');
            this.availableLanguages = this.detectAvailableLanguages();
            this.loadLanguage('en');
        }
    }
    /**
     * Detect which UI locales are currently installed
     * @returns {string[]} Array of available language codes
     */
    detectAvailableLanguages() {
        const all = ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'];
        return all.filter(lang => {
            const filePath = path.join(this.uiLocalesDir, `${lang}.json`);
            return fs.existsSync(filePath);
        });
    }

    /**
     * Refresh the list of available languages and ensure current language is valid
     */
    refreshAvailableLanguages() {
        this.availableLanguages = this.detectAvailableLanguages();
        if (!this.availableLanguages.includes(this.currentLanguage)) {
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

        this.translations = {}; // Reset translations for the new language

        const settings = configManager.getConfig();
        const debugEnabled = settings.debug?.enabled || false;
        
        if (debugEnabled) {
            console.log(`UI: Attempting to load translations from monolith file for: ${language}`);
        }
        
        try {
            // Primary: Use monolith JSON file (en.json, de.json, etc.)
            const monolithTranslationFile = path.join(this.uiLocalesDir, `${language}.json`);
            
            if (fs.existsSync(monolithTranslationFile)) {
                try {
                    const content = fs.readFileSync(monolithTranslationFile, 'utf8');
                    const fullTranslations = JSON.parse(content);
                    
                    // Flatten the nested structure for easier key access
                    this.translations = this.flattenTranslations(fullTranslations);
                    this.currentLanguage = language;
                    
                    if (debugEnabled) {
                        console.log(`UI: Loaded monolith translation file: ${monolithTranslationFile}`);
                    }
                } catch (error) {
                    console.error(`UI: Error parsing monolith translation file ${monolithTranslationFile}: ${error.message}`);
                    this.translations = {};
                }
            } else {
                // Fallback: Use folder-based structure if monolith file doesn't exist
                const langDir = path.join(this.uiLocalesDir, language);
                
                if (fs.existsSync(langDir) && fs.statSync(langDir).isDirectory()) {
                    const files = fs.readdirSync(langDir).filter(file => file.endsWith('.json'));
                    if (debugEnabled) {
                        console.log(`UI: Found files in ${langDir}: ${files.join(', ')}`);
                    }
    
                    for (const file of files) {
                        const filePath = path.join(langDir, file);
                        try {
                            const content = fs.readFileSync(filePath, 'utf8');
                            const fileTranslations = JSON.parse(content);
                            const moduleName = path.basename(file, '.json');
                            this.translations[moduleName] = this.deepMerge(this.translations[moduleName] || {}, fileTranslations);
                            if (debugEnabled) {
                                console.log(`UI: Loaded ${filePath}, module: ${moduleName}`);
                            }
                        } catch (parseError) {
                            console.error(`UI: Error parsing translation file ${filePath}: ${parseError.message}`);
                        }
                    }
                    this.currentLanguage = language;
                } else {
                    console.warn(`⚠️  Translation file or directory not found for language ${language}: ${monolithTranslationFile} or ${langDir}`);
                    if (language !== 'en') {
                        this.loadLanguage('en'); // Fallback to English
                    }
                }
            }
        } catch (error) {
           console.error(`Error loading translation file for language ${language}: ${error.message}`);
            if (language !== 'en') {
                this.loadLanguage('en'); // Fallback to English
            }
        }
    }

    /**
     * Flatten nested translation objects into a single-level object
     * @param {object} translations - Nested translation object
     * @param {string} prefix - Prefix for nested keys
     * @returns {object} Flattened translation object
     */
    flattenTranslations(translations, prefix = '') {
        const flattened = {};
        
        for (const key in translations) {
            if (translations.hasOwnProperty(key)) {
                const newKey = prefix ? `${prefix}.${key}` : key;
                
                if (typeof translations[key] === 'object' && translations[key] !== null && !Array.isArray(translations[key])) {
                    // Recursively flatten nested objects
                    Object.assign(flattened, this.flattenTranslations(translations[key], newKey));
                } else {
                    // Add leaf values directly
                    flattened[newKey] = translations[key];
                }
            }
        }
        
        return flattened;
    }

    /**
     * Deep merge function for objects
     * @param {object} target
     * @param {object} source
     * @returns {object}
     */
    deepMerge(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key]) && typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) {
                    target[key] = this.deepMerge(target[key] || {}, source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        return target;
    }

    /**
     * Get current language from settings manager
     * @returns {string} Current language code
     */
    getCurrentLanguageFromSettings() {
        const settings = configManager.getConfig();
        return settings.language || settings.uiLanguage || 'en';
    }

    /**
     * Save language preference to settings manager
     * @param {string} language - Language code to save
     */
    saveLanguagePreference(language) {
        try {
            configManager.setConfig('language', language);
        } catch (error) {
           console.error(`Error saving language preference: ${error.message}`);
        }
    }

    /**
     * Refresh language from settings manager
     */
    refreshLanguageFromSettings() {
        const configuredLanguage = this.getCurrentLanguageFromSettings();
        if (configuredLanguage && this.availableLanguages.includes(configuredLanguage)) {
            if (configuredLanguage !== this.currentLanguage) {
                this.loadLanguage(configuredLanguage);
                // Update current language reference
                this.currentLanguage = configuredLanguage;
                // Force reload translations in i18n-helper
                const { loadTranslations } = require('../utils/i18n-helper');
                loadTranslations(configuredLanguage, path.resolve(__dirname, '..', 'ui-locales'));
            }
        }
    }

    /**
     * Run language selector on first run or when forced
     * @returns {Promise<string>} Selected language code
     */
    async initializeLanguage() {
        const currentLanguage = this.getCurrentLanguageFromSettings();
        if (!currentLanguage || currentLanguage === 'en') {
            const selectedLang = await this.selectLanguage();
            this.saveLanguagePreference(selectedLang);
            this.changeLanguage(selectedLang);
            return selectedLang;
        } else {
            this.changeLanguage(currentLanguage);
            return currentLanguage;
        }
    }

    /**
     * Get translated text by key path
     * @param {string} keyPath - Dot-separated key path (e.g., 'menu.title')
     * @param {object} replacements - Object with replacement values
     * @returns {string|array|object} Translated text or data
     */
    t(keyPath, replacements = {}) {
        let value = this.translations[keyPath];

        if (value === undefined) {
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
                
                // Use the same flattening approach for consistency
                const flattenedEnglish = this.flattenTranslations(englishTranslations);
                
                if (keyPath in flattenedEnglish && typeof flattenedEnglish[keyPath] === 'string') {
                    let result = flattenedEnglish[keyPath];
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

        // Hardcoded texts that are not part of the i18n system but need to be displayed
        this.hardcodedTexts = {
            autoDetectedI18nDirectory: this.t('ui.autoDetectedI18nDirectory'),
            executingCommand: this.t('ui.executingCommand'),
            unknownCommand: this.t('ui.unknownCommand'),
            errorExecutingCommand: this.t('ui.errorExecutingCommand')
        
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
           console.error(this.t('ui.noActiveReadlineInterface'));
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
               console.log(this.t('language.languageOption', { index: index + 1, displayName, current }));
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
     * Refresh language from current settings
     * Call this after settings changes to update UI language
     */
    refreshLanguageFromSettings() {
        const settings = configManager.getConfig();
        const configuredLanguage = settings.language;
        
        if (configuredLanguage && this.availableLanguages.includes(configuredLanguage)) {
            if (configuredLanguage !== this.currentLanguage) {
                this.loadLanguage(configuredLanguage);
               console.log(this.t('ui.uiLanguageUpdated', { language: this.getLanguageDisplayName(configuredLanguage) }));
            }
        }
    }
}

// Export the class, not a singleton instance
module.exports = UIi18n;