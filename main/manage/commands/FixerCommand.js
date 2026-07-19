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
const { scanEnglishPlaceholders } = require('../../../utils/english-placeholder-checker');
const { discoverLocaleFiles, isLocaleName, normalizeLocale } = require('../../../utils/locale-discovery');

class FixerCommand {
    constructor(config = {}, ui = null) {
        this.config = config;
        this.ui = ui;
        this.prompt = null;
        this.isNonInteractiveMode = false;
        this.safeClose = null;

        // Initialize fixer properties
        this.sourceDir = null;
        this.codeDir = null;
        this.localesDir = null;
        this.outputDir = null;
        this.backupDir = null;
        this.dryRun = false;
        this.force = false;
    }

    isExcludedLanguageDirectory(name) {
        if (!name || typeof name !== 'string') return true;
        const lowered = name.toLowerCase();
        return lowered.startsWith('backup-') ||
               lowered === 'backup' ||
               lowered === 'backups' ||
               lowered === 'i18ntk-backups' ||
               lowered === 'reports' ||
               lowered === 'i18ntk-reports';
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
                    'check-placeholders': 'Only check English locale files for [LANG] placeholder leftovers',
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
            loadTranslations(uiLanguage, path.resolve(__dirname, '../../../ui-locales'));

            const providedLocaleDir = args.i18nDir || (!args.codeDir && args.sourceDir ? args.sourceDir : null);
            this.codeDir = path.resolve(args.codeDir || this.config.codeDir || this.config.sourceDir);
            this.localesDir = path.resolve(providedLocaleDir || this.config.localesDir || this.config.i18nDir || this.config.sourceDir);
            // sourceDir remains an internal compatibility alias for the locale
            // root used by older integrations and direct FixerCommand callers.
            this.sourceDir = this.localesDir;
            this.outputDir = this.config.outputDir;
            this.backupDir = path.resolve(this.config.backup?.location || './i18ntk-backups', 'fixer');

            const localeStat = SecurityUtils.safeStatSync(this.localesDir, process.cwd());
            if (!localeStat || !localeStat.isDirectory()) {
                const error = new Error(`Locale directory not found: ${this.localesDir}`);
                error.exitCode = 2;
                throw error;
            }

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
                    } else if (sanitizedKey === 'check-placeholders') {
                        parsed.checkPlaceholders = true;
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
            const sourceLocale = normalizeLocale(this.config.sourceLanguage);
            const byLocale = new Map();
            for (const entry of discoverLocaleFiles(this.sourceDir, { excludeDirs: this.config.excludeDirs })) {
                if (entry.locale === sourceLocale || !isLocaleName(entry.displayLocale)) continue;
                if (!byLocale.has(entry.locale)) byLocale.set(entry.locale, entry.displayLocale);
            }
            return [...byLocale.values()].sort((a, b) => a.localeCompare(b));
        } catch (error) {
            return [];
        }
    }

getLanguageFileEntries(language) {
        const wantedLocale = normalizeLocale(language);
        return discoverLocaleFiles(this.sourceDir, { excludeDirs: this.config.excludeDirs })
            .filter(entry => entry.locale === wantedLocale)
            .map(entry => {
                let logicalName;
                if (entry.type === 'direct') {
                    logicalName = 'default';
                } else if (entry.namespace) {
                    // For namespaced entries, use the namespace (filename without extension)
                    logicalName = entry.namespace;
                } else {
                    // Fallback: compute relative path from the locale directory
                    // Use the actual parent directory of the file to handle symlinks correctly
                    const localeDir = path.dirname(entry.filePath);
                    logicalName = path.relative(localeDir, entry.filePath).replace(/\\/g, '/');
                }
                return { ...entry, logicalName };
            });
    }

    // Get all JSON files from a language directory
    getLanguageFiles(language) {
        const discovered = this.getLanguageFileEntries(language);
        if (discovered.length > 0) {
            return discovered.map(entry => entry.type === 'direct' ? path.basename(entry.filePath) : entry.logicalName);
        }
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
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                const nestedKeys = this.getAllKeys(value, fullKey);
                nestedKeys.forEach(k => keys.add(k));
            } else {
                keys.add(fullKey);
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
            const backupEnabled = this.config?.backup?.enabled === true;
            if (!backupEnabled) {
                this.backupDir = null;
                return;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupRoot = path.resolve(this.config?.backup?.location || './i18ntk-backups');
            this.backupDir = path.join(backupRoot, 'fixer', `backup-${timestamp}`);

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

            for (const language of [...new Set(languages)]) {
                const languageFiles = this.getLanguageFileEntries(language);

                for (const entry of languageFiles) {
                    const sourcePath = entry.filePath;
                    const backupRelativePath = entry.type === 'direct'
                        ? path.basename(entry.filePath)
                        : path.join(entry.displayLocale, entry.logicalName);
                    const backupPath = path.join(this.backupDir, backupRelativePath);

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

            this.cleanupOldBackups();

            console.log(t('fixer.backupCreated'));
        } catch (error) {
            console.warn(`Failed to create backup: ${error.message}`);
        }
    }

    cleanupOldBackups() {
        try {
            const fixerBackupRoot = path.resolve(this.config?.backup?.location || './i18ntk-backups', 'fixer');
            if (!SecurityUtils.safeExistsSync(fixerBackupRoot, process.cwd())) return;

            const configuredKeep = parseInt(this.config?.backup?.maxBackups, 10);
            const keepCount = Number.isInteger(configuredKeep) ? Math.min(Math.max(configuredKeep, 1), 3) : 1;

            const backupDirs = SecurityUtils.safeReaddirSync(fixerBackupRoot, process.cwd(), { withFileTypes: true })
                .filter(entry => entry.isDirectory() && entry.name.startsWith('backup-'))
                .map(entry => {
                    const dirPath = path.join(fixerBackupRoot, entry.name);
                    const stat = SecurityUtils.safeStatSync(dirPath, process.cwd());
                    return { name: entry.name, path: dirPath, mtimeMs: stat ? stat.mtimeMs : 0 };
                })
                .sort((a, b) => b.mtimeMs - a.mtimeMs);

            if (backupDirs.length <= keepCount) return;

            for (const staleDir of backupDirs.slice(keepCount)) {
              try {
                SecurityUtils.safeUnlinkSync(staleDir.path, process.cwd());
              } catch (_) {
                // Directory not empty, use recursive removal
                try {
                  const { rmSync } = require('fs');
                  rmSync(staleDir.path, { recursive: true, force: true });
                } catch (_) {
                  // Best-effort cleanup
                }
              }
            }
        } catch (error) {
            console.warn(`Failed to clean old backups: ${error.message}`);
        }
    }

    // Analyze translation issues for fixing
    analyzeIssues(language, fileName) {
        const issues = [];
        const sourceEntry = this.getLanguageFileEntries(this.config.sourceLanguage)
            .find(entry => entry.logicalName === fileName);
        const targetEntry = this.getLanguageFileEntries(language)
            .find(entry => entry.logicalName === sourceEntry?.logicalName);
        if (!sourceEntry || !targetEntry) return issues;

        const sourceFilePath = sourceEntry.filePath;
        const targetFilePath = targetEntry.filePath;

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
                        fix: (obj) => this.setValueByPath(obj, key, sourceValue)
                    });
                } else if (targetValue === '') {
                    // Empty value
                    issues.push({
                        type: 'empty_value',
                        key,
                        sourceValue,
                        fix: (obj) => this.setValueByPath(obj, key, sourceValue)
                    });
                } else {
                    const markers = this.config.notTranslatedMarkers || [this.config.notTranslatedMarker];
                    if (markers.some(m => targetValue === m)) {
                        // Untranslated marker
                        issues.push({
                            type: 'untranslated_marker',
                            key,
                            sourceValue,
                            fix: (obj) => this.setValueByPath(obj, key, sourceValue)
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

        const sourceFiles = this.getLanguageFileEntries(this.config.sourceLanguage);

        for (const sourceEntry of sourceFiles) {
            const fileName = sourceEntry.logicalName;
            const issues = this.analyzeIssues(language, fileName);

            if (issues.length > 0) {
                fixes.files[fileName] = {
                    issues: issues.length,
                    fixed: 0
                };

                fixes.totalIssues += issues.length;

                if (!this.dryRun) {
                    // Apply fixes
                    const targetEntry = this.getLanguageFileEntries(language)
                        .find(entry => entry.logicalName === fileName);
                    const targetFilePath = targetEntry?.filePath;

                    try {
                        if (!targetFilePath) continue;
                        const targetContent = SecurityUtils.safeReadFileSync(targetFilePath, this.sourceDir, 'utf8');
                        if (!targetContent) continue;

                        const targetObj = SecurityUtils.safeParseJSON(targetContent);
                        if (!targetObj) continue;

                        for (const issue of issues) {
                            if (typeof issue.fix === 'function') {
                                issue.fix(targetObj);
                                fixes.files[fileName].fixed++;
                                fixes.fixedIssues++;
                            }
                        }

                        // Write back the fixed content
                        const fixedContent = JSON.stringify(targetObj, null, 2);
                        SecurityUtils.safeWriteFileSync(targetFilePath, fixedContent, this.sourceDir, 'utf8');

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

    checkEnglishPlaceholders(options = {}) {
        const result = scanEnglishPlaceholders({
            sourceDir: this.sourceDir || this.config.sourceDir,
            sourceLanguage: this.config.sourceLanguage || 'en'
        });

        if (options.print === false) {
            return result;
        }

        console.log('\nEnglish placeholder check');
        console.log('-'.repeat(50));
        console.log(`Source directory: ${result.sourceDir}`);
        console.log(`Source language: ${result.sourceLanguage}`);
        console.log(`Files scanned: ${result.fileCount}`);
        console.log(`Keys scanned: ${result.keyCount}`);
        console.log(`Language-code placeholders found: ${result.placeholderCount}`);

        if (result.errors.length > 0) {
            console.log('\nParse errors:');
            for (const item of result.errors.slice(0, 20)) {
                console.log(`  ${item.file}: ${item.error}`);
            }
            if (result.errors.length > 20) {
                console.log(`  ... and ${result.errors.length - 20} more parse errors.`);
            }
        }

        if (result.placeholders.length > 0) {
            console.log('\nWARNING: English locale files still contain language-code placeholders.');
            for (const item of result.placeholders.slice(0, 20)) {
                console.log(`  ${item.file} :: ${item.key} = ${JSON.stringify(item.value)}`);
            }
            if (result.placeholders.length > 20) {
                console.log(`  ... and ${result.placeholders.length - 20} more placeholders.`);
            }
            console.log('Recommendation: translate or replace these English source values before fixing target locales.');
        } else if (result.errors.length === 0) {
            console.log('OK: English placeholder count is 0.');
        }

        return result;
    }

    // Main fixing process
    async fix() {
        try {
            const args = this.parseArgs();
            const jsonOutput = new JsonOutput('fixer');

            // Set options from args
            this.dryRun = args.dryRun || false;
            this.force = args.force || false;
            if (args.markers?.length) {
                this.config.notTranslatedMarkers = args.markers;
                this.config.notTranslatedMarker = args.markers[0];
            }

            const sourceFiles = this.getLanguageFileEntries(this.config.sourceLanguage);
            if (sourceFiles.length === 0) {
                const error = `No JSON locale files found for source locale '${this.config.sourceLanguage}' in ${this.sourceDir}.`;
                if (args.json) {
                    jsonOutput.setStatus('error', error);
                    console.log(JSON.stringify(jsonOutput.getOutput(), null, args.indent ?? 2));
                } else {
                    console.error(error);
                }
                return { success: false, error };
            }

            const placeholderCheck = this.checkEnglishPlaceholders({ print: !args.json });
            if (args.checkPlaceholders) {
                if (args.json) {
                    jsonOutput.setStatus(placeholderCheck.success ? 'ok' : 'error');
                    jsonOutput.setStats({
                        files: placeholderCheck.fileCount,
                        keys: placeholderCheck.keyCount,
                        placeholders: placeholderCheck.placeholderCount,
                        parseErrors: placeholderCheck.errors.length
                    });
                    jsonOutput.data.message = 'English placeholder check completed';
                    jsonOutput.data.placeholders = placeholderCheck.placeholders;
                    jsonOutput.data.errors = placeholderCheck.errors;
                    console.log(JSON.stringify(jsonOutput.data, null, args.indent ?? 2));
                }
                return placeholderCheck;
            }

            if (!placeholderCheck.success) {
                const error = `English locale placeholder check failed: ${placeholderCheck.placeholderCount} placeholder(s), ${placeholderCheck.errors.length} parse error(s).`;
                if (args.json) {
                    jsonOutput.setStatus('error');
                    jsonOutput.setStats({
                        placeholders: placeholderCheck.placeholderCount,
                        parseErrors: placeholderCheck.errors.length
                    });
                    jsonOutput.data.message = error;
                    jsonOutput.data.placeholders = placeholderCheck.placeholders;
                    jsonOutput.data.errors = placeholderCheck.errors;
                    console.log(JSON.stringify(jsonOutput.data, null, args.indent ?? 2));
                    return { ...placeholderCheck, success: false, error };
                }
                console.log(`\n${error}`);
                return { ...placeholderCheck, success: false, error };
            }

            const availableLanguages = this.getAvailableLanguages();
            const requestedLanguages = args.languages || [];
            const languages = requestedLanguages.length > 0
                ? availableLanguages.filter(language => requestedLanguages.some(requested => normalizeLocale(requested) === normalizeLocale(language)))
                : availableLanguages;

            if (requestedLanguages.length > 0 && languages.length !== new Set(requestedLanguages.map(normalizeLocale)).size) {
                const missing = requestedLanguages.filter(requested => !availableLanguages.some(language => normalizeLocale(language) === normalizeLocale(requested)));
                const error = `Requested target locale(s) not found: ${missing.join(', ')}.`;
                if (args.json) {
                    jsonOutput.setStatus('error', error);
                    console.log(JSON.stringify(jsonOutput.getOutput(), null, args.indent ?? 2));
                } else {
                    console.error(error);
                }
                return { success: false, error };
            }

            if (!args.json) {
                console.log(t('fixer.starting', { languages: languages.join(', ') || 'none' }));
                console.log(t('fixer.sourceDirectory', { sourceDir: path.resolve(this.sourceDir) }));
                console.log(t('fixer.dryRunMode', { mode: this.dryRun ? 'ON' : 'OFF' }));
            }

            // Create backup unless disabled
            if (!args.noBackup && !this.dryRun && this.config?.backup?.enabled === true) {
                await this.createBackup();
            }

            if (languages.length === 0) {
                const error = t('fixer.noLanguages') || 'No target languages found.';
                if (args.json) {
                    jsonOutput.setStatus('error');
                    jsonOutput.data.message = error;
                    console.log(JSON.stringify(jsonOutput.data, null, args.indent ?? 2));
                    return { success: false, error };
                }
                console.log(error);
                return { success: false, error };
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
                    const skipped = Math.max(0, fixes.totalIssues - fixes.fixedIssues);
                    console.log(t('fixer.languageFixed', {
                        language,
                        issues: fixes.totalIssues,
                        fixed: fixes.fixedIssues,
                        skipped
                    }));
                }
            }

            // Prepare JSON output
            if (args.json) {
                jsonOutput.setStatus(totalFixed > 0 ? 'ok' : 'info');
                jsonOutput.setStats({
                    issues: totalIssues,
                    fixed: totalFixed,
                    languages: languages.length
                });
                jsonOutput.data.message = 'Fixer completed';

                console.log(JSON.stringify(jsonOutput.data, null, args.indent ?? 2));
                return { success: true, totalIssues, totalFixed, results };
            }

            // Summary
            console.log(t('fixer.summary'));
            console.log('='.repeat(50));
            console.log(t('fixer.totalIssues', { totalIssues }));
            console.log(t('fixer.totalFixed', { count: totalFixed }));

            if (this.backupDir && !args.noBackup && this.config?.backup?.enabled === true) {
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
                loadTranslations(uiLanguage, path.resolve(__dirname, '../../../ui-locales'));

                this.codeDir = this.config.codeDir || this.config.sourceDir;
                this.localesDir = this.config.localesDir || this.config.i18nDir || this.config.sourceDir;
                this.sourceDir = this.localesDir;
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
            const result = await this.run(options);
            if (result && result.success === false) {
                return result;
            }
            return { success: true, command: 'fix', result };
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
