const fs = require('fs');
const path = require('path');
const semver = require('semver');

// Framework compatibility information
const FRAMEWORK_COMPATIBILITY = {
  'vue-i18n': { minVersion: '9.0.0' },
  'react-i18next': { minVersion: '11.0.0' },
  'i18next': { minVersion: '20.0.0' },
  'lingui': { minVersion: '3.0.0' },
  'formatjs': { minVersion: '5.0.0' },
  'django': { minVersion: '3.0.0' },
  'flask': { minVersion: '2.0.0' },
  'python': { minVersion: '3.6.0' }
};

// Define framework detection in order of specificity
const FRAMEWORKS = {
  // Vue i18n has highest specificity due to its unique syntax
  'vue-i18n': {
    name: 'vue-i18n',
    deps: ['vue-i18n', '@intlify/vite-plugin-vue-i18n'],
    globs: ['src/**/*.{js,ts,vue}'],
    patterns: [
      /\$t\(['"`]([^'"`]+)['"`]\)/g,                      // $t('key')
      /useI18n\([^)]*\)\s*\.\s*t\(['"`]([^'"`]+)['"`]\)/g,  // useI18n().t('key')
      /v-t=["']([^"']+)["']/g,                               // v-t="'key'"
      /\{\{[^}]*\$t\(['"`]([^'"`]+)['"`]\)[^}]*\}\}/g   // {{ $t('key') }} in templates
    ],
    ignore: ['node_modules/**']
  },
  
  // React i18next has medium specificity
  'react-i18next': {
    name: 'react-i18next',
    deps: ['react-i18next', 'next-i18next'],
    globs: ['src/**/*.{js,jsx,ts,tsx}'],
    patterns: [
      /\bt\(['"`]([^'"`]+)['"`]\)/g,                      // t('key')
      /useTranslation\([^)]*\)\s*\{[^}]*\bt\(['"`]([^'"`]+)['"`]\)/g, // const { t } = useTranslation(); t('key')
      /withTranslation\([^)]*\)\([^)]*\)/g,                // withTranslation()(Component)
      /<Trans[^>]*>([^<]+)<\/Trans>/g                       // <Trans>key</Trans>
    ],
    ignore: ['node_modules/**']
  },
  
  // Base i18next has lowest specificity
  'i18next': {
    name: 'i18next',
    deps: ['i18next'],
    globs: ['src/**/*.{js,ts}'],
    patterns: [
      /i18n\.t\(['"`]([^'"`]+)['"`]\)/g,                  // i18n.t('key')
      /i18next\.t\(['"`]([^'"`]+)['"`]\)/g,               // i18next.t('key')
      /new i18next\(/g                                      // new i18next()
    ],
    ignore: ['node_modules/**']
  },
  lingui: {
    deps: ['@lingui/core', '@lingui/react'],
    globs: ['src/**/*.{js,jsx,ts,tsx}'],
    patterns: [
      /t\(['"`]([^'"`]+)['"`]\)/g,
      /_\(['"`]([^'"`]+)['"`]\)/g
    ],
    ignore: ['node_modules/**']
  },
  formatjs: {
    deps: ['react-intl', '@formatjs/intl'],
    globs: ['src/**/*.{js,jsx,ts,tsx}'],
    patterns: [
      /formatMessage\(\s*\{\s*id:\s*['"`]([^'"`]+)['"`]\)/g
    ],
    ignore: ['node_modules/**']
  },
  django: {
    deps: ['Django', 'django'],
    globs: ['**/*.{py,html,txt}'],
    patterns: [
      /gettext\(['"`]([^'"`]+)['"`]\)/g,
      /_\(['"`]([^'"`]+)['"`]\)/g,
      /gettext_lazy\(['"`]([^'"`]+)['"`]\)/g,
      /_lazy\(['"`]([^'"`]+)['"`]\)/g,
      /\{\%\s*trans\s+['"`]([^'"`]+)['"`]\s*%\}/g,
      /\{\%\s*blocktrans\s*%\}([^%]+)\{\%\s*endblocktrans\s*%\}/g
    ],
    ignore: ['node_modules/**', '__pycache__/**', '*.pyc']
  },
  flask: {
    deps: ['Flask', 'flask', 'flask-babel'],
    globs: ['**/*.{py,html,txt}'],
    patterns: [
      /gettext\(['"`]([^'"`]+)['"`]\)/g,
      /_\(['"`]([^'"`]+)['"`]\)/g,
      /lazy_gettext\(['"`]([^'"`]+)['"`]\)/g,
      /\{\{\s*gettext\(['"`]([^'"`]+)['"`]\)\s*\}\}/g,
      /\{\{\s*_[('"`]([^'"`]+)['"`]\)\s*\}\}/g
    ],
    ignore: ['node_modules/**', '__pycache__/**', '*.pyc', 'venv/**', '.venv/**']
  },
  python: {
    deps: ['python', 'gettext'],
    globs: ['**/*.{py,txt}'],
    patterns: [
      /gettext\(['"`]([^'"`]+)['"`]\)/g,
      /_\(['"`]([^'"`]+)['"`]\)/g,
      /gettext_lazy\(['"`]([^'"`]+)['"`]\)/g
    ],
    ignore: ['node_modules/**', '__pycache__/**', '*.pyc', 'venv/**', '.venv/**']
  }
};

async function detectFramework(projectRoot = process.cwd()) {
  try {
    // Check for Node.js projects first
    const pkgPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { 
        ...(pkg.dependencies || {}), 
        ...(pkg.devDependencies || {}), 
        ...(pkg.peerDependencies || {}) 
      };

      // Find matching frameworks
      const matches = [];
      for (const [name, meta] of Object.entries(FRAMEWORKS)) {
        const matchedDeps = meta.deps.filter(dep => deps[dep]);
        if (matchedDeps.length > 0) {
          // Check version compatibility
          const versionInfo = FRAMEWORK_COMPATIBILITY[name] || {};
          const versions = matchedDeps.map(dep => {
            const version = deps[dep].replace(/[^0-9.]/g, '');
            return { name: dep, version, compatible: !versionInfo.minVersion || semver.gte(version, versionInfo.minVersion) };
          });
          
          matches.push({
            name,
            ...meta,
            versions,
            isCompatible: versions.every(v => v.compatible)
          });
        }
      }

      // Return the most specific match (first in FRAMEWORKS order)
      return matches[0] || null;
    }

    // Check for Python projects
    const pyProjectPath = path.join(projectRoot, 'pyproject.toml');
    const requirementsPath = path.join(projectRoot, 'requirements.txt');
    
    if (fs.existsSync(pyProjectPath) || fs.existsSync(requirementsPath)) {
      // Simple check for Django
      if (fs.existsSync(path.join(projectRoot, 'manage.py'))) {
        return { name: 'django', ...FRAMEWORKS.django };
      }
      
      // Check for Flask
      if (fs.existsSync(path.join(projectRoot, 'app.py')) || 
          fs.existsSync(path.join(projectRoot, 'application.py'))) {
        return { name: 'flask', ...FRAMEWORKS.flask };
      }
      
      return { name: 'python', ...FRAMEWORKS.python };
    }

    return null;
  } catch (error) {
    console.error(`Error detecting framework: ${error.message}`);
    return null;
  }
}

module.exports = { detectFramework, FRAMEWORKS };