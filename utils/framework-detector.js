const fs = require('fs');
const path = require('path');
const SecurityUtils = require('./security');
const { gte } = require('./version-utils');

// Framework compatibility information
const FRAMEWORK_COMPATIBILITY = {
  'i18ntk-runtime': { minVersion: '1.0.0' },
  'vue-i18n': { minVersion: '9.0.0' },
  'react-i18next': { minVersion: '11.0.0' },
  'i18next': { minVersion: '20.0.0' },
  'lingui': { minVersion: '3.0.0' },
  'formatjs': { minVersion: '5.0.0' },
  'django': { minVersion: '3.0.0' },
  'flask': { minVersion: '2.0.0' },
  'fastapi': { minVersion: '0.65.0' },
  'python': { minVersion: '3.6.0' },
  'ruby': { minVersion: '2.7.0' },
  'ruby-on-rails': { minVersion: '6.0.0' },
  'go': { minVersion: '1.16.0' }
};

// Define framework detection in order of specificity
const FRAMEWORKS = {
  // i18ntk-runtime is the framework-agnostic runtime for i18ntk
  'i18ntk-runtime': {
    name: 'i18ntk-runtime',
    description: 'Lightweight i18n runtime for i18ntk',
    deps: ['i18ntk/runtime', 'i18ntk-runtime'],
    globs: ['src/**/*.{js,jsx,ts,tsx}'],
    patterns: [
      /\bi18n\.t\(\s*['\"`]([^'\"`]+)['\"`]\s*(?:,|\/\*|\*\/|\/\/|$)/g,  // i18n.t('key')
      /\bi18n\.translate\(\s*['\"`]([^'\"`]+)['\"`]\s*(?:,|\/\*|\*\/|\/\/|$)/g,  // i18n.translate('key')
      /\buseI18n\(\s*\)\s*\.\s*t\(\s*['\"`]([^'\"`]+)['\"`]\s*(?:,|\/\*|\*\/|\/\/|$)/g,  // useI18n().t('key')
      /\buseTranslation\(\s*['\"`][^'\"`]*['\"`]?\s*\)\s*\{\s*\w*\s*,\s*t\s*\}/.source + '\s*' + /t\(\s*['\"`]([^'\"`]+)['\"`]\s*(?:,|\/\*|\*\/|\/\/|$)/.source,  // const { t } = useTranslation()
      /\$\{\s*t\(\s*['\"`]([^'\"`]+)['\"`]\s*(?:,|\/\*|\*\/|\/\/|$)/g  // ${t('key')} in template literals
    ],
    configFile: 'i18n.js',
    configFilePatterns: [
      /i18n\.(js|ts)$/,
      /i18ntk\.config\.(js|ts)$/,
      /\.i18nrc(\.(js|json))?$/
    ],
    setupGuide: 'https://github.com/vladnosiv/i18n-management-toolkit',
    priority: 100, // Higher priority to detect before other frameworks
    ignore: [
      'node_modules/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/__tests__/**',
      '**/*.test.{js,jsx,ts,tsx}'
    ]
  },
  
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
    name: 'React i18next',
    description: 'Internationalization framework for React',
    dependencies: ['i18next', 'react-i18next'],
    globs: ['**/*.{js,jsx,ts,tsx}'],
    regex: /\b(?:useTranslation|withTranslation|Trans|I18n|i18n\.t|t\(?=\s*[`'"])/,
    configFile: 'i18n.js',
    configFilePatterns: [/i18n\.(js|ts)$/, /i18next\.config\.(js|ts)$/],
    setupGuide: 'https://react.i18next.com/'
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
    ignore: [
      'node_modules/**',
      '__pycache__/**',
      '*.pyc',
      '*.pyo',
      '*.pyd',
      'venv/**',
      '.venv/**',
      'env/**',
      '.env/**',
      'dist/**',
      'build/**',
      '*.egg-info/**',
      '*.so',
      '*.dll',
      '*.dylib',
      '*.so.*',
      '*.dylib.*'
    ]
  },
  python: {
    name: 'python',
    deps: ['gettext', 'babel', 'python-gettext'],
    globs: ['**/*.{py,py3,pyw,txt}'],
    patterns: [
      /gettext\(['"`]([^'"`]+)['"`]\)/g,
      /\(['"`]([^'"`]+)['"`]\)/g,
      /gettext_lazy\(['"`]([^'"`]+)['"`]\)/g,
      /_l\(['"`]([^'"`]+)['"`]\)/g,
      /_n\(['"`]([^'"`]+)['"`]/g,
      /pgettext\([^,]+,\s*['"`]([^'"`]+)['"`]\)/g,
      /npgettext\([^,]+,\s*[^,]+,\s*['"`]([^'"`]+)['"`]/g
    ],
    ignore: [
      'node_modules/**',
      '__pycache__/**',
      '*.pyc',
      '*.pyo',
      '*.pyd',
      'venv/**',
      '.venv/**',
      'env/**',
      '.env/**',
      'dist/**',
      'build/**',
      '*.egg-info/**',
      '*.so',
      '*.dll',
      '*.dylib',
      '*.so.*',
      '*.dylib.*'
    ]
  },
  fastapi: {
    name: 'fastapi',
    deps: ['fastapi', 'python-i18n', 'fastapi-i18n'],
    globs: ['**/*.{py,html,j2,jinja2}'],
    patterns: [
      /_\(['"`]([^'"`]+)['"`]\)/g,
      /i18n\.t\(['"`]([^'"`]+)['"`]\)/g,
      /i18n\.translate\(['"`]([^'"`]+)['"`]\)/g,
      /gettext\(['"`]([^'"`]+)['"`]\)/g,
      /\{\{\s*_\('["']([^"']+)["']\)\s*\}\}/g,
      /\{\{\s*gettext\(['"`]([^'"`]+)['"`]\)\s*\}\}/g
    ],
    ignore: [
      'node_modules/**',
      '__pycache__/**',
      '*.pyc',
      '*.pyo',
      '*.pyd',
      'venv/**',
      '.venv/**',
      'env/**',
      '.env/**',
      'dist/**',
      'build/**',
      '*.egg-info/**',
      '*.so',
      '*.dll',
      '*.dylib',
      '*.so.*',
      '*.dylib.*',
      'alembic/**',
      'migrations/**'
    ]
  },
  'ruby-on-rails': {
    name: 'ruby-on-rails',
    deps: ['rails', 'i18n', 'rails-i18n'],
    globs: [
      'app/**/*.{rb,erb,haml,slim,html.erb,html.haml,html.slim,js.erb}',
      'config/locales/*.{rb,yml,yaml}'
    ],
    patterns: [
      /t\(['"]([^'"]+)['"]/g,
      /I18n\.t\(['"]([^'"]+)['"]/g,
      /I18n\.translate\(['"]([^'"]+)['"]/g,
      /l\(['"]([^'"]+)['"]/g,
      /I18n\.l\(['"]([^'"]+)['"]/g,
      /I18n\.localize\(['"]([^'"]+)['"]/g,
      /<%= t\(['"]([^'"]+)['"]/g,
      /<%= I18n\.t\(['"]([^'"]+)['"]/g
    ],
    ignore: [
      'node_modules/**',
      'tmp/**',
      'log/**',
      'vendor/**',
      'public/**',
      'coverage/**',
      'spec/tmp/**',
      'test/tmp/**'
    ]
  },
  go: {
    name: 'go',
    deps: ['golang.org/x/text/language', 'github.com/nicksnyder/go-i18n/v2/i18n'],
    globs: ['**/*.go'],
    patterns: [
      /i18n\.NewMessage\([^,]+,\s*["`]([^"`]+)["`]/g,
      /i18n\.NewLocalizer\([^)]+\)\.MustLocalize\([^,]+,\s*["`]([^"`]+)["`]/g,
      /\.Get\([^,]+,\s*["`]([^"`]+)["`]/g,
      /i18n\.Translate\([^,]+,\s*["`]([^"`]+)["`]/g
    ],
    ignore: [
      '**/*_test.go',
      'vendor/**',
      '**/testdata/**',
      '**/mocks/**',
      '**/mock_*/**',
      '**/generated/**',
      '**/pb/*.go',
      '**/*.pb.go',
      '**/*.pb.gw.go',
      '**/wire_gen.go',
      '**/bindata.go',
      '**/doc.go',
      '**/test_*.go',
      '**/*_test.go',
      '**/test/**',
      '**/tests/**'
    ]
  }
};

/**
 * Detect the i18n framework being used in the project
 * @param {string} projectRoot - Path to the project root
 * @returns {Promise<Object>} Object containing framework info and detection confidence
 */
/**
 * Detects the i18n framework being used in the project
 * @param {string} projectRoot - Path to the project root
 * @returns {Promise<Object|null>} Detected framework info or null if none found
 */
async function detectFramework(projectRoot) {
  if (!projectRoot || typeof projectRoot !== 'string') {
    throw new Error('Invalid project root path');
  }

  const packageJsonPath = path.join(projectRoot, 'package.json');
  const detectedFrameworks = [];
  
  // Only proceed if package.json exists
    if (!SecurityUtils.safeExistsSync(packageJsonPath)) {
      return null;
    }

    try {
      // Read and parse package.json
      const packageJson = JSON.parse(SecurityUtils.safeReadFileSync(packageJsonPath, 'utf8') || '{}');
    const deps = { 
      ...(packageJson.dependencies || {}), 
      ...(packageJson.devDependencies || {}),
      ...(packageJson.peerDependencies || {})
    };

    // Sort frameworks by priority (highest first)
    const sortedFrameworks = Object.entries(FRAMEWORKS).sort((a, b) => 
      (b[1].priority || 0) - (a[1].priority || 0)
    );

    // Check each framework's dependencies
    for (const [id, framework] of sortedFrameworks) {
      try {
        const frameworkDeps = framework.deps || [];
        const hasAnyDep = frameworkDeps.some(dep => dep in deps);

        if (hasAnyDep) {
          const mainDep = frameworkDeps[0];
          const frameworkInfo = {
            id,
            name: framework.name || id,
            description: framework.description,
            confidence: 0.9, // Base confidence when dependencies are found
            version: deps[mainDep] || '',
            priority: framework.priority || 0
          };

          // Boost confidence for i18ntk-runtime
          if (id === 'i18ntk-runtime') {
            frameworkInfo.confidence = 0.95;
          }

          detectedFrameworks.push(frameworkInfo);
        }
      } catch (error) {
        console.warn(`Error checking framework ${id}:`, error.message);
        continue;
      }
    }

    // Return the framework with highest confidence, if any
    if (detectedFrameworks.length > 0) {
      return detectedFrameworks.sort((a, b) => {
        // First sort by confidence
        const confidenceDiff = b.confidence - a.confidence;
        if (confidenceDiff !== 0) return confidenceDiff;
        
        // If confidence is equal, sort by priority
        return (b.priority || 0) - (a.priority || 0);
      })[0];
    }

    return null;
  } catch (error) {
    console.error('Error detecting framework:', error);
    return null;
  }
}

module.exports = { detectFramework, FRAMEWORKS };