#!/usr/bin/env node

/**
 * I18NTK VALIDATE COMMAND
 *
 * Handles translation validation logic.
 * Contains embedded business logic from I18nValidator.
 */

const fs = require('fs');
const path = require('path');
const { loadTranslations, t } = require('../../../utils/i18n-helper');
const configManager = require('../../../utils/config-manager');
const SecurityUtils = require('../../../utils/security');
const AdminCLI = require('../../../utils/admin-cli');
const watchLocales = require('../../../utils/watch-locales');
const { getGlobalReadline, closeGlobalReadline } = require('../../../utils/cli');
const { getUnifiedConfig, parseCommonArgs, displayHelp, validateSourceDir, displayPaths } = require('../../../utils/config-helper');
const I18nInitializer = require('../../i18ntk-init');
const JsonOutput = require('../../../utils/json-output');
const ExitCodes = require('../../../utils/exit-codes');
const SetupEnforcer = require('../../../utils/setup-enforcer');

// Ensure setup is complete before running
(async () => {
    try {
        await SetupEnforcer.checkSetupCompleteAsync();
    } catch (error) {
        console.error('Setup check failed:', error.message);
        process.exit(1);
    }
})();

loadTranslations('en', path.resolve(__dirname, '../../../resources', 'i18n', 'ui-locales'));

class ValidateCommand {
    constructor(config = {}, ui = null) {
        this.config = config;
        this.ui = ui;
        this.prompt = null;
        this.isNonInteractiveMode = false;
        this.safeClose = null;

        // Initialize validation properties
        this.errors = [];
        this.warnings = [];
        this.rl = null;
        this.sourceDir = null;
        this.i18nDir = null;
        this.sourceLanguageDir = null;
    }

    /**
     * Set runtime dependencies for interactive operations
     */
    setRuntimeDependencies(prompt, isNonInteractiveMode, safeClose) {
        this.prompt = prompt;
        this.isNonInteractiveMode = isNonInteractiveMode;
        this.safeClose = safeClose;
    }

    /**
     * Initialize the validator with configuration
     */
    async initialize() {
        try {
            // Initialize i18n with UI language first
            const args = this.parseArgs();
            if (args.help) {
                displayHelp('i18ntk-validate', {
                    'setup-admin': 'Configure admin PIN protection',
                    'disable-admin': 'Disable admin PIN protection',
                    'admin-status': 'Check admin PIN status'
                });
                process.exit(0);
            }

            const baseConfig = await getUnifiedConfig('validate', args);
            this.config = { ...baseConfig, ...(this.config || {}) };

            const uiLanguage = (this.config && this.config.uiLanguage) || 'en';
            loadTranslations(uiLanguage, path.resolve(__dirname, '../../../resources', 'i18n', 'ui-locales'));

            SecurityUtils.logSecurityEvent(
                'I18n validator initializing',
                'info',
                { message: 'Initializing I18n validator' }
            );

            // Use the i18n directory for language files
            this.sourceDir = this.config.i18nDir || this.config.sourceDir;
            this.i18nDir = this.config.i18nDir || this.config.sourceDir;
            this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);

            try {
                validateSourceDir(this.sourceDir, 'i18ntk-validate');
            } catch (err) {
                console.log(t('init.requiredTitle'));
                console.log(t('init.requiredBody'));
                const answer = await this.prompt(t('init.promptRunNow'));
                if (answer.trim().toLowerCase() === 'y') {
                    const initializer = new I18nInitializer(this.config);
                    await initializer.run({ fromMenu: true });
                } else {
                    console.warn(t('config.dirFallbackWarning', { dir: this.sourceDir, fallback: this.sourceLanguageDir }) ||
                        `Warning: Directory ${this.sourceDir} not found. Using ${this.sourceLanguageDir}.`);
                    if (!SecurityUtils.safeExistsSync(this.sourceLanguageDir)) {
                        fs.mkdirSync(this.sourceLanguageDir, { recursive: true });
                    }
                }
            }

            displayPaths({ sourceDir: this.sourceDir, i18nDir: this.i18nDir, outputDir: this.config.outputDir });

            SecurityUtils.logSecurityEvent(
                'I18n validator initialized successfully',
                'info',
                { message: 'I18n validator initialized successfully' }
            );
        } catch (error) {
            SecurityUtils.logSecurityEvent(
                'I18n validator initialization error',
                'error',
                { message: `Validator initialization error: ${error.message}` }
            );
            throw error;
        }
    }

    initReadline() {
        return getGlobalReadline();
    }

    prompt(question) {
        return new Promise(resolve => {
            const rl = getGlobalReadline();
            rl.question(question, answer => {
                resolve(answer);
            });
        });
    }

    closeReadline() {
        closeGlobalReadline();
    }

    // Parse command line arguments
    parseArgs() {
        try {
            const baseArgs = parseCommonArgs(process.argv.slice(2));

            // Handle shorthand language flags
            const args = process.argv.slice(2);
            args.forEach(arg => {
                const sanitizedArg = SecurityUtils.sanitizeInput(arg);
                if (sanitizedArg.startsWith('--') && !sanitizedArg.includes('=')) {
                    const key = sanitizedArg.substring(2);
                    if (['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'].includes(key)) {
                        baseArgs.uiLanguage = key;
                    }
                }
            });

            return baseArgs;
        } catch (error) {
            throw error;
        }
    }

    // Add error
    addError(message, details = {}) {
        this.errors.push({ message, details, type: 'error' });
    }

    // Add warning
    addWarning(message, details = {}) {
        this.warnings.push({ message, details, type: 'warning' });
    }

    // Get all available languages
    getAvailableLanguages() {
        try {
            if (!SecurityUtils.safeExistsSync(this.sourceDir)) {
                throw new Error(`Source directory not found: ${this.sourceDir}`);
            }

            const languages = fs.readdirSync(this.sourceDir)
                .filter(item => {
                    const itemPath = path.join(this.sourceDir, item);
                    return fs.statSync(itemPath).isDirectory() && item !== this.config.sourceLanguage;
                });

            return languages;
        } catch (error) {
            throw error;
        }
    }

    // Get all JSON files from a language directory
    getLanguageFiles(language) {
        try {
            const sanitizedLanguage = SecurityUtils.sanitizeInput(language);
            const languageDir = path.join(this.sourceDir, sanitizedLanguage);

            if (!SecurityUtils.safeExistsSync(languageDir)) {
                return [];
            }

            const files = fs.readdirSync(languageDir)
                .filter(file => {
                    return file.endsWith('.json') &&
                          !this.config.excludeFiles.includes(file);
                });

            return files;
        } catch (error) {
            throw error;
        }
    }

    // Get all keys recursively from an object
    getAllKeys(obj, prefix = '') {
        const keys = new Set();

        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            keys.add(fullKey);

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                const nestedKeys = this.getAllKeys(value, fullKey);
                nestedKeys.forEach(k => keys.add(k));
            }
        }

        return keys;
    }

    // Get value by key path
    getValueByPath(obj, keyPath) {
        // Ensure keyPath is a string
        const keyPathStr = String(keyPath || '');
        const keys = keyPathStr.split('.');
        let current = obj;

        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return undefined;
            }
        }

        return current;
    }

    // Validate JSON file syntax
    async validateJsonSyntax(filePath) {
        try {
            const content = SecurityUtils.safeReadFileSync(filePath, path.dirname(filePath), 'utf8');
            const parsed = SecurityUtils.safeParseJSON(content);

            SecurityUtils.logSecurityEvent(
                t('validate.jsonValidated'),
                'info',
                { message: `JSON syntax validated: ${filePath}` }
            );
            return { valid: true, data: parsed };
        } catch (error) {
            SecurityUtils.logSecurityEvent(
                t('validate.jsonValidationError'),
                'error',
                { message: `JSON validation error: ${error.message}` }
            );
            return {
                valid: false,
                error: error.message,
                line: error.message.match(/line (\d+)/)?.[1] || 'unknown'
            };
        }
    }

    // Validate structural consistency
    validateStructure(sourceObj, targetObj, language, fileName) {
        const sourceKeys = this.getAllKeys(sourceObj);
        const targetKeys = this.getAllKeys(targetObj);

        const missingKeys = [...sourceKeys].filter(key => !targetKeys.has(key));
        const extraKeys = [...targetKeys].filter(key => !sourceKeys.has(key));

        // Report missing keys as errors
        missingKeys.forEach(key => {
            this.addError(
                `Missing key in ${language}/${fileName}`,
                { key, language, fileName }
            );
        });

        // Report extra keys as warnings
        extraKeys.forEach(key => {
            this.addWarning(
                `Extra key in ${language}/${fileName}`,
                { key, language, fileName }
            );
        });

        return {
            isConsistent: missingKeys.length === 0 && extraKeys.length === 0,
            missingKeys,
            extraKeys,
            sourceKeyCount: sourceKeys.size,
            targetKeyCount: targetKeys.size
        };
    }

    extractPlaceholders(value, patterns = []) {
        const placeholders = new Set();
        if (value === null || value === undefined) return placeholders;
        const valueStr = String(value);
        patterns.forEach(p => {
            try {
                const reg = new RegExp(p, 'g');
                let m;
                while ((m = reg.exec(valueStr)) !== null) {
                    placeholders.add(m[0]);
                }
            } catch (e) {
                // skip invalid patterns
            }
        });
        return placeholders;
    }

    getGenericPlaceholders(value) {
        if (value === null || value === undefined) return new Set();
        const valueStr = String(value);
        return new Set(valueStr.match(/%s|\{\d+\}|\{\{[^}]+\}\}|\{[^}]+\}/g) || []);
    }

    checkPlaceholders(source, target, language, fileName, prefix = '') {
        if (typeof source === 'string' && typeof target === 'string') {
            const srcPatterns = (this.config.placeholderStyles && this.config.placeholderStyles[this.config.sourceLanguage]) || [];
            const tgtPatterns = (this.config.placeholderStyles && this.config.placeholderStyles[language]) || [];
            const srcPH = new Set([
                ...this.extractPlaceholders(source, srcPatterns),
                ...this.getGenericPlaceholders(source)
            ]);
            const tgtPH = new Set([
                ...this.extractPlaceholders(target, tgtPatterns),
                ...this.getGenericPlaceholders(target)
            ]);

            if (tgtPatterns.length) {
                const allowed = this.extractPlaceholders(target, tgtPatterns);
                this.getGenericPlaceholders(target).forEach(ph => {
                    if (!allowed.has(ph)) {
                        this.addError(`Disallowed placeholder style in ${language}/${fileName}`, { key: prefix, placeholder: ph });
                    }
                });
            }

            if (srcPH.size !== tgtPH.size || [...srcPH].some(p => !tgtPH.has(p))) {
                this.addError(`Placeholder style mismatch in ${language}/${fileName}`, { key: prefix });
            }
        } else if (source && typeof source === 'object' && !Array.isArray(source)) {
            for (const key of Object.keys(source)) {
                if (target && Object.prototype.hasOwnProperty.call(target, key)) {
                    this.checkPlaceholders(
                        source[key],
                        target[key],
                        language,
                        fileName,
                        prefix ? `${prefix}.${key}` : key
                    );
                }
            }
        }
    }

    detectRiskyKeys(obj, language, fileName, prefix = '') {
        for (const [key, value] of Object.entries(obj || {})) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'string') {
                if (/https?:\/\//.test(value) || /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(value) || /(api[_-]?key|secret|token)/i.test(value)) {
                    const reporter = this.config.strictMode ? this.addError.bind(this) : this.addWarning.bind(this);
                    reporter(`Risky content in ${language}/${fileName}`, { key: fullKey, value });
                }
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                this.detectRiskyKeys(value, language, fileName, fullKey);
            }
        }
    }

    // Validate translation completeness
    validateTranslation(obj, language, fileName, prefix = '') {
        let totalKeys = 0;
        let translatedKeys = 0;
        let issues = [];

        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                const nested = this.validateTranslation(value, language, fileName, fullKey);
                totalKeys += nested.totalKeys;
                translatedKeys += nested.translatedKeys;
                issues.push(...nested.issues);
            } else if (typeof value === 'string') {
                totalKeys++;

                const markers = this.config.notTranslatedMarkers || [this.config.notTranslatedMarker];
                if (markers.some(m => value === m)) {
                    issues.push({
                        type: 'not_translated',
                        key: fullKey,
                        value,
                        language,
                        fileName
                    });
                } else if (value === '') {
                    issues.push({
                        type: 'empty_value',
                        key: fullKey,
                        value,
                        language,
                        fileName
                    });
                } else if (markers.some(m => value.includes(m))) {
                    issues.push({
                        type: 'partial_translation',
                        key: fullKey,
                        value,
                        language,
                        fileName
                    });
                } else {
                    translatedKeys++;
                }
            }
        }

        return { totalKeys, translatedKeys, issues };
    }

    // Validate a single language
    async validateLanguage(language) {
        try {
            SecurityUtils.logSecurityEvent(
                t('validate.languageValidation'),
                'info',
                { message: `Validating language: ${language}` }
            );

            const sanitizedLanguage = SecurityUtils.sanitizeInput(language);
            const languageDir = path.join(this.sourceDir, sanitizedLanguage);
            const sourceFiles = this.getLanguageFiles(this.config.sourceLanguage);
            const targetFiles = this.getLanguageFiles(sanitizedLanguage);

            const validation = {
                language: sanitizedLanguage,
                files: {},
                summary: {
                    totalFiles: sourceFiles.length,
                    validFiles: 0,
                    totalKeys: 0,
                    translatedKeys: 0,
                    missingFiles: [],
                    syntaxErrors: [],
                    structuralIssues: [],
                    translationIssues: []
                }
            };

            // Check for missing language directory
            if (!SecurityUtils.safeExistsSync(languageDir)) {
                this.addError(
                    `Language directory missing: ${sanitizedLanguage}`,
                    { language: sanitizedLanguage, expectedPath: languageDir }
                );
                return validation;
            }

            // Validate each file
            for (const fileName of sourceFiles) {
                const sourceFilePath = path.join(this.sourceLanguageDir, fileName);
                const targetFilePath = path.join(languageDir, fileName);

                // Check if source file exists
                if (!SecurityUtils.safeExistsSync(sourceFilePath)) {
                    this.addWarning(
                        `Source file missing: ${this.config.sourceLanguage}/${fileName}`,
                        { fileName, language: this.config.sourceLanguage }
                    );
                    continue;
                }

                // Check if target file exists
                if (!SecurityUtils.safeExistsSync(targetFilePath)) {
                    this.addError(
                        `Translation file missing: ${language}/${fileName}`,
                        { fileName, language, expectedPath: targetFilePath }
                    );
                    validation.summary.missingFiles.push(fileName);
                    continue;
                }

                // Validate JSON syntax for both files
                const sourceValidation = await this.validateJsonSyntax(sourceFilePath);
                const targetValidation = await this.validateJsonSyntax(targetFilePath);

                if (!sourceValidation.valid) {
                    this.addError(
                        `Invalid JSON syntax in source file: ${this.config.sourceLanguage}/${fileName}`,
                        { fileName, language: this.config.sourceLanguage, error: sourceValidation.error }
                    );
                    validation.summary.syntaxErrors.push({ fileName, type: 'source', error: sourceValidation.error });
                    continue;
                }

                if (!targetValidation.valid) {
                    this.addError(
                        `Invalid JSON syntax in target file: ${sanitizedLanguage}/${fileName}`,
                        { fileName, language: sanitizedLanguage, error: targetValidation.error }
                    );
                    validation.summary.syntaxErrors.push({ fileName, type: 'target', error: targetValidation.error });
                    continue;
                }

                // Use parsed data from validation
                const sourceContent = sourceValidation.data;
                const targetContent = targetValidation.data;
                // Validate structure
                const structural = this.validateStructure(sourceContent, targetContent, language, fileName);

                // Validate translations
                const translations = this.validateTranslation(targetContent, language, fileName);
                this.checkPlaceholders(sourceContent, targetContent, language, fileName);
                this.detectRiskyKeys(targetContent, language, fileName);

                // Store file validation results
                validation.files[fileName] = {
                    status: 'validated',
                    structural,
                    translations,
                    sourceFilePath,
                    targetFilePath
                };

                // Update summary
                validation.summary.validFiles++;
                validation.summary.totalKeys += translations.totalKeys;
                validation.summary.translatedKeys += translations.translatedKeys;

                if (!structural.isConsistent) {
                    validation.summary.structuralIssues.push({
                        fileName,
                        missingKeys: structural.missingKeys.length,
                        extraKeys: structural.extraKeys.length
                    });
                }

                validation.summary.translationIssues.push(...translations.issues);
            }

            // Calculate completion percentage
            validation.summary.percentage = validation.summary.totalKeys > 0
                ? Math.round((validation.summary.translatedKeys / validation.summary.totalKeys) * 100)
                : 0;

            return validation;
        } catch (error) {
            SecurityUtils.logSecurityEvent(t('validate.languageValidationError'), 'error', {
                language: language,
                error: error.message,
                timestamp: new Date().toISOString()
            });

            this.addError(
                `Language validation failed for ${language}: ${error.message}`,
                { language, error: error.message }
            );

            return {
                language: language,
                files: {},
                summary: {
                    totalFiles: 0,
                    validFiles: 0,
                    totalKeys: 0,
                    translatedKeys: 0,
                    missingFiles: [],
                    syntaxErrors: [],
                    structuralIssues: [],
                    translationIssues: [],
                    percentage: 0
                }
            };
        }
    }

    // Check for unused translation keys (basic implementation)
    checkUnusedKeys(language) {
        // Note: For comprehensive unused key detection, use the dedicated
        // usage analysis script: i18ntk-usage.js
        const warnings = [];

        // This method provides basic validation only
        // For detailed usage analysis, run: node i18ntk-usage.js

        return warnings;
    }

    // Show help message
    showHelp() {
        console.log(t('validate.help_message'));
    }

    // Main validation process
    async validate() {
        try {
            const args = this.parseArgs();
            const jsonOutput = new JsonOutput('validate');

            if (!args.json) {
                console.log(t('validate.title'));
                console.log(t('validate.message'));

                // Delete old validation report if it exists
                const reportPath = path.join(process.cwd(), 'validation-report.txt');
                SecurityUtils.validatePath(reportPath);

                if (SecurityUtils.safeExistsSync(reportPath)) {
                    fs.unlinkSync(reportPath);
                    console.log(t('validate.deletedOldReport'));

                    SecurityUtils.logSecurityEvent(t('validate.fileDeleted'), 'info', {
                        path: reportPath,
                        timestamp: new Date().toISOString()
                    });
                }
            }

            // Handle UI language change
            if (args.uiLanguage) {
                loadTranslations(args.uiLanguage, path.resolve(__dirname, '../../../ui-locales'));}

            if (args.sourceDir) {
                this.config.sourceDir = args.sourceDir;
                this.sourceDir = path.resolve(this.config.sourceDir);
                this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
            }
            if (args.strictMode) {
                this.config.strictMode = true;
            }

            if (!args.json) {
                console.log(t('validate.sourceDirectory', { dir: this.sourceDir }));
                console.log(t('validate.sourceLanguage', { sourceLanguage: this.config.sourceLanguage }));
                console.log(t('validate.strictMode', { mode: this.config.strictMode ? 'ON' : 'OFF' }));
            }

            // Validate source language directory exists
            SecurityUtils.validatePath(this.sourceLanguageDir);

            if (!SecurityUtils.safeExistsSync(this.sourceLanguageDir)) {
                const error = t('validate.sourceLanguageDirectoryNotFound', { sourceDir: this.sourceLanguageDir }) || 'Source language directory not found';
                this.addError(error, { sourceLanguage: this.config.sourceLanguage });

                SecurityUtils.logSecurityEvent(t('validate.validationError'), 'error', {
                    error: 'Source language directory not found',
                    path: this.sourceLanguageDir,
                    timestamp: new Date().toISOString()
                });

                if (args.json) {
                    jsonOutput.setStatus('error', error);
                    console.log(JSON.stringify(jsonOutput.getOutput(), null, args.indent || 2));
                    return { success: false, error };
                }
                throw new Error(error);
            }

            // Get available languages including source language
            const availableLanguages = this.getAvailableLanguages();

            // Filter languages if specified
            const targetLanguages = args.language
                ? [args.language].filter(lang => availableLanguages.includes(lang))
                : availableLanguages;

            if (args.language && targetLanguages.length === 0) {
                const error = `Specified language '${args.language}' not found`;
                this.addError(error, { requestedLanguage: args.language, availableLanguages });
                if (args.json) {
                    jsonOutput.setStatus('error', error);
                    console.log(JSON.stringify(jsonOutput.getOutput(), null, args.indent || 2));
                    return { success: false, error };
                }
                throw new Error(error);
            }

            if (!args.language && targetLanguages.length === 0) {
                const message = t('validate.noTargetLanguages') || 'No target languages configured; skipping target validation.';
                if (args.json) {
                    jsonOutput.setStatus('ok', message);
                    console.log(JSON.stringify(jsonOutput.getOutput(), null, args.indent || 2));
                    return { success: true, message };
                }
                console.log(message);
                return { success: true, message };
            }

            if (!args.json) {
                console.log(t('validate.validatingLanguages', { langs: targetLanguages.join(', ') }));
                console.log('');
            }

            const results = {};
            let totalErrors = 0;
            let totalWarnings = 0;

            // Validate each language
            for (const language of targetLanguages) {
                if (!args.json) {
                    console.log(t('validate.validatingLanguage', { lang: language }));
                }

                const validation = await this.validateLanguage(language);
                results[language] = validation;

                if (!args.json) {
                    // Display brief progress indicator
                    const { summary } = validation;
                    const status = summary.syntaxErrors.length > 0 ? '❌' :
                                 summary.missingFiles.length > 0 ? '⚠️' : '✅';
                    console.log(`   ${status} ${language}: ${summary.percentage}% (${summary.translatedKeys}/${summary.totalKeys} keys)`);
                }

                // Aggregate issues for JSON output
                totalErrors += validation.errors?.length || 0;
                totalWarnings += validation.warnings?.length || 0;
            }

            // Prepare JSON output
            if (args.json) {
                const hasErrors = this.errors.length > 0;
                const hasWarnings = this.warnings.length > 0;

                jsonOutput.setStatus(
                    hasErrors ? 'error' : hasWarnings ? 'warn' : 'ok',
                    hasErrors ? 'Validation failed' : hasWarnings ? 'Validation completed with warnings' : 'Validation passed'
                );

                jsonOutput.addStats({
                    errors: this.errors.length,
                    warnings: this.warnings.length,
                    languages: targetLanguages.length,
                    files: Object.values(results).reduce((sum, lang) => sum + (lang.files?.length || 0), 0)
                });

                // Add issues from errors and warnings
                [...this.errors, ...this.warnings].forEach(issue => {
                    jsonOutput.addIssue({
                        type: issue.message.includes('not found') ? 'missing' :
                              issue.message.includes('syntax') ? 'syntax' : 'warning',
                        message: issue.message,
                        details: issue.details
                    });
                });

                // Add per-language results
                jsonOutput.addData({ results });

                console.log(JSON.stringify(jsonOutput.getOutput(), null, args.indent || 2));

                return {
                    success: !hasErrors,
                    errors: this.errors.length,
                    warnings: this.warnings.length,
                    results
                };
            }

            console.log('');
            console.log(t('validate.separator'));

            // Overall summary
            const hasErrors = this.errors.length > 0;
            const hasWarnings = this.warnings.length > 0;

            console.log(t('validate.validationSummary'));
            console.log(t('validate.totalErrors', { count: this.errors.length }));
            console.log(t('validate.totalWarnings', { count: this.warnings.length }));

            // Show errors
            if (hasErrors) {
                console.log('');
                console.log(t('validate.separator'));
                console.log(t('validate.errorsSection'));
                console.log('');
                this.errors.forEach((error, index) => {
                    console.log(`  ❌ ${error.message}`);
                    if (error.details && Object.keys(error.details).length > 0) {
                        console.log(`     📄 Details: ${JSON.stringify(error.details, null, 2)}`);
                    }
                    console.log('');
                });
            }

            // Show warnings
            if (hasWarnings) {
                console.log('');
                console.log(t('validate.separator'));
                console.log(t('validate.warningsSection'));
                console.log('');
                this.warnings.forEach((warning, index) => {
                    console.log(`  ⚠️  ${warning.message}`);
                    if (warning.details && Object.keys(warning.details).length > 0) {
                        console.log(`     📄 Details: ${JSON.stringify(warning.details, null, 2)}`);
                    }
                    console.log('');
                });
            }

            // Recommendations
            console.log('');
            console.log(t('validate.separator'));
            console.log(t('validate.recommendationsSection'));

            if (hasErrors) {
                console.log('');
                console.log(t('validate.resolveMissingFilesAndSyntaxErrors'));
                console.log(t('validate.fixStructuralInconsistencies'));
                console.log(t('validate.completeMissingTranslations'));
                console.log(t('validate.rerunValidation'));
            } else if (hasWarnings) {
                console.log('');
                console.log(t('validate.addressWarnings'));
                console.log(t('validate.reviewWarnings'));
                console.log(t('validate.considerRunningWithStrict'));
            } else {
                console.log('');
                console.log(t('validate.allValidationsPassed'));
                console.log(t('validate.considerRunningUsageAnalysis'));
            }

            // Exit with appropriate code
            const success = !hasErrors && (!hasWarnings || !this.config.strictMode);

            return {
                success,
                errors: this.errors.length,
                warnings: this.warnings.length,
                results
            };

        } catch (error) {
            console.error(t("validate.validation_failed", { error: error.message }));
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Run method for compatibility with manager
     */
    async run(options = {}) {
        const { fromMenu = false } = options;

        const args = this.parseArgs();

        // Ensure config is always initialized
        if (!this.config) {
            this.config = {};
        }

        // Initialize configuration properly when called from menu
        if (fromMenu && !this.sourceDir) {
            const baseConfig = await getUnifiedConfig('validate', args);
            this.config = { ...baseConfig, ...this.config };

            const uiLanguage = (this.config && this.config.uiLanguage) || 'en';
            loadTranslations(uiLanguage, path.resolve(__dirname, '../../../resources', 'i18n', 'ui-locales'));this.sourceDir = this.config.sourceDir;
            this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
        } else {
            await this.initialize();
        }

        // Skip admin authentication when called from menu
        if (!fromMenu) {
            // Check admin authentication for sensitive operations (only when called directly and not in no-prompt mode)
            const AdminAuth = require('../../../utils/admin-auth');
            const adminAuth = new AdminAuth();
            await adminAuth.initialize();

            const isCalledDirectly = require.main === module;
            const isRequired = await adminAuth.isAuthRequired();
            if (isRequired && isCalledDirectly && !args.noPrompt) {
                console.log('\n' + t('adminCli.authRequiredForOperation', { operation: 'validate translations' }));

                const cliHelper = require('../../../utils/cli-helper');
                const pin = await cliHelper.promptPin(t('adminCli.enterPin'));

                const isValid = await adminAuth.verifyPin(pin);
                this.closeReadline();

                if (!isValid) {
                    console.log(t('adminCli.invalidPin'));
                    if (!fromMenu) process.exit(ExitCodes.SECURITY_VIOLATION);
                    return { success: false, error: 'Authentication failed' };
                }

                console.log(t('adminCli.authenticationSuccess'));
            }
        }
        const execute = async () => {

            console.log(t('validate.startingValidationProcess'));
            SecurityUtils.logSecurityEvent(
                t('validate.runStarted'),
                'info',
                { message: 'Starting validation run' }
            );

            const result = await this.validate();

            console.log(t('validate.validationProcessCompletedSuccessfully'));
            SecurityUtils.logSecurityEvent(
                t('validate.runCompleted'),
                'info',
                { message: 'Validation run completed successfully' }
            );
            return result;
        };

        if (args.watch) {
            await execute();
            let running = false;
            watchLocales(this.sourceDir, async () => {
                if (running) return;
                running = true;
                try {
                    await execute();
                } finally {
                    running = false;
                }
            });
            console.log('👀 Watching for translation changes. Press Ctrl+C to exit.');
            return { watching: true };
        }

        return await execute();
    }

    /**
     * Execute the validate command
     */
    async execute(options = {}) {
        try {
            await this.initialize();
            await this.run(options);
            return { success: true, command: 'validate' };
        } catch (error) {
            console.error(`Validate command failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get command metadata
     */
    getMetadata() {
        return {
            name: 'validate',
            description: 'Validate translations for errors and consistency',
            category: 'analysis',
            aliases: [],
            usage: 'validate [options]',
            examples: [
                'validate',
                'validate --source-dir=./src/locales',
                'validate --strict'
            ]
        };
    }
}

module.exports = ValidateCommand;