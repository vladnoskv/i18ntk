#!/usr/bin/env node

/**
 * I18NTK FIXER COMMAND
 *
 * Handles translation fixing operations.
 * Contains embedded business logic for fixing translation issues.
 */

const path = require('path');
const fs = require('fs');
const SecurityUtils = require('../../../utils/security');
const cliHelper = require('../../../utils/cli-helper');
const { loadTranslations, t } = require('../../../utils/i18n-helper');
const { getUnifiedConfig, parseCommonArgs, displayHelp } = require('../../../utils/config-helper');
const JsonOutput = require('../../../utils/json-output');
const SetupEnforcer = require('../../../utils/setup-enforcer');

class FixerCommand {
    constructor(config = {}, ui = null) {
        this.config = config;
        this.ui = ui;
        this.prompt = null;
        this.isNonInteractiveMode = false;
        this.safeClose = null;

        // Initialize fixer properties
        this.sourceDir = null;
        this.outputDir = null;
        this.backupDir = null;
        this.dryRun = false;
        this.force = false;
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
     * Initialize the fixer with configuration
     */
    async initialize() {
        try {
            const args = this.parseArgs();
            if (args.help) {
                displayHelp('i18ntk-fixer', {
                    'source-dir': 'Source directory to scan (default: ./locales)',
                    'languages': 'Comma separated list of languages to fix',
                    'markers': 'Comma separated markers to treat as untranslated',
                    'no-backup': 'Skip automatic backup creation',
                    'dry-run': 'Show what would be fixed without making changes',
                    'force': 'Force fixes without confirmation',
                    'output-dir': 'Output directory for fixed files'
                });
                process.exit(0);
            }

            const baseConfig = await getUnifiedConfig('fixer', args);
            this.config = { ...baseConfig, ...(this.config || {}) };

            const uiLanguage = (this.config && this.config.uiLanguage) || 'en';
            loadTranslations(uiLanguage, path.resolve(__dirname, '../../../resources', 'i18n', 'ui-locales'));

            this.sourceDir = this.config.sourceDir;
            this.outputDir = this.config.outputDir;
            this.backupDir = path.join(this.sourceDir, 'backup');

            // Validate source directory exists
            const { validateSourceDir } = require('../../../utils/config-helper');
            validateSourceDir(this.sourceDir, 'i18ntk-fixer');

        } catch (error) {
            console.error(`Fatal fixer error: ${error.message}`);
            throw error;
        }
    }

    parseArgs() {
        try {
            const args = process.argv.slice(2);
            const parsed = parseCommonArgs(args);

            args.forEach(arg => {
                if (arg.startsWith('--')) {
                    const [key, value] = arg.substring(2).split('=');
                    const sanitizedKey = SecurityUtils.sanitizeInput(key);
                    const sanitizedValue = value ? SecurityUtils.sanitizeInput(value) : true;

                    if (sanitizedKey === 'source-dir') {
                        parsed.sourceDir = sanitizedValue;
                    } else if (sanitizedKey === 'languages') {
                        parsed.languages = sanitizedValue.split(',').map(l => l.trim());
                    } else if (sanitizedKey === 'markers') {
                        parsed.markers = sanitizedValue.split(',').map(m => m.trim());
                    } else if (sanitizedKey === 'no-backup') {
                        parsed.noBackup = true;
                    } else if (sanitizedKey === 'dry-run') {
                        parsed.dryRun = true;
                    } else if (sanitizedKey === 'force') {
                        parsed.force = true;
                    } else if (sanitizedKey === 'output-dir') {
                        parsed.outputDir = sanitizedValue;
                    }
                }
            });

            return parsed;
        } catch (error) {
            throw error;
        }
    }

    // Get all available languages
    getAvailableLanguages() {
        try {
            const items = SecurityUtils.safeReaddirSync(this.sourceDir, process.cwd(), { withFileTypes: true });
            if (!items) {
                console.error('Error reading source directory: Unable to access directory');
                return [];
            }

            const languages = [];

            // Check for directory-based structure
            const directories = items
                .filter(item => item.isDirectory())
                .map(item => item.name)
                .filter(name => name !== 'node_modules' && !name.startsWith('.') && name !== this.config.sourceLanguage);

            // Check for monolith files (language.json files)
            const files = items
                .filter(item => item.isFile() && item.name.endsWith('.json'))
                .map(item => item.name);

            // Add directories as languages
            languages.push(...directories);

            // Add monolith files as languages (without .json extension)
            const monolithLanguages = files
                .map(file => file.replace('.json', ''))
                .filter(lang => !languages.includes(lang) && lang !== this.config.sourceLanguage);
            languages.push(...monolithLanguages);

            return [...new Set(languages)].sort();
        } catch (error) {
            console.error('Error reading source directory:', error.message);
            return [];
        }
    }

    // Get all JSON files from a language directory
    getLanguageFiles(language) {
        if (!this.sourceDir) {
            console.warn('Source directory not set');
            return [];
        }

        const languageDir = path.resolve(this.sourceDir, language);
        const languageFile = path.resolve(this.sourceDir, `${language}.json`);
        const files = [];

        // Handle monolith file structure
        const languageFileStat = SecurityUtils.safeStatSync(languageFile, this.sourceDir);
        if (languageFileStat && languageFileStat.isFile()) {
            return [path.basename(languageFile)];
        }

        // Handle directory-based structure
        const languageDirStat = SecurityUtils.safeStatSync(languageDir, this.sourceDir);
        if (languageDirStat && languageDirStat.isDirectory()) {
            try {
                // Ensure the path is within the source directory for security
                const validatedPath = SecurityUtils.validatePath(languageDir, this.sourceDir);
                if (!validatedPath) {
                    console.warn(`Language directory not found or invalid: ${languageDir}`);
                    return [];
                }

                const findJsonFiles = (dir) => {
                    const results = [];
                    const items = SecurityUtils.safeReaddirSync(dir, this.sourceDir, { withFileTypes: true });

                    if (!items) return results;

                    for (const item of items) {
                        const fullPath = path.join(dir, item.name);

                        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
                            // Recursively search subdirectories
                            results.push(...findJsonFiles(fullPath));
                        } else if (item.isFile() && item.name.endsWith('.json')) {
                            // Check exclusion patterns
                            const relativePath = path.relative(this.sourceDir, fullPath);
                            const shouldExclude = (this.config.excludeFiles || []).some(pattern => {
                                if (typeof pattern === 'string') {
                                    return relativePath === pattern || relativePath.endsWith(path.sep + pattern);
                                }
                                if (pattern instanceof RegExp) {
                                    return pattern.test(relativePath);
                                }
                                return false;
                            });

                            if (!shouldExclude && !item.name.startsWith('.')) {
                                results.push(path.relative(languageDir, fullPath));
                            }
                        }
                    }

                    return results;
                };

                return findJsonFiles(validatedPath);
            } catch (error) {
                console.error(`Error reading language directory ${languageDir}:`, error.message);
                return [];
            }
        }

        return files;
    }

    // Get all keys recursively from an object
    getAllKeys(obj, prefix = '') {
        const keys = new Set();

        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
            return keys;
        }

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
        const keys = keyPath.split('.');
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

    // Set value by key path
    setValueByPath(obj, keyPath, value) {
        const keys = keyPath.split('.');
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
    }

    // Create backup of translation files
    async createBackup() {
        if (this.dryRun) return;

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            this.backupDir = path.join(this.sourceDir, `backup-${timestamp}`);

            console.log(t('fixer.creatingBackup', { dir: this.backupDir }));

            // Ensure backup directory exists
            const dirCreated = SecurityUtils.safeMkdirSync(this.backupDir, process.cwd(), { recursive: true });
            if (!dirCreated) {
                console.warn('Failed to create backup directory');
                return;
            }

            // Copy all translation files to backup
            const languages = this.getAvailableLanguages();
            languages.push(this.config.sourceLanguage); // Include source language

            for (const language of languages) {
                const languageFiles = this.getLanguageFiles(language);

                for (const fileName of languageFiles) {
                    const sourcePath = path.join(this.sourceDir, language, fileName);
                    const backupPath = path.join(this.backupDir, language, fileName);

                    // Ensure backup subdirectory exists
                    const backupSubDir = path.dirname(backupPath);
                    SecurityUtils.safeMkdirSync(backupSubDir, process.cwd(), { recursive: true });

                    // Copy file
                    if (SecurityUtils.safeExistsSync(sourcePath, this.sourceDir)) {
                        const content = SecurityUtils.safeReadFileSync(sourcePath, this.sourceDir, 'utf8');
                        SecurityUtils.safeWriteFileSync(backupPath, content, process.cwd(), 'utf8');
                    }
                }
            }

            console.log(t('fixer.backupCreated'));
        } catch (error) {
            console.warn(`Failed to create backup: ${error.message}`);
        }
    }

    // Analyze translation issues for fixing
    analyzeIssues(language, fileName) {
        const issues = [];
        const sourceFiles = this.getLanguageFiles(this.config.sourceLanguage);
        const targetFiles = this.getLanguageFiles(language);

        if (!sourceFiles.includes(fileName) || !targetFiles.includes(fileName)) {
            return issues;
        }

        const sourceFilePath = path.join(this.sourceDir, this.config.sourceLanguage, fileName);
        const targetFilePath = path.join(this.sourceDir, language, fileName);

        try {
            const sourceContent = SecurityUtils.safeReadFileSync(sourceFilePath, this.sourceDir, 'utf8');
            const targetContent = SecurityUtils.safeReadFileSync(targetFilePath, this.sourceDir, 'utf8');

            if (!sourceContent || !targetContent) {
                return issues;
            }

            const sourceObj = SecurityUtils.safeParseJSON(sourceContent);
            const targetObj = SecurityUtils.safeParseJSON(targetContent);

            if (!sourceObj || !targetObj) {
                return issues;
            }

            const sourceKeys = this.getAllKeys(sourceObj);

            for (const key of sourceKeys) {
                const sourceValue = this.getValueByPath(sourceObj, key);
                const targetValue = this.getValueByPath(targetObj, key);

                if (targetValue === undefined) {
                    // Missing key
                    issues.push({
                        type: 'missing_key',
                        key,
                        sourceValue,
                        fix: () => this.setValueByPath(targetObj, key, sourceValue)
                    });
                } else if (targetValue === '') {
                    // Empty value
                    issues.push({
                        type: 'empty_value',
                        key,
                        sourceValue,
                        fix: () => this.setValueByPath(targetObj, key, sourceValue)
                    });
                } else {
                    const markers = this.config.notTranslatedMarkers || [this.config.notTranslatedMarker];
                    if (markers.some(m => targetValue === m)) {
                        // Untranslated marker
                        issues.push({
                            type: 'untranslated_marker',
                            key,
                            sourceValue,
                            fix: () => this.setValueByPath(targetObj, key, sourceValue)
                        });
                    }
                }
            }

            return issues;
        } catch (error) {
            console.warn(`Error analyzing ${language}/${fileName}: ${error.message}`);
            return issues;
        }
    }

    // Fix translation issues for a language
    async fixLanguage(language) {
        const fixes = {
            language,
            files: {},
            totalIssues: 0,
            fixedIssues: 0
        };

        const sourceFiles = this.getLanguageFiles(this.config.sourceLanguage);

        for (const fileName of sourceFiles) {
            const issues = this.analyzeIssues(language, fileName);

            if (issues.length > 0) {
                fixes.files[fileName] = {
                    issues: issues.length,
                    fixed: 0
                };

                fixes.totalIssues += issues.length;

                if (!this.dryRun) {
                    // Apply fixes
                    const targetFilePath = path.join(this.sourceDir, language, fileName);

                    try {
                        const targetContent = SecurityUtils.safeReadFileSync(targetFilePath, this.sourceDir, 'utf8');
                        if (!targetContent) continue;

                        const targetObj = SecurityUtils.safeParseJSON(targetContent);
                        if (!targetObj) continue;

                        for (const issue of issues) {
                            if (typeof issue.fix === 'function') {
                                issue.fix();
                                fixes.files[fileName].fixed++;
                                fixes.fixedIssues++;
                            }
                        }

                        // Write back the fixed content
                        const fixedContent = JSON.stringify(targetObj, null, 2);
                        SecurityUtils.safeWriteFileSync(targetFilePath, fixedContent, process.cwd(), 'utf8');

                    } catch (error) {
                        console.warn(`Error fixing ${language}/${fileName}: ${error.message}`);
                    }
                } else {
                    // In dry run mode, just count potential fixes
                    fixes.files[fileName].fixed = issues.length;
                    fixes.fixedIssues += issues.length;
                }
            }
        }

        return fixes;
    }

    // Main fixing process
    async fix() {
        try {
            const args = this.parseArgs();
            const jsonOutput = new JsonOutput('fixer');

            // Set options from args
            this.dryRun = args.dryRun || false;
            this.force = args.force || false;

            if (!args.json) {
                console.log(t('fixer.starting'));
                console.log(t('fixer.sourceDirectory', { dir: path.resolve(this.sourceDir) }));
                console.log(t('fixer.dryRunMode', { mode: this.dryRun ? 'ON' : 'OFF' }));
            }

            // Create backup unless disabled
            if (!args.noBackup && !this.dryRun) {
                await this.createBackup();
            }

            const languages = this.getAvailableLanguages();

            if (languages.length === 0) {
                const error = t('fixer.noLanguages') || 'No target languages found.';
                if (args.json) {
                    jsonOutput.setStatus('error', error);
                    console.log(JSON.stringify(jsonOutput.data, null, args.indent || 2));
                    return;
                }
                console.log(error);
                return;
            }

            if (!args.json) {
                console.log(t('fixer.foundLanguages', { count: languages.length, languages: languages.join(', ') }));
            }

            const results = {};
            let totalIssues = 0;
            let totalFixed = 0;

            for (const language of languages) {
                if (!args.json) {
                    console.log(t('fixer.fixing', { language }));
                }

                const fixes = await this.fixLanguage(language);
                results[language] = fixes;

                totalIssues += fixes.totalIssues;
                totalFixed += fixes.fixedIssues;

                if (!args.json) {
                    console.log(t('fixer.languageFixed', {
                        language,
                        issues: fixes.totalIssues,
                        fixed: fixes.fixedIssues
                    }));
                }
            }

            // Prepare JSON output
            if (args.json) {
                jsonOutput.setStatus(totalFixed > 0 ? 'ok' : 'info', 'Fixer completed');
                jsonOutput.addStats({
                    issues: totalIssues,
                    fixed: totalFixed,
                    languages: languages.length
                });

                console.log(JSON.stringify(jsonOutput.getOutput(), null, args.indent || 2));
                return { success: true, totalIssues, totalFixed, results };
            }

            // Summary
            console.log(t('fixer.summary'));
            console.log('='.repeat(50));
            console.log(t('fixer.totalIssues', { count: totalIssues }));
            console.log(t('fixer.totalFixed', { count: totalFixed }));

            if (this.backupDir && !args.noBackup) {
                console.log(t('fixer.backupLocation', { dir: this.backupDir }));
            }

            console.log(t('fixer.completed'));

            return { success: true, totalIssues, totalFixed, results };

        } catch (error) {
            console.error(t('fixer.error', { error: error.message }));
            throw error;
        }
    }

    // Main run method for compatibility
    async run(options = {}) {
        const fromMenu = options.fromMenu || false;

        try {
            const args = this.parseArgs();

            if (args.help) {
                this.showHelp();
                return;
            }

            // Initialize configuration properly when called from menu
            if (fromMenu && !this.sourceDir) {
                const baseConfig = await getUnifiedConfig('fixer', args);
                this.config = { ...baseConfig, ...this.config };

                const uiLanguage = this.config.uiLanguage || 'en';
                loadTranslations(uiLanguage, path.resolve(__dirname, '../../../resources', 'i18n', 'ui-locales'));

                this.sourceDir = this.config.sourceDir;
                this.outputDir = this.config.outputDir;
            }

            return await this.fix();

        } catch (error) {
            console.error(t('fixer.error', { error: error.message }));
            if (!fromMenu) {
                process.exit(1);
            }
        }
    }

    // Show help message
    showHelp() {
        console.log(t('fixer.help_message'));
    }

    /**
     * Execute the fixer command
     */
    async execute(options = {}) {
        try {
            await this.initialize();
            await this.run(options);
            return { success: true, command: 'fix' };
        } catch (error) {
            console.error(`Fixer command failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get command metadata
     */
    getMetadata() {
        return {
            name: 'fix',
            description: 'Automatically fix translation issues and inconsistencies',
            category: 'maintenance',
            aliases: ['fixer'],
            usage: 'fix [options]',
            examples: [
                'fix',
                'fix --dry-run',
                'fix --backup'
            ]
        };
    }
}

module.exports = FixerCommand;