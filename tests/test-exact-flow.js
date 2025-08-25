#!/usr/bin/env node

console.log('🔍 DEBUG: Testing exact i18ntk-manage.js execution flow...');

try {
  console.log('🔍 DEBUG: Step 1: Loading all imports in exact order from i18ntk-manage.js...');

  // Exact imports from main/i18ntk-manage.js lines 21-44
  const path = require('path');
  const UIi18n = require('../main/i18ntk-ui');
  const AdminAuth = require('../utils/admin-auth');
  const SecurityUtils = require('../utils/security'); // Line 24

  const AdminCLI = require('../utils/admin-cli');
  const configManager = require('../settings/settings-manager');
  const { showFrameworkWarningOnce } = require('../utils/cli-helper');
  const I18nInitializer = require('../main/i18ntk-init');
  const { I18nAnalyzer } = require('../main/i18ntk-analyze');
  const I18nValidator = require('../main/i18ntk-validate');
  const I18nUsageAnalyzer = require('../main/i18ntk-usage');
  const I18nSizingAnalyzer = require('../main/i18ntk-sizing');
  const I18nFixer = require('../main/i18ntk-fixer');
  const SettingsCLI = require('../settings/settings-cli');
  const { createPrompt, isInteractive } = require('../utils/prompt-helper');
  const { loadTranslations, t, refreshLanguageFromSettings} = require('../utils/i18n-helper'); // Line 39

  // Preload translations early to avoid missing key warnings (Line 40)
  loadTranslations();

  const cliHelper = require('../utils/cli-helper');
  const { loadConfig, saveConfig, ensureConfigDefaults } = require('../utils/config');
  const pkg = require('../package.json');
  const SetupEnforcer = require('../utils/setup-enforcer');

  console.log('✅ All imports loaded successfully');
  console.log('✅ SecurityUtils type:', typeof SecurityUtils);
  console.log('✅ SecurityUtils.safeExistsSync:', typeof SecurityUtils.safeExistsSync);

  console.log('🔍 DEBUG: Step 2: Testing SecurityUtils in detectEnvironmentAndFramework...');

  // Test the exact detectEnvironmentAndFramework function from lines 232-346
  async function detectEnvironmentAndFramework() {
    const fs = require('fs');
    const SecurityUtils = require('../utils/security'); // Line 235 - this is the potential issue

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const pyprojectPath = path.join(process.cwd(), 'pyproject.toml');
    const requirementsPath = path.join(process.cwd(), 'requirements.txt');
    const goModPath = path.join(process.cwd(), 'go.mod');
    const pomPath = path.join(process.cwd(), 'pom.xml');
    const composerPath = path.join(process.cwd(), 'composer.json');

    let detectedLanguage = 'generic';
    let detectedFramework = 'generic';

    console.log('🔍 DEBUG: In detectEnvironmentAndFramework...');
    console.log('🔍 DEBUG: SecurityUtils type:', typeof SecurityUtils);

    if (SecurityUtils.safeExistsSync(packageJsonPath)) {
      console.log('✅ SecurityUtils.safeExistsSync works');
      detectedLanguage = 'javascript';
      try {
        const packageJson = JSON.parse(SecurityUtils.safeReadFileSync(packageJsonPath, path.dirname(packageJsonPath), 'utf8'));
        console.log('✅ SecurityUtils.safeReadFileSync works');

        const deps = {
          ...(packageJson.dependencies || {}),
          ...(packageJson.devDependencies || {}),
          ...(packageJson.peerDependencies || {})
        };

        // Check for i18ntk-runtime first
        const hasI18nTkRuntime = deps['i18ntk-runtime'] || deps['i18ntk/runtime'];

        if (!hasI18nTkRuntime) {
          const i18nPatterns = [
            /i18n\.t\(['\"`]/,
            /useI18n\(/,
            /from ['\"]i18ntk[\/\\]runtime['\"]/,
            /require\(['\"]i18ntk[\/\\]runtime['\"]\)/
          ];

          const sourceFiles = await customGlob(['src/**/*.{js,jsx,ts,tsx}'], {
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
    }

    return { detectedLanguage, detectedFramework };
  }

  // Helper function for customGlob (from lines 163-230)
  async function customGlob(patterns, options = {}) {
    const fs = require('fs');
    const path = require('path');
    const cwd = options.cwd || process.cwd();
    const ignorePatterns = options.ignore || [];

    function matchesPattern(filename, pattern) {
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
              for (const pattern of patterns) {
                if (matchesPattern(item, pattern)) {
                  results.push(relativePath);
                  break;
                }
              }
            }
          } catch (error) {
            continue;
          }
        }
      } catch (error) {
      }

      return results;
    }

    return findFiles(cwd);
  }

  // Test the function
  detectEnvironmentAndFramework().then(result => {
    console.log('✅ detectEnvironmentAndFramework completed:', result);
  }).catch(error => {
    console.error('❌ detectEnvironmentAndFramework failed:', error.message);
    console.error('Stack trace:', error.stack);
  });

} catch (error) {
  console.error('❌ Error during exact flow test:', error.message);
  console.error('Stack trace:', error.stack);
}

console.log('🔍 DEBUG: Exact flow test completed.');