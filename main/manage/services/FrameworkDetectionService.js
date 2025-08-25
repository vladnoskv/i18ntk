/**
 * Framework Detection Service
 * Handles framework detection, i18n directory detection, and framework suggestions
 * @module services/FrameworkDetectionService
 */

const path = require('path');
const fs = require('fs');
const SecurityUtils = require('../../../utils/security');

module.exports = class FrameworkDetectionService {
  constructor(config = {}) {
    this.config = config;
    this.settings = null;
    this.configManager = null;
  }

  /**
   * Initialize the service with required dependencies
   * @param {Object} configManager - Configuration manager instance
   */
  initialize(configManager) {
    this.configManager = configManager;
    this.settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
  }

  /**
   * Detect environment and framework from project structure
   * @returns {Promise<Object>} Object with detectedLanguage and detectedFramework
   */
  async detectEnvironmentAndFramework() {
    // Defensive check to ensure SecurityUtils is available
    if (!SecurityUtils) {
      throw new Error('SecurityUtils is not available. This may indicate a module loading issue.');
    }

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

  /**
   * Get framework suggestions for a given language
   * @param {string} language - The programming language
   * @returns {Array} Array of framework suggestions with name and description
   */
  getFrameworkSuggestions(language) {
    const suggestions = {
      javascript: [
        { name: 'i18next', description: 'Feature-rich i18n framework for JavaScript' },
        { name: 'react-i18next', description: 'React integration for i18next' },
        { name: 'vue-i18n', description: 'Vue.js i18n plugin' },
        { name: 'Angular i18n', description: 'Built-in Angular i18n' }
      ],
      typescript: [
        { name: 'i18next', description: 'TypeScript-first i18n framework' },
        { name: 'react-i18next', description: 'React + TypeScript integration' },
        { name: 'vue-i18n', description: 'Vue.js i18n with TypeScript support' }
      ],
      python: [
        { name: 'Django i18n', description: 'Built-in Django internationalization' },
        { name: 'Flask-Babel', description: 'Babel integration for Flask' },
        { name: 'FastAPI i18n', description: 'i18n middleware for FastAPI' }
      ],
      java: [
        { name: 'Spring i18n', description: 'Spring Framework internationalization' },
        { name: 'Spring Boot i18n', description: 'Spring Boot auto-configuration' },
        { name: 'Quarkus i18n', description: 'Quarkus internationalization support' }
      ],
      go: [
        { name: 'go-i18n', description: 'Go i18n library with pluralization' },
        { name: 'nicksnyder/go-i18n', description: 'Feature-rich Go i18n' }
      ],
      php: [
        { name: 'Laravel i18n', description: 'Built-in Laravel localization' },
        { name: 'Symfony Translation', description: 'Symfony translation component' },
        { name: 'WordPress i18n', description: 'WordPress localization functions' }
      ]
    };

    return suggestions[language] || suggestions.javascript;
  }

  /**
   * Handle framework detection and prompting logic
   * @param {Object} prompt - Prompt interface for user interaction
   * @param {Object} cfg - Configuration object
   * @param {string} currentVersion - Current version of the tool
   * @returns {Promise<Object>} Updated configuration
   */
  async maybePromptFramework(prompt, cfg, currentVersion) {
    // Load current settings to check framework configuration
    let settings = this.settings || (this.configManager.loadSettings ? this.configManager.loadSettings() : (this.configManager.getConfig ? this.configManager.getConfig() : {}));

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
      if (this.configManager.saveSettings) {
        await this.configManager.saveSettings(settings);
      } else if (this.configManager.saveConfig) {
        await this.configManager.saveConfig(settings);
      }
    }

    // Reload settings to ensure we have the latest framework detection results
    const freshSettings = this.configManager.loadSettings ? this.configManager.loadSettings() : (this.configManager.getConfig ? this.configManager.getConfig() : {});
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
      if (this.configManager.saveSettings) {
        await this.configManager.saveSettings(settings);
      } else if (this.configManager.saveConfig) {
        await this.configManager.saveConfig(settings);
      }
    }

    // This function is now handled by ensureInitializedOrExit for better flow control
    return cfg;
  }

  /**
   * Auto-detect i18n directory from common locations only if not configured in settings
   * @returns {Object} Updated configuration with detected i18n directory
   */
  detectI18nDirectory() {
    const settings = this.settings || (this.configManager.loadSettings ? this.configManager.loadSettings() : (this.configManager.getConfig ? this.configManager.getConfig() : {}));
    const projectRoot = path.resolve(settings.projectRoot || this.config.projectRoot || '.');
    const fs = require('fs');

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
          const items = fs.readdirSync(resolvedPath);
          const hasLanguageDirs = items.some(item => {
            const itemPath = path.join(resolvedPath, item);
            return fs.statSync(itemPath).isDirectory() &&
                   ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'].includes(item);
          });

          if (hasLanguageDirs) {
            this.config.sourceDir = possiblePath;
            // Note: Translation function would need to be injected
            // t('init.autoDetectedI18nDirectory', { path: possiblePath });
            break;
          }
        } catch (error) {
          // Continue checking other paths
        }
      }
    }
  }

  /**
   * Check if i18n framework is installed - configuration-based check without prompts
   * @param {Object} ui - UI instance for translations (optional)
   * @returns {Promise<boolean>} True if frameworks detected, false otherwise
   */
  async checkI18nDependencies(ui = null) {
    const packageJsonPath = path.resolve('./package.json');

    if (!SecurityUtils.safeExistsSync(packageJsonPath)) {
      if (ui && ui.t) {
        console.log(ui.t('errors.noPackageJson'));
      } else {
        console.log('No package.json found');
      }
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
        if (ui && ui.t) {
          console.log(ui.t('init.detectedFrameworks', { frameworks: installedFrameworks.join(', ') }));
        } else {
          console.log(`Detected frameworks: ${installedFrameworks.join(', ')}`);
        }
        const cfg = this.settings || (this.configManager.loadSettings ? this.configManager.loadSettings() : (this.configManager.getConfig ? this.configManager.getConfig() : {}));
        cfg.framework = cfg.framework || {};
        cfg.framework.detected = true;
        cfg.framework.installed = installedFrameworks;
        if (this.configManager.saveSettings) {
          this.configManager.saveSettings(cfg);
        } else if (this.configManager.saveConfig) {
          this.configManager.saveConfig(cfg);
        }
        return true;
      } else {
        const cfg = this.settings || (this.configManager.loadSettings ? this.configManager.loadSettings() : (this.configManager.getConfig ? this.configManager.getConfig() : {}));
        if (cfg.framework) {
          cfg.framework.detected = false;
          if (this.configManager.saveSettings) {
            this.configManager.saveSettings(cfg);
          } else if (this.configManager.saveConfig) {
            this.configManager.saveConfig(cfg);
          }
        }
        // Always signal that frameworks were not detected
        return false;
      }
    } catch (error) {
      // Note: Translation function would need to be injected
      // console.log(t('init.errors.packageJsonRead'));
      console.log('Error reading package.json');
      return false; // Treat as no framework detected on error
    }
  }

  /**
   * Custom glob implementation using Node.js built-in modules (zero dependencies)
   * @param {string[]} patterns - Array of glob patterns
   * @param {Object} options - Options object with cwd and ignore properties
   * @returns {Promise<string[]>} Array of matching file paths
   */
  async customGlob(patterns, options = {}) {
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
};