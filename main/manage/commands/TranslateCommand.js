#!/usr/bin/env node

/**
 * I18NTK TRANSLATE COMMAND
 *
 * Interactive menu-driven auto-translation using Google Translate.
 * Wraps i18ntk-translate.js behind a user-friendly menu flow.
 */

const path = require('path');
const SecurityUtils = require('../../../utils/security');
const configManager = require('../../../utils/config-manager');
const { getUnifiedConfig } = require('../../../utils/config-helper');
const { loadTranslations } = require('../../../utils/i18n-helper');
const SetupEnforcer = require('../../../utils/setup-enforcer');
const {
    createProtectionFile,
    readProtectionFile,
    saveProtectionFile
} = require('../../../utils/translate/protection');

class TranslateCommand {
    constructor(config = {}, ui = null) {
        this.config = config;
        this.ui = ui;
        this.prompt = null;
        this.isNonInteractiveMode = false;
        this.safeClose = null;
        this.sourceDir = null;
        this.sourceLang = null;
        this.targetLang = null;
        this.configuredTargetLangs = [];
    }

    setRuntimeDependencies(prompt, isNonInteractiveMode, safeClose) {
        this.prompt = prompt;
        this.isNonInteractiveMode = isNonInteractiveMode;
        this.safeClose = safeClose;
    }

    async execute(options = {}) {
        try {
            await SetupEnforcer.checkSetupCompleteAsync();
        } catch (error) {
            console.error('Setup check failed:', error.message);
            return { success: false, error: 'Setup required' };
        }

        loadTranslations('en', path.resolve(__dirname, '..', '..', '..', 'ui-locales'));

        const config = this.config || {};
        let unified;
        try {
            unified = await getUnifiedConfig('translate', options);
        } catch (_) {
            unified = config;
        }
        this.autoTranslateSettings = this.getAutoTranslateSettings(unified);

        const defaultSourceDir = unified.sourceDir || unified.i18nDir || path.resolve(process.cwd(), 'locales', 'en');
        this.sourceLang = unified.sourceLanguage || 'en';
        this.configuredTargetLangs = this.getConfiguredTargetLanguages(unified, defaultSourceDir);

        console.log('\n============================================================');
        console.log('  \u{1F310} AUTO TRANSLATE (BETA)');
        console.log('============================================================');

        if (this.isNonInteractiveMode) {
            this.sourceDir = defaultSourceDir;
            if (!SecurityUtils.safeExistsSync(this.sourceDir, path.dirname(this.sourceDir))) {
                console.error(`Source locale directory not found: ${this.sourceDir}`);
                return { success: false, error: 'Source directory not found' };
            }
            const resolvedSource = this.resolveSourceDirectoryForLanguage(this.sourceDir, this.sourceLang);
            if (!resolvedSource.ok) {
                console.error(resolvedSource.message);
                return { success: false, error: 'No source files found' };
            }
            this.sourceDir = resolvedSource.sourceDir;
            this.configuredTargetLangs = this.getConfiguredTargetLanguages(unified, this.sourceDir);
            const jsonFiles = resolvedSource.jsonFiles;
            return await this.nonInteractiveFlow(jsonFiles);
        }

        const { ask } = require('../../../utils/cli');

        // Step 1: Choose source directory
        this.sourceDir = await this.promptSourceDir(ask, defaultSourceDir);
        if (!this.sourceDir) return { success: false, error: 'No source directory selected' };

        // Step 2: Choose source language
        this.sourceLang = await this.promptSourceLang(ask);
        if (!this.sourceLang) return { success: false, error: 'No source language selected' };

        const resolvedSource = this.resolveSourceDirectoryForLanguage(this.sourceDir, this.sourceLang);
        if (!resolvedSource.ok) {
            console.error(resolvedSource.message);
            return { success: false, error: 'No source files found' };
        }
        this.sourceDir = resolvedSource.sourceDir;
        this.configuredTargetLangs = this.getConfiguredTargetLanguages(unified, this.sourceDir);

        return await this.interactiveFlow(resolvedSource.jsonFiles, ask);
    }

    async promptSourceDir(ask, defaultDir) {
        while (true) {
            console.log('\n  Source locale directory');
            console.log(`  Default: ${defaultDir}`);
            console.log(`  Current project: ${process.cwd()}`);
            console.log('  Accepted: an absolute path, or a path relative to the current project.');
            console.log('  Examples:');
            console.log('    ./locales/en');
            console.log('    ./locales  (then choose source language: en)');
            console.log(`    ${defaultDir}`);
            console.log('  The folder can contain JSON files directly, or language folders such as ./locales/en.');
            console.log('  Press Enter to use the default.');
            const input = await ask('  > ');

            if (!input.trim()) {
                if (!SecurityUtils.safeExistsSync(defaultDir, path.dirname(defaultDir))) {
                    console.log(`  Default directory not found: ${defaultDir}`);
                    console.log('  Please enter an existing directory with JSON locale files.');
                    continue;
                }
                console.log(`  Using default: ${defaultDir}`);
                return defaultDir;
            }

            const cleanInput = input.trim().replace(/^["']|["']$/g, '');
            const resolved = path.isAbsolute(cleanInput)
                ? path.resolve(cleanInput)
                : path.resolve(process.cwd(), cleanInput);
            if (!SecurityUtils.safeExistsSync(resolved, path.dirname(resolved))) {
                console.log(`  Directory not found: ${resolved}`);
                console.log('  Enter an existing folder, for example ./locales/en.');
                continue;
            }
            const stats = SecurityUtils.safeStatSync(resolved, path.dirname(resolved));
            if (!stats || !stats.isDirectory()) {
                console.log(`  Not a directory: ${resolved}`);
                continue;
            }
            console.log(`  Using source directory: ${resolved}`);
            return resolved;
        }
    }

    async promptSourceLang(ask) {
        while (true) {
            console.log('\n  Source language code');
            console.log(`  Default: ${this.sourceLang}`);
            console.log('  This should match the language of the source JSON values.');
            console.log('  Example: en');
            console.log('  Press Enter to use the default.');
            const input = await ask('  > ');

            if (!input.trim()) {
                console.log(`  Using source language: ${this.sourceLang}`);
                return this.sourceLang;
            }

            const lang = input.trim().toLowerCase();
            if (lang.length >= 2) {
                return lang;
            }
            console.log('  Invalid language code. Use 2+ characters (e.g. en, de, fr).');
        }
    }

    async interactiveFlow(jsonFiles, ask) {
        await this.maybeConfigureProtection(ask);

        console.log('\n  Target language(s)');
        if (this.configuredTargetLangs.length > 0) {
            console.log(`  a) All configured target languages: ${this.configuredTargetLangs.join(', ')}`);
        } else {
            console.log('  a) All configured target languages: none configured');
        }
        console.log('  Or enter one or more comma/space-separated language codes.');
        console.log('  Examples: de, es, fr   or   de es fr   or   zh');
        console.log(`  Source language "${this.sourceLang}" will be excluded automatically.`);
        const langInput = await ask('  > ');

        const targetLangs = this.parseTargetLanguages(langInput);

        if (targetLangs.length === 0) {
            console.log('  No valid target languages selected. Aborting.');
            if (this.configuredTargetLangs.length === 0) {
                console.log('  Configure defaultLanguages in .i18ntk-config, or enter target codes manually.');
            }
            return { success: false, error: 'Invalid language code' };
        }

        console.log(`\n  Target languages: ${targetLangs.join(', ')}`);

        console.log(`\n  Which file(s) to translate?`);
        const filePreview = jsonFiles.length <= 6
            ? jsonFiles.join(', ')
            : `${jsonFiles.slice(0, 6).join(', ')}, ...`;
        console.log(`    a) All JSON files (${jsonFiles.length}: ${filePreview})`);
        jsonFiles.forEach((f, i) => {
            console.log(`    ${i + 1}) ${f}`);
        });

        const fileChoice = await ask('\n  Choice [a/all or file number]: ');
        let sourceFiles;

        if (['a', 'all', '*'].includes(fileChoice.trim().toLowerCase())) {
            sourceFiles = jsonFiles.map(f => path.join(this.sourceDir, f));
        } else {
            const idx = parseInt(fileChoice, 10) - 1;
            if (isNaN(idx) || idx < 0 || idx >= jsonFiles.length) {
                console.log('  Invalid choice. Aborting.');
                return { success: false, error: 'Invalid file choice' };
            }
            sourceFiles = [path.join(this.sourceDir, jsonFiles[idx])];
        }

        if (this.autoTranslateSettings.dryRunFirst !== false) {
            // Dry-run for first language only (all languages use same source so same keys)
            const firstLang = targetLangs[0];
            console.log(`\n  Dry-run preview for "${firstLang}"...\n`);
            await this.runTranslate(sourceFiles, firstLang, { dryRun: true });
        }

        console.log('\n  Proceed with actual translation?');
        const answer = await ask('  [y]es / [n]o: ');
        if (!/^y|yes$/i.test(answer.trim())) {
            console.log('  Translation cancelled.');
            return { success: true, cancelled: true };
        }

        let results = [];
        for (const lang of targetLangs) {
            console.log(`\n  Translating to "${lang}"...\n`);
            try {
                await this.runTranslate(sourceFiles, lang, { dryRun: false });
                results.push({ lang, ok: true });
            } catch (e) {
                console.error(`  Failed for "${lang}": ${e.message}`);
                results.push({ lang, ok: false, error: e.message });
            }
        }

        console.log('\n  Summary:');
        for (const r of results) {
            console.log(`    ${r.ok ? '\u{2705}' : '\u{274C}'} ${r.lang}${r.error ? ' (' + r.error + ')' : ''}`);
        }
        console.log('\n  Translation complete!');
        return { success: true, results };
    }

    async nonInteractiveFlow(jsonFiles) {
        console.log('\n  Non-interactive mode. Use direct CLI instead:');
        console.log('    i18ntk-translate <source> <lang> [options]');
        return { success: false, error: 'Non-interactive mode not supported from menu' };
    }

    getJsonFiles(sourceDir) {
        return SecurityUtils.safeReaddirSync(sourceDir, path.dirname(sourceDir))
            .filter(f => f.endsWith('.json'))
            .sort();
    }

    resolveSourceDirectoryForLanguage(selectedDir, sourceLang, options = {}) {
        const shouldLog = options.log !== false;
        const jsonFiles = this.getJsonFiles(selectedDir);
        if (jsonFiles.length > 0) {
            return { ok: true, sourceDir: selectedDir, jsonFiles };
        }

        const cleanLang = String(sourceLang || '').trim().toLowerCase();
        if (cleanLang) {
            const languageDir = path.join(selectedDir, cleanLang);
            const languageStats = SecurityUtils.safeStatSync(languageDir, path.dirname(languageDir));
            if (languageStats && languageStats.isDirectory()) {
                const languageJsonFiles = this.getJsonFiles(languageDir);
                if (languageJsonFiles.length > 0) {
                    if (shouldLog) {
                        console.log(`  No JSON files found directly in: ${selectedDir}`);
                        console.log(`  Using source language folder: ${languageDir}`);
                    }
                    return { ok: true, sourceDir: languageDir, jsonFiles: languageJsonFiles };
                }
            }
        }

        const checkedLanguageDir = cleanLang ? path.join(selectedDir, cleanLang) : null;
        const message = checkedLanguageDir
            ? `No JSON files found in: ${selectedDir}\nAlso checked source language folder: ${checkedLanguageDir}`
            : `No JSON files found in: ${selectedDir}`;
        return { ok: false, sourceDir: selectedDir, jsonFiles: [], message };
    }

    getConfiguredTargetLanguages(config = {}, sourceDir = this.sourceDir) {
        const candidates = []
            .concat(config.defaultLanguages || [])
            .concat(config.targetLanguages || [])
            .concat(config.supportedLanguages || [])
            .concat(config.settings?.defaultLanguages || []);

        const parentDir = sourceDir ? path.dirname(sourceDir) : null;
        if (parentDir && SecurityUtils.safeExistsSync(parentDir, path.dirname(parentDir))) {
            const siblingDirs = SecurityUtils.safeReaddirSync(parentDir, path.dirname(parentDir), { withFileTypes: true })
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);
            candidates.push(...siblingDirs);
        }

        return this.normalizeLanguageList(candidates);
    }

    normalizeLanguageList(languages) {
        const seen = new Set();
        const sourceLang = String(this.sourceLang || '').toLowerCase();
        const normalized = [];

        for (const lang of languages || []) {
            if (typeof lang !== 'string') continue;
            const clean = lang.trim().toLowerCase();
            if (!/^[a-z]{2,3}(?:[-_][a-z0-9]{2,8})?$/i.test(clean)) continue;
            if (clean === sourceLang || seen.has(clean)) continue;
            seen.add(clean);
            normalized.push(clean);
        }

        return normalized.sort();
    }

    parseTargetLanguages(input) {
        const clean = String(input || '').trim().toLowerCase();
        if (['a', 'all', '*'].includes(clean)) {
            return [...this.configuredTargetLangs];
        }

        return this.normalizeLanguageList(clean.split(/[,;\s]+/));
    }

    getAutoTranslateSettings(config = {}) {
        const settings = config.autoTranslate || config.settings?.autoTranslate || {};
        return {
            placeholderMode: ['preserve', 'skip', 'send'].includes(settings.placeholderMode)
                ? settings.placeholderMode
                : 'preserve',
            concurrency: this.toInt(settings.concurrency, 6, 1, 25),
            batchSize: this.toInt(settings.batchSize, 100, 1, 10000),
            progressInterval: this.toInt(settings.progressInterval, 25, 1, 10000),
            retryCount: this.toInt(settings.retryCount, 3, 0, 10),
            retryDelay: this.toInt(settings.retryDelay, 1000, 0, 30000),
            timeout: this.toInt(settings.timeout, 15000, 1000, 120000),
            dryRunFirst: settings.dryRunFirst !== false,
            reportStdout: settings.reportStdout !== false,
            bom: settings.bom === true,
            protectionEnabled: settings.protectionEnabled !== false,
            protectionFile: settings.protectionFile || './i18ntk-auto-translate.json',
            promptProtectionSetup: settings.promptProtectionSetup !== false,
            promptProtectionUpdate: settings.promptProtectionUpdate !== false
        };
    }

    async updateAutoTranslateSetting(key, value) {
        try {
            await configManager.updateConfig({ autoTranslate: { [key]: value } });
            await configManager.saveConfig();
            this.autoTranslateSettings[key] = value;
        } catch (error) {
            console.log(`  Warning: could not save Auto Translate setting "${key}": ${error.message}`);
        }
    }

    async maybeConfigureProtection(ask) {
        const settings = this.autoTranslateSettings;
        if (!settings.protectionEnabled) return;

        const protectionPath = path.resolve(process.cwd(), settings.protectionFile);
        const exists = SecurityUtils.safeExistsSync(protectionPath, path.dirname(protectionPath));

        if (!exists && settings.promptProtectionSetup) {
            console.log('\n  Protected terms and keys');
            console.log('  Auto Translate can keep brand names, product terms, exact values, or key paths unchanged.');
            console.log(`  Protection file: ${protectionPath}`);
            console.log('  Create this JSON file now?');
            const answer = await ask('  [y]es / [n]o / [d]on\'t ask again: ');
            const clean = answer.trim().toLowerCase();
            if (clean === 'd' || clean === 'dont ask again' || clean === "don't ask again") {
                await this.updateAutoTranslateSetting('promptProtectionSetup', false);
                return;
            }
            if (/^y|yes$/i.test(clean)) {
                createProtectionFile(settings.protectionFile);
                await this.promptProtectionEntries(ask, settings.protectionFile);
                return;
            }
        }

        if (exists && settings.promptProtectionUpdate) {
            console.log('\n  Protected terms and keys');
            console.log(`  Current protection file: ${protectionPath}`);
            console.log('  Update protection rules for this run?');
            const answer = await ask('  [y]es / [n]o / [d]on\'t ask again: ');
            const clean = answer.trim().toLowerCase();
            if (clean === 'd' || clean === 'dont ask again' || clean === "don't ask again") {
                await this.updateAutoTranslateSetting('promptProtectionUpdate', false);
                return;
            }
            if (/^y|yes$/i.test(clean)) {
                await this.promptProtectionEntries(ask, settings.protectionFile);
            }
        }
    }

    splitList(input) {
        return String(input || '')
            .split(/[,;\n]+/)
            .map(item => item.trim())
            .filter(Boolean);
    }

    mergeList(existing, additions) {
        const seen = new Set(existing || []);
        for (const item of additions || []) {
            if (!seen.has(item)) seen.add(item);
        }
        return Array.from(seen);
    }

    async promptProtectionEntries(ask, protectionFile) {
        let config;
        try {
            config = readProtectionFile(protectionFile);
        } catch (_) {
            config = {
                version: 1,
                terms: [],
                keys: [],
                values: [],
                patterns: []
            };
        }

        console.log('\n  Add protected terms separated by commas.');
        console.log('  Example: BrandName, PRODUCT_CODE, API');
        const terms = this.splitList(await ask('  Terms [Enter to skip]: '));

        console.log('\n  Add protected key paths separated by commas.');
        console.log('  Exact keys and * wildcards are supported.');
        console.log('  Example: app.brandName, legal.companyName, product.*.symbol');
        const keys = this.splitList(await ask('  Keys [Enter to skip]: '));

        console.log('\n  Add exact values to copy unchanged separated by commas.');
        console.log('  Example: BrandName Ltd, support@example.com');
        const values = this.splitList(await ask('  Values [Enter to skip]: '));

        console.log('\n  Add optional JavaScript regex patterns separated by commas.');
        console.log('  Example: [A-Z]{2,}-\\d+');
        const patterns = this.splitList(await ask('  Patterns [Enter to skip]: '));

        config.terms = this.mergeList(config.terms, terms);
        config.keys = this.mergeList(config.keys, keys);
        config.values = this.mergeList(config.values, values);
        config.patterns = this.mergeList(config.patterns, patterns);

        const savedPath = saveProtectionFile(protectionFile, config);
        console.log(`  Protection file saved: ${savedPath}`);
    }

    toInt(value, fallback, min, max) {
        const parsed = parseInt(value, 10);
        if (!Number.isInteger(parsed)) return fallback;
        return Math.min(Math.max(parsed, min), max);
    }

    async runTranslate(sourceFiles, targetLang, opts = {}) {
        const { parseArgs, run } = require('../../i18ntk-translate');
        const settings = this.autoTranslateSettings || this.getAutoTranslateSettings();

        for (const src of sourceFiles) {
            const args = parseArgs(['node', 'i18ntk-translate', src, targetLang]);
            args.noConfirm = true;
            args.sourceLang = this.sourceLang || 'en';
            args.dryRun = opts.dryRun === true;
            args.reportStdout = settings.reportStdout;
            args.bom = settings.bom;
            args.concurrency = settings.concurrency;
            args.batchSize = settings.batchSize;
            args.progressInterval = settings.progressInterval;
            args.retryCount = settings.retryCount;
            args.retryDelay = settings.retryDelay;
            args.timeout = settings.timeout;
            args.protectionEnabled = settings.protectionEnabled;
            args.protectionFile = settings.protectionFile;
            args.preservePlaceholders = settings.placeholderMode === 'preserve';
            args.skipPlaceholders = settings.placeholderMode === 'skip';
            args.sendPlaceholders = settings.placeholderMode === 'send';

            const result = await run(args);
            if (!result || result.success !== true) {
                throw new Error(result?.error || `Translation failed for ${src}`);
            }
        }
    }
}

module.exports = TranslateCommand;
