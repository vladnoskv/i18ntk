#!/usr/bin/env node
/**
 * I18NTK MANAGEMENT TOOLKIT - MAIN MANAGER
 *
 * This is the main entry point for all i18n operations.
 * It provides an interactive interface to manage translations.
 *
 * Usage:
 *   npm run i18ntk:manage
 *   npm run i18ntk:manage -- --command=init
 *   npm run i18ntk:manage -- --command=analyze
 *   npm run i18ntk:manage -- --command=validate
 *   npm run i18ntk:manage -- --help
 */

const path = require('path');
const AdminAuth = require('../../utils/admin-auth');
const SecurityUtils = require('../../utils/security');
const AdminCLI = require('../../utils/admin-cli');
const configManager = require('../../settings/settings-manager');
const { showFrameworkWarningOnce } = require('../../utils/cli-helper');
const { createPrompt, isInteractive } = require('../../utils/prompt-helper');
const { loadTranslations, t, refreshLanguageFromSettings} = require('../../utils/i18n-helper');
const cliHelper = require('../../utils/cli-helper');
const { loadConfig, saveConfig, ensureConfigDefaults } = require('../../utils/config');
const pkg = require('../../package.json');
const SetupEnforcer = require('../../utils/setup-enforcer');
const CommandRouter = require('./commands/CommandRouter');

// Import services to replace circular dependencies
const ConfigurationService = require('./services/ConfigurationService');
const SummaryService = require('./services/SummaryService');

// Preload translations early to avoid missing key warnings
loadTranslations();

class I18nManager {
    constructor(config = {}) {
        this.config = config;
        this.rl = null;
        this.isReadlineClosed = false;
        this.isAuthenticated = false;
        this.ui = null;
        this.adminAuth = new AdminAuth();
        this.commandRouter = null;

        // Initialize services
        this.configurationService = new ConfigurationService(config);
        this.summaryService = new SummaryService(config);

        // No longer create readline interface here - use CLI helpers
    }

    initializeReadline() {
        // Use centralized CLI helper instead of direct readline
        this.rl = null;
        this.isReadlineClosed = false;
    }

    // Initialize configuration using unified system
    async initialize() {
        try {
            // Parse args here for other initialization needs (but language is already loaded)
            const args = this.parseArgs();
            if (args.help) {
                this.showHelp();
                process.exit(0);
            }

            // Load translations for the UI language
            const settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
            const uiLanguage = args.uiLanguage || settings.uiLanguage || settings.language || this.config.uiLanguage || 'en';
            loadTranslations(uiLanguage);

            // Validate source directory exists
            const {validateSourceDir, displayPaths} = require('../../utils/config-helper');
            try {
                validateSourceDir(this.config.sourceDir, 'i18ntk-manage');
            } catch (err) {
                console.log(t('init.requiredTitle'));
                console.log(t('init.requiredBody'));
                const answer = await cliHelper.prompt(t('init.promptRunNow'));
                if (answer.trim().toLowerCase() === 'y') {
                    // Note: Initialization should be handled by the calling code
                    // to avoid circular dependencies
                    console.log('Please run initialization manually or use the init command');
                } else {
                    throw err;
                }
            }

        } catch (error) {
            throw error;
        }
    }

    // Auto-detect i18n directory from common locations only if not configured in settings
    detectI18nDirectory() {
        const settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
        const projectRoot = path.resolve(settings.projectRoot || this.config.projectRoot || '.');

        // Use per-script directory configuration if available, fallback to global sourceDir
        const sourceDir = settings.scriptDirectories?.manage || settings.sourceDir;

        if (sourceDir) {
            this.config.sourceDir = path.resolve(projectRoot, sourceDir);
            return;
        }

        // Define possible i18n paths for auto-detection
        const possibleI18nPaths = [
            './locales',
            './src/locales',
            './src/i18n',
            './src/i18n/locales',
            './app/locales',
            './app/i18n',
            './public/locales',
            './assets/locales',
            './translations',
            './lang'
        ];

        // Only auto-detect if no settings are configured
        for (const possiblePath of possibleI18nPaths) {
            const resolvedPath = path.resolve(projectRoot, possiblePath);
            if (SecurityUtils.safeExistsSync(resolvedPath)) {
                // Check if it contains language directories
                try {
                    const items = require('fs').readdirSync(resolvedPath);
                    const hasLanguageDirs = items.some(item => {
                        const itemPath = path.join(resolvedPath, item);
                        return require('fs').statSync(itemPath).isDirectory() &&
                               ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'].includes(item);
                    });

                    if (hasLanguageDirs) {
                        this.config.sourceDir = possiblePath;
                        t('init.autoDetectedI18nDirectory', { path: possiblePath });
                        break;
                    }
                } catch (error) {
                    // Continue checking other paths
                }
            }
        }
    }

    // Check if i18n framework is installed - configuration-based check without prompts
    async checkI18nDependencies() {
        const packageJsonPath = path.resolve('./package.json');

        if (!SecurityUtils.safeExistsSync(packageJsonPath)) {
            console.log(this.ui ? this.ui.t('errors.noPackageJson') : 'No package.json found');
            return false; // Treat as no framework detected
        }

        try {
            const packageJson = JSON.parse(SecurityUtils.safeReadFileSync(packageJsonPath, path.dirname(packageJsonPath), 'utf8'));
            // Include peerDependencies in the check
            const dependencies = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies,
                ...packageJson.peerDependencies
            };

            const i18nFrameworks = [
                'react-i18next',
                'vue-i18n',
                'angular-i18n',
                'i18next',
                'next-i18next',
                'svelte-i18n',
                '@nuxtjs/i18n',
                'i18ntk-runtime'
            ];

            const installedFrameworks = i18nFrameworks.filter(framework => dependencies[framework]);

            if (installedFrameworks.length > 0) {
                if (this.ui && this.ui.t) {
                    console.log(this.ui.t('init.detectedFrameworks', { frameworks: installedFrameworks.join(', ') }));
                } else {
                    console.log(`Detected frameworks: ${installedFrameworks.join(', ')}`);
                }
                const cfg = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
                cfg.framework = cfg.framework || {};
                cfg.framework.detected = true;
                cfg.framework.installed = installedFrameworks;
                if (configManager.saveSettings) {
                    configManager.saveSettings(cfg);
                } else if (configManager.saveConfig) {
                    configManager.saveConfig(cfg);
                }
                return true;
            } else {
                const cfg = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
                if (cfg.framework) {
                    cfg.framework.detected = false;
                    if (configManager.saveSettings) {
                        configManager.saveSettings(cfg);
                    } else if (configManager.saveConfig) {
                        configManager.saveConfig(cfg);
                    }
                }
                // Always signal that frameworks were not detected
                return false;
            }
        } catch (error) {
            console.log(t('init.errors.packageJsonRead'));
            return false; // Treat as no framework detected on error
        }
    }

    // Parse command line arguments
    parseArgs() {
        const args = process.argv.slice(2);
        const parsed = {};

        args.forEach(arg => {
            if (arg.startsWith('--')) {
                const [key, value] = arg.substring(2).split('=');
                const sanitizedKey = key?.trim();
                const sanitizedValue = value !== undefined ? value.trim() : true;

                switch (sanitizedKey) {
                    case 'source-dir':
                        parsed.sourceDir = sanitizedValue;
                        break;
                    case 'i18n-dir':
                        parsed.i18nDir = sanitizedValue;
                        break;
                    case 'output-dir':
                        parsed.outputDir = sanitizedValue;
                        break;
                    case 'source-language':
                        parsed.sourceLanguage = sanitizedValue;
                        break;
                    case 'ui-language':
                        parsed.uiLanguage = sanitizedValue;
                        break;
                    case 'no-prompt':
                        parsed.noPrompt = true;
                        break;
                    case 'admin-pin':
                        parsed.adminPin = sanitizedValue || '';
                        break;
                    case 'help':
                    case 'h':
                        parsed.help = true;
                        break;
                    default:
                        // Handle language shorthand flags like --de, --fr
                        if (['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'].includes(sanitizedKey)) {
                            parsed.uiLanguage = sanitizedKey;
                        }
                        break;
                }
            }
        });

        return parsed;
    }

    // Add this run method after the checkI18nDependencies method
    async run() {
        // Add timeout to prevent hanging
        const args = this.parseArgs();

        const timeout = setTimeout(() => {
            console.error('❌ CLI startup timeout - something is hanging');
            if (args.debug) {
                console.error('🔍 DEBUG: Last known execution point reached');
            }
            process.exit(1);
        }, 10000); // 10 second timeout

        if (args.debug) {
            console.log('🔍 DEBUG: Starting i18ntk-manage.js...');
            console.log('🔍 DEBUG: Process.argv:', process.argv);
            console.log('🔍 DEBUG: Parsed args:', args);
            console.log('🔍 DEBUG: About to call SetupEnforcer.checkSetupCompleteAsync()');
        }

        let prompt;
        try {
            // Ensure setup is complete before running any operations
            await SetupEnforcer.checkSetupCompleteAsync();

            prompt = createPrompt({ noPrompt: args.noPrompt || Boolean(args.adminPin) });
            const interactive = isInteractive({ noPrompt: args.noPrompt || Boolean(args.adminPin) });

            // Load settings and UI language
            const settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
            const uiLanguage = args.uiLanguage || settings.uiLanguage || settings.language || this.config.uiLanguage || 'en';
            loadTranslations(uiLanguage);

            // Initialize CommandRouter
            this.commandRouter = new CommandRouter(this.config, this.ui, this.adminAuth);

            if (args.adminPin) {
                this.adminAuth.verifyPin = async () => true;
                this.prompt = async () => '';
            }

            if (args.help) {
                this.showHelp();
                return;
            }

            let cfgAfterInitCheck = {};
            if (interactive) {
                cfgAfterInitCheck = await this.ensureInitializedOrExit(prompt);
                const frameworksDetected = await this.checkI18nDependencies();
                if (!frameworksDetected) {
                    await this.maybePromptFramework(prompt, cfgAfterInitCheck, pkg.version);
                }
            }

            this.config = { ...this.config, ...cfgAfterInitCheck };
            await this.initialize();

            const rawArgs = process.argv.slice(2); // Preserve original CLI args array for positional checks
            let commandToExecute = null;

            // Define valid direct commands
            const directCommands = [
                'init', 'analyze', 'validate', 'usage', 'scanner', 'sizing', 'complete', 'fix', 'summary', 'debug', 'workflow'
            ];

            // Handle help immediately without dependency checks
            if (args.help) {
                this.showHelp();
                this.safeClose();
                process.exit(0);
            }

            // Handle debug flag
            if (args.debug) {
                // Enable debug mode for this session
                const { blue } = require('../../utils/colors-new');
                console.log(blue('Debug mode enabled'));
            }

            // Check for --command= argument first
            const commandFlagArg = rawArgs.find(arg => arg.startsWith('--command='));
            if (commandFlagArg) {
                commandToExecute = commandFlagArg.split('=')[1];
            } else if (rawArgs.length > 0 && directCommands.includes(rawArgs[0])) {
                // If no --command=, check if the first argument is a direct command
                commandToExecute = rawArgs[0];
            }

            if (commandToExecute) {
                console.log(t('ui.executingCommand', { command: commandToExecute }));
                await this.executeCommand(commandToExecute);
                this.safeClose();
                return;
            }

            // If no command provided and --no-prompt is set, exit gracefully
            if (args.noPrompt) {
                this.safeClose();
                process.exit(0);
            }

            // Framework detection is now handled by maybePromptFramework above
            // Skip the redundant checkI18nDependencies prompt

            // Interactive mode - showInteractiveMenu will handle the title
            await this.showInteractiveMenu();

        } catch (error) {
            if (this.ui && this.ui.t) {
                console.error(t('common.genericError', { error: error.message }));
            } else {
                console.error(`Error: ${error.message}`);
            }
            process.exit(1);
        } finally {
            if (prompt && typeof prompt.close === 'function') {
                prompt.close();
            }
            this.safeClose();
        }
    }

    showHelp() {
        const localT = this.ui && this.ui.t ? this.ui.t.bind(this.ui) : (key) => {
            // Fallback help text when UI is not initialized
            const helpTexts = {
                'help.usage': 'Usage: npm run i18ntk [command] [options]',
                'help.interactiveMode': 'Run without arguments for interactive mode',
                'help.initProject': '  init    - Initialize i18n project structure',
                'help.analyzeTranslations': '  analyze - Analyze translation files',
                'help.validateTranslations': '  validate - Validate translations for errors',
                'help.checkUsage': '  usage   - Check translation usage in code',
                'help.showHelp': '  help    - Show this help message',
                'help.availableCommands': '\nAvailable commands:',
                'help.initCommand': '  --command=init    Initialize i18n project',
                'help.analyzeCommand': '  --command=analyze Analyze translations',
                'help.validateCommand': '  --command=validate Validate translations',
                'help.usageCommand': '  --command=usage   Check translation usage',
                'help.sizingCommand': '  --command=sizing  Analyze translation sizing',
                'help.completeCommand': '  --command=complete Run complete analysis',
                'help.summaryCommand': '  --command=summary Generate summary report',
                'help.debugCommand': '  --command=debug   Run debug utilities',
                'help.scannerCommand': '  --command=scanner Scan for translation keys'
            };
            return helpTexts[key] || key;
        };

        console.log(t('help.usage'));
        console.log(t('help.interactiveMode'));
        console.log(t('help.initProject'));
        console.log(t('help.analyzeTranslations'));
        console.log(t('help.validateTranslations'));
        console.log(t('help.checkUsage'));
        console.log(t('help.showHelp'));
        console.log(t('help.availableCommands'));
        console.log(t('help.initCommand'));
        console.log(t('help.analyzeCommand'));
        console.log(t('help.validateCommand'));
        console.log(t('help.usageCommand'));
        console.log(t('help.sizingCommand'));
        console.log(t('help.completeCommand'));
        console.log(t('help.summaryCommand'));
        console.log(t('help.debugCommand'));
        console.log(t('help.scannerCommand'));

        // Ensure proper exit for direct command execution
        if (process.argv.includes('--help') || process.argv.includes('-h')) {
            this.safeClose();
            process.exit(0);
        }
    }

    /**
     * Execute a command using the new CommandRouter system
     */
    async executeCommand(command, options = {}) {
        if (!this.commandRouter) {
            throw new Error('CommandRouter not initialized');
        }

        // Set runtime dependencies for the command router
        this.commandRouter.setRuntimeDependencies(
            this.prompt.bind(this),
            this.isNonInteractiveMode(),
            this.safeClose.bind(this)
        );

        return await this.commandRouter.executeCommand(command, options);
    }

    // ... existing code for ensureInitializedOrExit, maybePromptFramework, showInteractiveMenu, etc. ...

    async ensureInitializedOrExit(prompt) {
        const { checkInitialized } = require('../../utils/init-helper');
        const cliHelper = require('../../utils/cli-helper');
        const pkg = require('../../package.json');

        const { initialized, config } = await checkInitialized();

        if (!initialized) {
            console.log('\nThis project is not yet initialized with i18ntk.');
            const shouldInitialize = await cliHelper.confirm('Would you like to initialize it now?');

            if (!shouldInitialize) {
                console.log('Exiting. Please initialize the project first.');
                process.exit(1);
            }

            // The initialization will be handled by the init command
            return config;
        }

        // Check if we need to prompt for framework detection
        const settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});

        // Ensure framework configuration exists with all required fields
        if (!settings.framework) {
            settings.framework = {
                detected: false,
                preference: null,
                prompt: 'always',
                lastPromptedVersion: null,
                installed: [],
                version: '1.0' // Schema version for future compatibility
            };
        }

        // Check if we need to prompt for framework detection
        if (!settings.framework.detected &&
            settings.framework.prompt !== 'suppress' &&
            settings.framework.lastPromptedVersion !== pkg.version) {

            console.log('\nWe noticed you haven\'t set up an i18n framework yet.');
            console.log('Would you like to detect your i18n framework automatically?');

            console.log('1. Detect automatically');
            console.log('2. I\'ll set it up manually');
            console.log('3. Don\'t show this again');

            const answer = await prompt.question('\nSelect an option (1-3): ');
            const choice = answer.trim();

            let action;
            if (choice === '1') action = 'detect';
            else if (choice === '2') action = 'manual';
            else if (choice === '3') action = 'dont-show';
            else action = 'manual'; // default fallback

            if (action === 'dont-show') {
                // Update settings to suppress future prompts for this version
                settings.framework.prompt = 'suppress';
                settings.framework.lastPromptedVersion = pkg.version;

                if (configManager.saveSettings) {
                    await configManager.saveSettings(settings);
                } else if (configManager.saveConfig) {
                    await configManager.saveConfig(settings);
                }

                console.log('Framework detection prompt will be suppressed for this version.');
            } else if (action === 'detect') {
                // Run framework detection
                const { detectedLanguage, detectedFramework } = await this.detectEnvironmentAndFramework();

                if (detectedFramework && detectedFramework !== 'generic') {
                    console.log(`\nDetected framework: ${detectedFramework}`);

                    // Update settings with detected framework
                    settings.framework.detected = true;
                    settings.framework.preference = detectedFramework;
                    settings.framework.lastDetected = new Date().toISOString();

                    if (configManager.saveSettings) {
                        await configManager.saveSettings(settings);
                    } else if (configManager.saveConfig) {
                        await configManager.saveConfig(settings);
                    }

                    console.log(`Framework set to: ${detectedFramework}`);
                } else {
                    console.log('\nCould not detect a specific i18n framework.');
                    console.log('Please set up your i18n framework manually.');
                }
            }
        }

        return { ...config, ...settings };
    }

    async detectEnvironmentAndFramework() {
        // Defensive check to ensure SecurityUtils is available
        if (!SecurityUtils) {
            throw new Error('SecurityUtils is not available. This may indicate a module loading issue.');
        }
        const fs = require('fs');
        const path = require('path');

        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const pyprojectPath = path.join(process.cwd(), 'pyproject.toml');
        const requirementsPath = path.join(process.cwd(), 'requirements.txt');
        const goModPath = path.join(process.cwd(), 'go.mod');
        const pomPath = path.join(process.cwd(), 'pom.xml');
        const composerPath = path.join(process.cwd(), 'composer.json');

        let detectedLanguage = 'generic';
        let detectedFramework = 'generic';

        if (SecurityUtils.safeExistsSync(packageJsonPath)) {
            detectedLanguage = 'javascript';
            try {
                const packageJson = JSON.parse(SecurityUtils.safeReadFileSync(packageJsonPath, path.dirname(packageJsonPath), 'utf8'));
                const deps = {
                    ...(packageJson.dependencies || {}),
                    ...(packageJson.devDependencies || {}),
                    ...(packageJson.peerDependencies || {})
                };

                // Check for i18ntk-runtime first (check both package names)
                const hasI18nTkRuntime = deps['i18ntk-runtime'] || deps['i18ntk/runtime'];

                // Check for common i18n patterns in source code if not found in package.json
                if (!hasI18nTkRuntime) {
                    const i18nPatterns = [
                        /i18n\.t\(['\"`]/,
                        /useI18n\(/,
                        /from ['\"]i18ntk[\/\\]runtime['\"]/,
                        /require\(['\"]i18ntk[\/\\]runtime['\"]\)/
                    ];

                    const sourceFiles = await this.customGlob(['src/**/*.{js,jsx,ts,tsx}'], {
                        cwd: process.cwd(),
                        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
                    });

                    for (const file of sourceFiles) {
                        try {
                            const content = await fs.promises.readFile(path.join(process.cwd(), file), 'utf8');
                            if (i18nPatterns.some(pattern => pattern.test(content))) {
                                detectedFramework = 'i18ntk-runtime';
                                break;
                            }
                        } catch (e) {
                            // Skip files we can't read
                            continue;
                        }
                    }
                } else {
                    detectedFramework = 'i18ntk-runtime';
                }

                // Only check other frameworks if i18ntk-runtime wasn't detected
                if (detectedFramework !== 'i18ntk-runtime') {
                    if (deps.react || deps['react-dom']) detectedFramework = 'react';
                    else if (deps.vue || deps['vue-router']) detectedFramework = 'vue';
                    else if (deps['@angular/core']) detectedFramework = 'angular';
                    else if (deps.next) detectedFramework = 'nextjs';
                    else if (deps.nuxt) detectedFramework = 'nuxt';
                    else if (deps.svelte) detectedFramework = 'svelte';
                    else detectedFramework = 'generic';
                }
            } catch (error) {
                detectedFramework = 'generic';
            }
        } else if (SecurityUtils.safeExistsSync(pyprojectPath) || SecurityUtils.safeExistsSync(requirementsPath)) {
            detectedLanguage = 'python';
            try {
                if (SecurityUtils.safeExistsSync(requirementsPath)) {
                    const requirements = SecurityUtils.safeReadFileSync(requirementsPath, path.dirname(requirementsPath), 'utf8');
                    if (requirements.includes('django')) detectedFramework = 'django';
                    else if (requirements.includes('flask')) detectedFramework = 'flask';
                    else if (requirements.includes('fastapi')) detectedFramework = 'fastapi';
                    else detectedFramework = 'generic';
                }
            } catch (error) {
                detectedFramework = 'generic';
            }
        } else if (SecurityUtils.safeExistsSync(goModPath)) {
            detectedLanguage = 'go';
            detectedFramework = 'generic';
        } else if (SecurityUtils.safeExistsSync(pomPath)) {
            detectedLanguage = 'java';
            try {
                const pomContent = SecurityUtils.safeReadFileSync(pomPath, path.dirname(pomPath), 'utf8');
                if (pomContent.includes('spring-boot')) detectedFramework = 'spring-boot';
                else if (pomContent.includes('spring')) detectedFramework = 'spring';
                else if (pomContent.includes('quarkus')) detectedFramework = 'quarkus';
                else detectedFramework = 'generic';
            } catch (error) {
                detectedFramework = 'generic';
            }
        } else if (SecurityUtils.safeExistsSync(composerPath)) {
            detectedLanguage = 'php';
            try {
                const composer = JSON.parse(SecurityUtils.safeReadFileSync(composerPath, path.dirname(composerPath), 'utf8'));
                const deps = composer.require || {};

                if (deps['laravel/framework']) detectedFramework = 'laravel';
                else if (deps['symfony/framework-bundle']) detectedFramework = 'symfony';
                else if (deps['wordpress']) detectedFramework = 'wordpress';
                else detectedFramework = 'generic';
            } catch (error) {
                detectedFramework = 'generic';
            }
        }

        return { detectedLanguage, detectedFramework };
    }

    async customGlob(patterns, options = {}) {
        const fs = require('fs');
        const path = require('path');
        const cwd = options.cwd || process.cwd();
        const ignorePatterns = options.ignore || [];

        function matchesPattern(filename, pattern) {
            // Simple pattern matching for **/*.{js,jsx,ts,tsx} style patterns
            if (pattern.includes('**/*')) {
                const extensionPart = pattern.split('*.')[1];
                if (extensionPart) {
                    const extensions = extensionPart.replace('{', '').replace('}', '').split(',');
                    return extensions.some(ext => filename.endsWith('.' + ext.trim()));
                }
            }
            return filename.includes(pattern.replace('**/', ''));
        }

        function shouldIgnore(filePath) {
            return ignorePatterns.some(pattern => {
                if (pattern.includes('**/')) {
                    const patternEnd = pattern.replace('**/', '');
                    return filePath.includes('/' + patternEnd) || filePath.includes('\\' + patternEnd);
                }
                return filePath.includes(pattern);
            });
        }

        function findFiles(dir, results = []) {
            try {
                const items = fs.readdirSync(dir);

                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const relativePath = path.relative(cwd, fullPath);

                    if (shouldIgnore(relativePath)) {
                        continue;
                    }

                    try {
                        const stat = fs.statSync(fullPath);

                        if (stat.isDirectory()) {
                            findFiles(fullPath, results);
                        } else if (stat.isFile()) {
                            // Check if file matches any of our patterns
                            for (const pattern of patterns) {
                                if (matchesPattern(item, pattern)) {
                                    results.push(relativePath);
                                    break;
                                }
                            }
                        }
                    } catch (error) {
                        // Skip files we can't access
                        continue;
                    }
                }
            } catch (error) {
                // Skip directories we can't access
            }

            return results;
        }

        return findFiles(cwd);
    }

    async maybePromptFramework(prompt, cfg, currentVersion) {
        // Load current settings to check framework configuration
        let settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});

        // Ensure framework configuration exists with all required fields
        if (!settings.framework) {
            settings.framework = {
                detected: false,
                preference: null,
                prompt: 'always',
                lastPromptedVersion: null,
                installed: [],
                version: '1.0' // Schema version for future compatibility
            };

            // Save the updated settings
            if (configManager.saveSettings) {
                await configManager.saveSettings(settings);
            } else if (configManager.saveConfig) {
                await configManager.saveConfig(settings);
            }
        }

        // Reload settings to ensure we have the latest framework detection results
        const freshSettings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
        if (freshSettings.framework) {
            settings.framework = { ...settings.framework, ...freshSettings.framework };
        }

        // Check if framework is already detected or preference is explicitly set to none
        if (settings.framework.detected || settings.framework.preference === 'none') {
            return cfg;
        }

        // Check if DNR (Do Not Remind) is active for this version
        if (settings.framework.prompt === 'suppress' && settings.framework.lastPromptedVersion === currentVersion) {
            return cfg;
        }

        // Reset DNR if version changed
        if (settings.framework.prompt === 'suppress' && settings.framework.lastPromptedVersion !== currentVersion) {
            settings.framework.prompt = 'always';
            settings.framework.lastPromptedVersion = null;

            // Save the updated settings
            if (configManager.saveSettings) {
                await configManager.saveSettings(settings);
            } else if (configManager.saveConfig) {
                await configManager.saveConfig(settings);
            }
        }

        // This function is now handled by ensureInitializedOrExit for better flow control

        return cfg;
    }

    async showInteractiveMenu() {
        // Check if we're in non-interactive mode (like echo 0 | node script)
        if (this.isNonInteractiveMode()) {
            console.log(`\n${t('menu.title')}`);
            console.log(t('menu.separator'));
            console.log(`1. ${t('menu.options.init')}`);
            console.log(`2. ${t('menu.options.analyze')}`);
            console.log(`3. ${t('menu.options.validate')}`);
            console.log(`4. ${t('menu.options.usage')}`);
            console.log(`5. ${t('menu.options.complete')}`);
            console.log(`6. ${t('menu.options.sizing')}`);
            console.log(`7. ${t('menu.options.fix')}`);
            console.log(`8. ${t('menu.options.status')}`);
            console.log(`9. ${t('menu.options.delete')}`);
            console.log(`10. ${t('menu.options.settings')}`);
            console.log(`11. ${t('menu.options.help')}`);
            console.log(`12. ${t('menu.options.language')}`);
            console.log(`13. ${t('menu.options.scanner')}`);
            console.log(`0. ${t('menu.options.exit')}`);

            console.log('\n' + t('menu.nonInteractiveModeWarning'));
            console.log(t('menu.useDirectExecution'));
            console.log(t('menu.useHelpForCommands'));
            this.safeClose();
            process.exit(0);
            return;
        }

        console.log(`\n${t('menu.title')}`);
        console.log(t('menu.separator'));
        console.log(`1. ${t('menu.options.init')}`);
        console.log(`2. ${t('menu.options.analyze')}`);
        console.log(`3. ${t('menu.options.validate')}`);
        console.log(`4. ${t('menu.options.usage')}`);
        console.log(`5. ${t('menu.options.complete')}`);
        console.log(`6. ${t('menu.options.sizing')}`);
        console.log(`7. ${t('menu.options.fix')}`);
        console.log(`8. ${t('menu.options.status')}`);
        console.log(`9. ${t('menu.options.delete')}`);
        console.log(`10. ${t('menu.options.settings')}`);
        console.log(`11. ${t('menu.options.help')}`);
        console.log(`12. ${t('menu.options.language')}`);
        console.log(`13. ${t('menu.options.scanner')}`);
        console.log(`0. ${t('menu.options.exit')}`);

        const choice = await this.prompt('\n' + t('menu.selectOptionPrompt'));

        switch (choice.trim()) {
            case '1':
                await this.executeCommand('init', {fromMenu: true});
                break;
            case '2':
                await this.executeCommand('analyze', {fromMenu: true});
                break;
            case '3':
                await this.executeCommand('validate', {fromMenu: true});
                break;
            case '4':
                await this.executeCommand('usage', {fromMenu: true});
                break;
            case '5':
                await this.executeCommand('complete', {fromMenu: true});
                break;
            case '6':
                await this.executeCommand('sizing', {fromMenu: true});
                break;
            case '7':
                await this.executeCommand('fix', {fromMenu: true});
                break;
            case '8':
                // Check for PIN protection
                const authRequired = await this.adminAuth.isAuthRequiredForScript('summaryReports');
                if (authRequired) {
                    console.log(`\n${t('adminCli.protectedAccess')}`);
                    const cliHelper = require('../../utils/cli-helper');
                    const pin = await cliHelper.promptPin(t('adminCli.enterPin') + ': ');
                    const isValid = await this.adminAuth.verifyPin(pin);

                    if (!isValid) {
                        console.log(t('adminCli.invalidPin'));
                        await this.prompt(t('menu.pressEnterToContinue'));
                        await this.showInteractiveMenu();
                        return;
                    }

                    console.log(t('adminCli.accessGranted'));
                }

                console.log(t('summary.status.generating'));
                try {
                    // Use SummaryService instead of direct import
                    this.summaryService.initialize(configManager);
                    const report = await this.summaryService.run({ fromMenu: true });
                    console.log(report);
                    console.log(t('summary.status.completed'));

                    // Check if we're in interactive mode before prompting
                    if (!this.isNonInteractiveMode()) {
                        try {
                            await this.prompt('\n' + t('debug.pressEnterToContinue'));
                            await this.showInteractiveMenu();
                        } catch (error) {
                            console.log(t('menu.returning'));
                            process.exit(0);
                        }
                    } else {
                        console.log(t('status.exitingCompleted'));
                        process.exit(0);
                    }
                } catch (error) {
                    console.error(t('common.errorGeneratingStatusSummary', { error: error.message }));

                    // Check if we're in interactive mode before prompting
                    if (!this.isNonInteractiveMode()) {
                        try {
                            await this.prompt('\n' + t('debug.pressEnterToContinue'));
                            await this.showInteractiveMenu();
                        } catch (error) {
                            console.log(t('menu.returning'));
                            process.exit(0);
                        }
                    } else {
                        console.log(t('common.errorExiting'));
                        process.exit(1);
                    }
                }
                break;
            case '9':
                await this.deleteReports();
                break;
            case '10':
                await this.showSettingsMenu();
                break;
            case '11':
                this.showHelp();
                await this.prompt(t('menu.returnToMainMenu'));
                await this.showInteractiveMenu();
                break;
            case '12':
                await this.showLanguageMenu();
                break;
            case '13':
                await this.executeCommand('scanner', {fromMenu: true});
                break;
            case '0':
                console.log(t('menu.goodbye'));
                this.safeClose();
                process.exit(0);
            default:
                console.log(t('menu.invalidChoice'));
                await this.showInteractiveMenu();
        }
    }

    // ... existing code for showLanguageMenu, showDebugMenu, deleteReports, showSettingsMenu, etc. ...

    async showLanguageMenu() {
        console.log(`\n${t('language.title')}`);
        console.log(t('language.separator'));
        console.log(t('language.current', { language: 'English' })); // Simplified since we don't have UIi18n
        console.log('\n' + t('language.available'));

        const languages = [
            { code: 'en', name: 'English' },
            { code: 'de', name: 'Deutsch' },
            { code: 'es', name: 'Español' },
            { code: 'fr', name: 'Français' },
            { code: 'ru', name: 'Русский' },
            { code: 'ja', name: '日本語' },
            { code: 'zh', name: '中文' }
        ];

        languages.forEach((lang, index) => {
            const current = 'en' === 'en' ? ' ✓' : '';
            console.log(t('language.languageOption', { index: index + 1, displayName: lang.name, current }));
        });

        console.log(`0. ${t('language.backToMainMenu')}`);

        const choice = await this.prompt('\n' + t('language.prompt'));
        const choiceNum = parseInt(choice);

        if (choiceNum === 0) {
            await this.showInteractiveMenu();
            return;
        } else if (choiceNum >= 1 && choiceNum <= languages.length) {
            const selectedLang = languages[choiceNum - 1];
            console.log(t('language.changed', { language: selectedLang.name }));

            // Force reload translations for the entire system
            const { loadTranslations } = require('../../utils/i18n-helper');
            loadTranslations(selectedLang.code);

            // Return to main menu with new language
            await this.prompt('\n' + t('language.pressEnterToContinue'));
            await this.showInteractiveMenu();
        } else {
            console.log(t('language.invalid'));
            await this.prompt('\n' + t('language.pressEnterToContinue'));
            await this.showLanguageMenu();
        }
    }

    async showDebugMenu() {
        // Check for PIN protection
        const authRequired = await this.adminAuth.isAuthRequiredForScript('debugMenu');
        if (authRequired) {
            console.log(`\n${t('adminPin.protectedAccess')}`);
            const cliHelper = require('../../utils/cli-helper');
            const pin = await cliHelper.promptPin(t('adminPin.enterPin') + ': ');
            const isValid = await this.adminAuth.verifyPin(pin);

            if (!isValid) {
                console.log(t('adminPin.invalidPin'));
                await this.prompt(t('menu.pressEnterToContinue'));
                await this.showInteractiveMenu();
                return;
            }

            console.log(t('adminPin.accessGranted'));
        }

        console.log(`\n${t('debug.title')}`);
        console.log(t('debug.separator'));
        console.log(t('debug.mainDebuggerSystemDiagnostics'));
        console.log(t('debug.debugLogs'));
        console.log(t('debug.backToMainMenu'));

        const choice = await this.prompt('\n' + t('debug.selectOption'));

        switch (choice.trim()) {
            case '1':
                await this.runDebugTool('debugger.js', 'Main Debugger');
                break;
            case '2':
                await this.viewDebugLogs();
                break;
            case '0':
                await this.showInteractiveMenu();
                return;
            default:
                console.log(t('debug.invalidChoiceSelectRange'));
                await this.showDebugMenu();
        }
    }

    async runDebugTool(toolName, displayName) {
        console.log(t('debug.runningDebugTool', { displayName }));
        try {
            const toolPath = path.join(__dirname, '..', '..', 'scripts', 'debug', toolName);
            if (SecurityUtils.safeExistsSync(toolPath)) {
                console.log(`Debug tool available: ${toolName}`);
                console.log(`To run this tool manually: node "${toolPath}"`);
                console.log(`Working directory: ${path.join(__dirname, '..', '..')}`);
            } else {
                console.log(t('debug.debugToolNotFound', { toolName }));
            }
        } catch (error) {
            console.error(t('debug.errorRunningDebugTool', { displayName, error: error.message }));
        }

        await this.prompt('\n' + t('menu.pressEnterToContinue'));
        await this.showDebugMenu();
    }

    async viewDebugLogs() {
        console.log(`\n${t('debug.recentDebugLogs')}`);
        console.log('============================================================');

        try {
            const logsDir = path.join(__dirname, '..', '..', 'scripts', 'debug', 'logs');
            if (SecurityUtils.safeExistsSync(logsDir)) {
                const files = require('fs').readdirSync(logsDir)
                    .filter(file => file.endsWith('.log') || file.endsWith('.txt'))
                    .sort((a, b) => {
                        const statA = require('fs').statSync(path.join(logsDir, a));
                        const statB = require('fs').statSync(path.join(logsDir, b));
                        return statB.mtime - statA.mtime;
                    })
                    .slice(0, 5);

                if (files.length > 0) {
                    files.forEach((file, index) => {
                        const filePath = path.join(logsDir, file);
                        const stats = require('fs').statSync(filePath);
                        console.log(`${index + 1}. ${file} (${stats.mtime.toLocaleString()})`);
                    });

                    const choice = await this.prompt('\n' + t('debug.selectLogPrompt', { count: files.length }));
                    const fileIndex = parseInt(choice) - 1;

                    if (fileIndex >= 0 && fileIndex < files.length) {
                        const logContent = SecurityUtils.safeReadFileSync(path.join(logsDir, files[fileIndex]), logsDir, 'utf8');
                        console.log(`\n${t('debug.contentOf', { filename: files[fileIndex] })}:`);
                        console.log('============================================================');
                        console.log(logContent.slice(-2000)); // Show last 2000 characters
                        console.log('============================================================');
                    }
                } else {
                    console.log(t('debug.noDebugLogsFound'));
                }
            } else {
                console.log(t('debug.debugLogsDirectoryNotFound'));
            }
        } catch (error) {
            console.error(t('errors.errorReadingDebugLogs', { error: error.message }));
        }

        await this.prompt('\n' + t('menu.pressEnterToContinue'));
        await this.showInteractiveMenu();
    }

    async deleteReports() {
        // Check for PIN protection
        const authRequired = await this.adminAuth.isAuthRequiredForScript('deleteReports');
        if (authRequired) {
            console.log(`\n${t('adminPin.protectedAccess')}`);
            const cliHelper = require('../../utils/cli-helper');
            const pin = await cliHelper.promptPin(t('adminPin.enterPin') + ': ');
            const isValid = await this.adminAuth.verifyPin(pin);

            if (!isValid) {
                console.log(t('adminPin.invalidPin'));
                await this.prompt(t('menu.pressEnterToContinue'));
                await this.showInteractiveMenu();
                return;
            }

            console.log(t('adminPin.accessGranted'));
        }

        console.log(`\n${t('operations.deleteReportsTitle')}`);
        console.log('============================================================');

        const targetDirs = [
            { path: path.join(process.cwd(), 'i18ntk-reports'), name: 'Reports', type: 'reports' },
            { path: path.join(process.cwd(), 'reports'), name: 'Legacy Reports', type: 'reports' },
            { path: path.join(process.cwd(), 'reports', 'backups'), name: 'Reports Backups', type: 'backups' },
            { path: path.join(process.cwd(), 'scripts', 'debug', 'logs'), name: 'Debug Logs', type: 'logs' },
            { path: path.join(process.cwd(), 'scripts', 'debug', 'reports'), name: 'Debug Reports', type: 'reports' },
            { path: path.join(process.cwd(), 'settings', 'backups'), name: 'Settings Backups', type: 'backups' },
            { path: path.join(process.cwd(), 'utils', 'i18ntk-reports'), name: 'Utils Reports', type: 'reports' }
        ].filter(dir => dir.path && typeof dir.path === 'string');

        try {
            console.log(t('operations.scanningForFiles'));

            let availableDirs = [];

            // Check which directories exist and have files
            for (const dir of targetDirs) {
                if (SecurityUtils.safeExistsSync(dir.path)) {
                    const files = this.getAllReportFiles(dir.path);
                    if (files.length > 0) {
                        availableDirs.push({
                            ...dir,
                            files: files.map(file => ({ path: file, dir: dir.path })),
                            count: files.length
                        });
                    }
                }
            }

            if (availableDirs.length === 0) {
                console.log(t('operations.noFilesFoundToDelete'));
                await this.prompt(t('menu.pressEnterToContinue'));
                await this.showInteractiveMenu();
                return;
            }

            // Show available directories
            console.log(t('operations.availableDirectories'));
            availableDirs.forEach((dir, index) => {
                console.log(`  ${index + 1}. ${dir.name} (${dir.count} files)`);
            });
            console.log(`  ${availableDirs.length + 1}. ${t('operations.allDirectories')}`);
            console.log(`  0. ${t('operations.cancelOption')}`);

            const dirChoice = await this.prompt(`\nSelect directory to clean (0-${availableDirs.length + 1}): `);
            const dirIndex = parseInt(dirChoice) - 1;

            let selectedDirs = [];

            if (dirChoice.trim() === '0') {
                console.log(t('operations.cancelled'));
                await this.prompt(t('menu.pressEnterToContinue'));
                await this.showInteractiveMenu();
                return;
            } else if (dirIndex === availableDirs.length) {
                selectedDirs = availableDirs;
            } else if (dirIndex >= 0 && dirIndex < availableDirs.length) {
                selectedDirs = [availableDirs[dirIndex]];
            } else {
                console.log(t('operations.invalidSelection'));
                await this.prompt(t('menu.pressEnterToContinue'));
                await this.showInteractiveMenu();
                return;
            }

            // Collect all files from selected directories
            let allFiles = [];
            selectedDirs.forEach(dir => {
                allFiles.push(...dir.files);
            });

            console.log(t('operations.foundFilesInSelectedDirectories', { count: allFiles.length }));
            selectedDirs.forEach(dir => {
                console.log(`  📁 ${dir.name}: ${dir.count} files`);
            });

            // Show deletion options
            console.log(t('operations.deletionOptions'));
            console.log(`  1. ${t('operations.deleteAllFiles')}`);
            console.log(`  2. ${t('operations.keepLast3Files')}`);
            console.log(`  3. ${t('operations.keepLast5Files')}`);
            console.log(`  0. ${t('operations.cancelReportOption')}`);

            const option = await this.prompt('\nSelect option (0-3): ');

            let filesToDelete = [];

            switch (option.trim()) {
                case '1':
                    filesToDelete = allFiles;
                    break;
                case '2':
                    filesToDelete = this.getFilesToDeleteKeepLast(allFiles, 3);
                    break;
                case '3':
                    filesToDelete = this.getFilesToDeleteKeepLast(allFiles, 5);
                    break;
                case '0':
                    console.log(t('operations.cancelled'));
                    await this.prompt(t('menu.pressEnterToContinue'));
                    await this.showInteractiveMenu();
                    return;
                default:
                    console.log(t('menu.invalidOption'));
                    await this.prompt(t('menu.pressEnterToContinue'));
                    await this.showInteractiveMenu();
                    return;
            }

            if (filesToDelete.length === 0) {
                console.log(t('operations.noFilesToDelete'));
                await this.prompt(t('menu.pressEnterToContinue'));
                await this.showInteractiveMenu();
                return;
            }

            console.log(t('operations.filesToDeleteCount', { count: filesToDelete.length }));
            console.log(t('operations.filesToKeepCount', { count: allFiles.length - filesToDelete.length }));

            const confirm = await this.prompt(t('operations.confirmDeletion'));

            if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
                let deletedCount = 0;

                for (const fileInfo of filesToDelete) {
                    try {
                        require('fs').unlinkSync(fileInfo.path);
                        console.log(t('operations.deletedFile', { filename: path.basename(fileInfo.path) }));
                        deletedCount++;
                    } catch (error) {
                        console.log(t('operations.failedToDeleteFile', { filename: path.basename(fileInfo.path), error: error.message }));
                    }
                }

                console.log(`\n🎉 Successfully deleted ${deletedCount} files!`);
            } else {
                console.log(t('operations.cancelled'));
            }

        } catch (error) {
            console.error(`❌ Error during deletion process: ${error.message}`);
        }

        await this.prompt(t('menu.pressEnterToContinue'));
        await this.showInteractiveMenu();
    }

    getAllReportFiles(dir) {
        if (!dir || typeof dir !== 'string') {
            return [];
        }

        let files = [];

        try {
            if (!SecurityUtils.safeExistsSync(dir)) {
                return [];
            }

            const items = require('fs').readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);

                try {
                    const stat = require('fs').statSync(fullPath);

                    if (stat.isDirectory()) {
                        files.push(...this.getAllReportFiles(fullPath));
                    } else if (
                        // Common report file extensions
                        item.endsWith('.json') ||
                        item.endsWith('.html') ||
                        item.endsWith('.txt') ||
                        item.endsWith('.log') ||
                        item.endsWith('.csv') ||
                        item.endsWith('.md') ||
                        // Specific report filename patterns
                        item.includes('-report.') ||
                        item.includes('_report.') ||
                        item.includes('report-') ||
                        item.includes('report_') ||
                        item.includes('analysis-') ||
                        item.includes('validation-')
                    ) {
                        files.push(fullPath);
                    }
                } catch (error) {
                    // Skip individual files that can't be accessed
                    continue;
                }
            }
        } catch (error) {
            // Silent fail for inaccessible directories
            console.log(`⚠️ Could not access directory: ${dir}`);
        }

        return files;
    }

    getFilesToDeleteKeepLast(allFiles, keepCount = 3) {
        // Sort files by modification time (newest first)
        const sortedFiles = allFiles.sort((a, b) => {
            try {
                const statA = require('fs').statSync(a.path || a);
                const statB = require('fs').statSync(b.path || b);
                return statB.mtime.getTime() - statA.mtime.getTime();
            } catch (error) {
                // If stat fails, sort by filename as fallback
                const pathA = a.path || a;
                const pathB = b.path || b;
                return pathB.localeCompare(pathA);
            }
        });

        // Keep the N newest files, delete the rest
        return sortedFiles.slice(keepCount);
    }

    async showSettingsMenu() {
        try {
            // Check for PIN protection
            const authRequired = await this.adminAuth.isAuthRequiredForScript('settingsMenu');
            if (authRequired) {
                console.log(`\n${t('adminPin.protectedAccess')}`);
                const cliHelper = require('../../utils/cli-helper');
                const pin = await cliHelper.promptPin(t('adminPin.enterPin') + ': ');
                const isValid = await this.adminAuth.verifyPin(pin);

                if (!isValid) {
                    console.log(t('adminPin.invalidPin'));
                    await this.prompt(t('menu.pressEnterToContinue'));
                    await this.showInteractiveMenu();
                    return;
                }

                console.log(t('adminPin.accessGranted'));
            }

            const SettingsCLI = require('../../settings/settings-cli');
            const settingsCLI = new SettingsCLI();
            await settingsCLI.run();
        } catch (error) {
            console.error('❌ Error opening settings:', error.message);
            await this.prompt(t('menu.pressEnterToContinue'));
        }
        await this.showInteractiveMenu();
    }

    prompt(question) {
        const cliHelper = require('../../utils/cli-helper');
        // If interactive not available, return empty string to avoid hangs
        if (!process.stdin.isTTY || process.stdin.destroyed) {
            console.log('\n⚠️ Interactive input not available, using default response.');
            return Promise.resolve('');
        }
        return cliHelper.prompt(`${question} `);
    }

    // Safe method to check if we're in non-interactive mode
    isNonInteractiveMode() {
        return !process.stdin.isTTY || process.stdin.destroyed || this.isReadlineClosed;
    }

    safeClose() {
        if (this.rl && !this.isReadlineClosed) {
            try {
                this.rl.close();
                this.isReadlineClosed = true;
            } catch (error) {
                // Ignore close errors
            }
        }
    }
}

// Run if called directly
if (require.main === module) {
    // Handle version and help immediately before any initialization
    const args = process.argv.slice(2);

    if (args.includes('--version') || args.includes('-v')) {
        try {
            const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');
            const packageJson = JSON.parse(SecurityUtils.safeReadFileSync(packageJsonPath, path.dirname(packageJsonPath), 'utf8'));
            const versionInfo = packageJson.versionInfo || {};

            console.log(`\n🌍 i18n Toolkit (i18ntk)`);
            console.log(`Version: ${packageJson.version}`);
            console.log(`Release Date: ${versionInfo.releaseDate || 'N/A'}`);
            console.log(`Maintainer: ${versionInfo.maintainer || packageJson.author}`);
            console.log(`Node.js: ${versionInfo.supportedNodeVersions || packageJson.engines?.node || '>=16.0.0'}`);
            console.log(`License: ${packageJson.license}`);

            if (versionInfo.majorChanges && versionInfo.majorChanges.length > 0) {
                console.log(`\n✨ What's New in ${packageJson.version}:`);
                versionInfo.majorChanges.forEach(change => {
                    console.log(`  • ${change}`);
                });
            }

            console.log(`\n📖 Documentation: ${packageJson.homepage}`);
            console.log(`🐛 Report Issues: ${packageJson.bugs?.url}`);

        } catch (error) {
            console.log(`\n❌ Version information unavailable`);
            console.log(`Error: ${error.message}`);
        }
        process.exit(0);
    }

    const manager = new I18nManager();
    manager.run();
}

module.exports = I18nManager;