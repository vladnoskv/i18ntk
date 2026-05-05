#!/usr/bin/env node

/**
 * I18NTK TRANSLATE COMMAND
 *
 * Interactive menu-driven auto-translation using Google Translate.
 * Wraps i18ntk-translate.js behind a user-friendly menu flow.
 */

const fs = require('fs');
const path = require('path');
const { getUnifiedConfig } = require('../../../utils/config-helper');
const { loadTranslations } = require('../../../utils/i18n-helper');
const SetupEnforcer = require('../../../utils/setup-enforcer');

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
        const unified = getUnifiedConfig(config);

        const defaultSourceDir = unified.sourceDir || unified.i18nDir || path.resolve(process.cwd(), 'locales', 'en');
        this.sourceLang = unified.sourceLanguage || 'en';

        console.log('\n============================================================');
        console.log('  \u{1F310} AUTO TRANSLATE (BETA)');
        console.log('============================================================');

        if (this.isNonInteractiveMode) {
            this.sourceDir = defaultSourceDir;
            if (!fs.existsSync(this.sourceDir)) {
                console.error(`Source locale directory not found: ${this.sourceDir}`);
                return { success: false, error: 'Source directory not found' };
            }
            const jsonFiles = fs.readdirSync(this.sourceDir).filter(f => f.endsWith('.json')).sort();
            return await this.nonInteractiveFlow(jsonFiles);
        }

        const { ask } = require('../../../utils/cli');

        // Step 1: Choose source directory
        this.sourceDir = await this.promptSourceDir(ask, defaultSourceDir);
        if (!this.sourceDir) return { success: false, error: 'No source directory selected' };

        // Step 2: Choose source language
        this.sourceLang = await this.promptSourceLang(ask);
        if (!this.sourceLang) return { success: false, error: 'No source language selected' };

        const jsonFiles = fs.readdirSync(this.sourceDir)
            .filter(f => f.endsWith('.json'))
            .sort();

        if (jsonFiles.length === 0) {
            console.error(`No JSON files found in: ${this.sourceDir}`);
            return { success: false, error: 'No source files found' };
        }

        return await this.interactiveFlow(jsonFiles, ask);
    }

    async promptSourceDir(ask, defaultDir) {
        while (true) {
            console.log(`\n  Source directory [default: ${defaultDir}]`);
            console.log('  Press Enter for default, or type a custom path.');
            const input = await ask('  > ');

            if (!input.trim()) {
                if (!fs.existsSync(defaultDir)) {
                    console.log(`  Default directory not found: ${defaultDir}`);
                    console.log('  Please enter an existing directory with JSON locale files.');
                    continue;
                }
                console.log(`  Using default: ${defaultDir}`);
                return defaultDir;
            }

            const resolved = path.resolve(process.cwd(), input.trim());
            if (!fs.existsSync(resolved)) {
                console.log(`  Directory not found: ${resolved}`);
                continue;
            }
            if (!fs.statSync(resolved).isDirectory()) {
                console.log(`  Not a directory: ${resolved}`);
                continue;
            }
            return resolved;
        }
    }

    async promptSourceLang(ask) {
        while (true) {
            console.log(`\n  Source language code [default: ${this.sourceLang}]`);
            const input = await ask('  > ');

            if (!input.trim()) {
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

        console.log('\n  Target language code(s)');
        console.log('  Enter one or more comma/space-separated codes');
        console.log('  (e.g. de, es, fr  or  de es fr  or  de):');
        const langInput = await ask('  > ');

        const targetLangs = langInput
            .trim()
            .split(/[,;\s]+/)
            .map(s => s.toLowerCase().trim())
            .filter(s => s.length >= 2);

        if (targetLangs.length === 0) {
            console.log('  No valid language codes entered. Aborting.');
            return { success: false, error: 'Invalid language code' };
        }

        console.log(`\n  Target languages: ${targetLangs.join(', ')}`);

        console.log(`\n  Which file(s) to translate?`);
        console.log(`    a) All files (${jsonFiles.join(', ')})`);
        jsonFiles.forEach((f, i) => {
            console.log(`    ${i + 1}) ${f}`);
        });

        const fileChoice = await ask('\n  Choice [a/1-9]: ');
        let sourceFiles;

        if (fileChoice.toLowerCase() === 'a') {
            sourceFiles = jsonFiles.map(f => path.join(this.sourceDir, f));
        } else {
            const idx = parseInt(fileChoice, 10) - 1;
            if (isNaN(idx) || idx < 0 || idx >= jsonFiles.length) {
                console.log('  Invalid choice. Aborting.');
                return { success: false, error: 'Invalid file choice' };
            }
            sourceFiles = [path.join(this.sourceDir, jsonFiles[idx])];
        }

        // Dry-run for first language only (all languages use same source so same keys)
        const firstLang = targetLangs[0];
        console.log(`\n  Dry-run preview for "${firstLang}"...\n`);
        await this.runTranslate(sourceFiles, firstLang, { dryRun: true });

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

    async runTranslate(sourceFiles, targetLang, opts = {}) {
        const { spawn } = require('child_process');

        for (const src of sourceFiles) {
            const args = [
                path.resolve(__dirname, '..', '..', 'i18ntk-translate.js'),
                src,
                targetLang,
                '--no-confirm',
                '--skip-placeholders',
                '--report-stdout'
            ];

            if (opts.dryRun) {
                args.push('--dry-run');
            }

            await new Promise((resolve, reject) => {
                const proc = spawn('node', args, {
                    stdio: 'inherit',
                    cwd: process.cwd()
                });
                proc.on('close', (code) => {
                    if (code === 0) resolve();
                    else reject(new Error(`Exit code ${code}`));
                });
                proc.on('error', reject);
            });
        }
    }
}

module.exports = TranslateCommand;
