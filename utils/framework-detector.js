const path = require('path');
const SecurityUtils = require('./security');

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
  'go': { minVersion: '1.16.0' },
  'rust': { minVersion: '1.65.0' },
  'fluent': { minVersion: '0.16.0' },
  'remix': { minVersion: '1.0.0' },
  'gatsby': { minVersion: '4.0.0' },
  'astro': { minVersion: '2.0.0' },
  'qwik': { minVersion: '1.0.0' },
  'nuxt': { minVersion: '7.0.0' },
  'nuxt-i18n': { minVersion: '7.0.0' },
  'next-intl': { minVersion: '2.0.0' },
  'ngx-translate': { minVersion: '13.0.0' },
  'angular-i18n': { minVersion: '12.0.0' },
  'svelte-i18n': { minVersion: '3.0.0' },
  'solid-i18n': { minVersion: '1.0.0' },
  'ember-intl': { minVersion: '5.0.0' },
  'react-native-localize': { minVersion: '2.0.0' },
  'ionic': { minVersion: '6.0.0' },
  'spring-boot': { minVersion: '2.5.0' },
  'laravel': { minVersion: '8.0.0' },
  'expo': { minVersion: '48.0.0' },
  'vanilla': { minVersion: '1.0.0' }
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
      /\buseTranslation\(\s*['\"`][^'\"`]*['\"`]?\s*\)\s*\{\s*\w*\s*,\s*t\s*\}[^)]*\)\s*=>/g,  // const { t } = useTranslation()
      /\$\{\s*t\(\s*['\"`]([^'\"`]+)['\"`]\s*(?:,|\/\*|\*\/|\/\/|$)/g  // ${t('key')} in template literals
    ],
    configFile: 'i18n.js',
    configFilePatterns: [
      /i18n\.(js|ts)$/,
      /i18ntk\.config\.(js|ts)$/,
      /\.i18nrc(\.(js|json))?$/,
    ],
    setupGuide: 'Refer to the official i18ntk documentation on GitHub for setup instructions.',
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
    deps: ['i18next', 'react-i18next'],
    globs: ['**/*.{js,jsx,ts,tsx}'],
    regex: /\b(?:useTranslation|withTranslation|Trans|I18n|i18n\.t|t\(?=\s*[`'"])/,
    configFile: 'i18n.js',
    configFilePatterns: [/i18n\.(js|ts)$/, /i18next\.config\.(js|ts)$/],
    setupGuide: 'Refer to the official react-i18next documentation for setup instructions.'
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
      /(?<![\w$.])t\s*\(['"`]([^'"`]+)['"`]\)/g,
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
      /(?<![\w$.])t\s*\(['"]([^'"]+)['"]/g,
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
    deps: ['go-i18n', 'x-text'],
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
  },

  rust: {
    name: 'rust',
    deps: ['fluent', 'fluent-bundle', 'fluent-resmgr', 'fluent-rs', 'intl-memoizer', 'unic-langid'],
    globs: ['**/*.rs'],
    patterns: [
      /\bLocalization::new\(\s*&\[\s*([^\]]+)\s*\],\s*&\[\s*([^\]]+)\s*\]\)/g,
      /bundle\.get_message\(\s*["`]([^"`]+)["`]/g,
      /\.get_message\s*\(\s*["`]([^"`]+)["`]/g,
      /\bformat!\s*\(\s*["`]([^"`]+)["`]/g
    ],
    ignore: [
      'target/**',
      '**/*_test.rs',
      '**/test/**',
      '**/tests/**',
      '**/examples/**',
      '**/benches/**',
      '**/migrations/**'
    ]
  },

  'ngx-translate': {
    name: 'Angular ngx-translate',
    deps: ['@ngx-translate/core', '@ngx-translate/http-loader'],
    patterns: [
      /translate\s*=\s*["'`]([^"'`]+)["'`]/g,
      /translateService\.instant\(\s*['"`]([^"'`]+)['"`]/g,
      /translateService\.get\(\s*['"`]([^"'`]+)['"`]/g,
      /\|\s*translate\s*[^}]*\}\}/g
    ]
  },

  'angular-i18n': {
    name: 'Angular built-in i18n',
    deps: ['@angular/core'],
    globs: ['src/**/*.{ts,html}'],
    patterns: [
      /\$localize`([^`]+)`/g,
      /\bi18n(?:-[\w-]+)?=["']([^"']+)["']/g,
      /<ng-container\s+i18n[^>]*>([^<]+)<\/ng-container>/g
    ],
    priority: -1
  },

  'next-intl': {
    name: 'next-intl (Next.js)',
    deps: ['next-intl', 'next-i18next', '@next-intl/core'],
    patterns: [
      /\bt\(\s*['"`]([^'"`]+)['"`]/g,
      /\buseTranslations\(\s*\)/g
    ]
  },

  'nuxt-i18n': {
    name: 'Nuxt i18n',
    deps: ['@nuxtjs/i18n', 'nuxt-i18n', '@intlify/nuxt3'],
    patterns: [
      /\$t\(\s*['"`]([^'"`]+)['"`]/g,
      /\$tc\(\s*['"`]([^'"`]+)['"`]/g,
      /\blocalePath\(\s*\)/g
    ]
  },

  'svelte-i18n': {
    name: 'svelte-i18n',
    deps: ['svelte-i18n', 'sveltekit-i18n', '@sveltekit-i18n/base'],
    patterns: [
      /\$_\(\s*['"`]([^'"`]+)['"`]/g,
      /\$_\w*\(\s*['"`]([^'"`]+)['"`]/g,
      /\bt\.get\(\s*['"`]([^'"`]+)['"`]/g
    ]
  },

  'solid-i18n': {
    name: 'Solid i18n',
    deps: ['@solid-primitives/i18n', 'i18next-solid'],
    patterns: [
      /\buseI18n\(\s*\)\s*\.\s*t\(\s*['"`]([^'"`]+)['"`]/g,
      /\bt\(\s*['"`]([^'"`]+)['"`]/g
    ]
  },

  remix: {
    name: 'Remix i18n',
    deps: ['remix-i18next', 'i18next-remix', '@remix-run/react'],
    globs: ['app/**/*.{js,jsx,ts,tsx}'],
    patterns: [
      /\buseTranslation\(\s*['"`][^'"`]*['"`]?\s*\)/g,
      /\bt\(\s*['"`]([^'"`]+)['"`]/g,
      /\bgetServerSideTranslations\(/g
    ]
  },

  gatsby: {
    name: 'Gatsby i18n',
    deps: ['gatsby-plugin-react-i18next', '@herob191/gatsby-plugin-react-i18next', 'gatsby-plugin-intl', 'gatsby-theme-i18n'],
    globs: ['src/**/*.{js,jsx,ts,tsx}'],
    patterns: [
      /\bt\(\s*['"`]([^'"`]+)['"`]/g,
      /\buseTranslation\(\s*['"`][^'"`]*['"`]?\s*\)/g,
      /\bgraphql\s*`[^`]*locales[^`]*`/g
    ]
  },

  astro: {
    name: 'Astro i18n',
    deps: ['astro-i18next', '@astrojs/i18n', 'astro-i18n', '@inox-tools/astro-i18n'],
    globs: ['src/**/*.{astro,js,jsx,ts,tsx}'],
    patterns: [
      /\bt\(\s*['"`]([^'"`]+)['"`]/g,
      /\bAstro\.i18n\(\s*['"`]([^'"`]+)['"`]/g,
      /\buseTranslations\(\s*['"`][^'"`]*['"`]?\s*\)/g
    ]
  },

  qwik: {
    name: 'Qwik i18n',
    deps: ['qwik-speak', 'qwik-i18n', '@qwikdev/i18n'],
    globs: ['src/**/*.{tsx,ts,jsx,js}'],
    patterns: [
      /\buseTranslate\(\s*\)/g,
      /\bt\(\s*['"`]([^'"`]+)['"`]/g,
      /\buseSpeak\(\s*\)/g
    ]
  },

  'ember-intl': {
    name: 'Ember Intl',
    deps: ['ember-intl', '@ember-intl/formatjs'],
    globs: ['app/**/*.{js,ts,hbs}'],
    patterns: [
      /\bintl\.t\(\s*['"`]([^'"`]+)['"`]/g,
      /\{\{\s*t\s+['"`]([^'"`]+)['"`]\s*\}\}/g,
      /\{\{t\s+['"`]([^'"`]+)['"`]\s*\}\}/g
    ]
  },

  'react-native-localize': {
    name: 'React Native Localize',
    deps: ['react-native-localize', 'i18n-js', 'expo-localization'],
    globs: ['**/*.{js,jsx,ts,tsx}'],
    patterns: [
      /\bi18n\.t\(\s*['"`]([^'"`]+)['"`]/g,
      /\bt\(\s*['"`]([^'"`]+)['"`]/g,
      /\btranslate\(\s*['"`]([^'"`]+)['"`]/g
    ]
  },

  ionic: {
    name: 'Ionic i18n',
    deps: ['@ionic/angular', 'ionic-angular', 'ionic-react', '@ionic/vue'],
    globs: ['src/**/*.{ts,tsx,html}'],
    patterns: [
      /\btranslateService\.instant\(\s*['"`]([^'"`]+)['"`]/g,
      /\btranslateService\.get\(\s*['"`]([^'"`]+)['"`]/g,
      /\|\s*translate\s*[^}]*\}\}/g
    ],
    priority: 5
  },

  'spring-boot': {
    name: 'Spring Boot i18n',
    deps: [],
    globs: ['src/**/*.{java,html,properties}'],
    patterns: [
      /messageSource\.getMessage\(\s*["']([^"']+)["']/g,
      /\#\{([^}]+)\}/g,
      /getMessage\(\s*["']([^"']+)["']/g
    ]
  },

  laravel: {
    name: 'Laravel localization',
    deps: [],
    globs: ['**/*.{php,blade.php}'],
    patterns: [
      /__\(\s*["']([^"']+)["']/g,
      /(?:trans|Lang::get)\(\s*["']([^"']+)["']/g,
      /@lang\(\s*["']([^"']+)["']/g
    ]
  }
};

// ============================================================
// CENTRALIZED SHARED CONSTANTS — single source of truth
// All scanner/validator/extension code imports from here.
// ============================================================

const SOURCE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.mts', '.cjs', '.cts',
  '.vue', '.svelte', '.astro', '.mdx', '.html', '.rs',
  '.py', '.pyx', '.pyi', '.go', '.rb', '.java', '.php', '.hbs'
]);

const SCANNER_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.mts', '.cjs', '.cts',
  '.vue', '.html', '.svelte', '.astro', '.mdx',
  '.py', '.pyx', '.pyi', '.php', '.rb', '.go', '.rs', '.java'
]);

const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn',
  '.next', '.nuxt', '.output', '.astro', '.svelte-kit', '.cache', '__generated__',
  'dist', 'build', 'coverage', 'out', 'target',
  'vendor', 'tmp', 'temp', '.terraform'
]);

const SOURCE_DIRS = [
  'src', 'app', 'lib', 'source', 'pages', 'routes', 'components',
  'layouts', 'api', 'content', 'modules', 'views'
];

const FRAMEWORK_PATTERNS = {
  'i18ntk-runtime': [
    />([^<{][^<>{]*[^}>])</g,
    /<button[^>]*>([^<]{2,99})<\/button>/g,
    /i18n\.t\(["']([^"']{2,99})["']\)/g,
    /useI18n\(\)\.t\(["']([^"']{2,99})["']\)/g,
    /<t\s[\s\S]*?\bmessage\s*=\s*(?:\{|)(['"`])([^'"`}]+)\1[^>]*>/g
  ],
  react: [
    /children:\s*["']([^"']{2,99})["']/g,
    /dangerouslySetInnerHTML={{\s*__html:\s*["']([^"']{2,99})["']/g,
    />([^<{][^<>{]*[^}>])</g,
    /<button[^>]*>([^<]{2,99})<\/button>/g,
    /<span[^>]*>([^<]{2,99})<\/span>/g,
    /<(?:FormattedMessage|Trans)[\s\S]*?\b(?:id|defaultMessage|i18nKey)\s*=\s*(?:\{|)(['"`])([^'"`}]+)\1[^>]*>/g
  ],
  next: [
    /children:\s*["']([^"']{2,99})["']/g,
    />([^<{][^<>{]*[^}>])</g,
    /<button[^>]*>([^<]{2,99})<\/button>/g,
    /<(?:FormattedMessage|Trans)[\s\S]*?\b(?:id|defaultMessage|i18nKey)\s*=\s*(?:\{|)(['"`])([^'"`}]+)\1[^>]*>/g
  ],
  nuxt: [
    />([^<{][^<>{]*[^}>])</g,
    /<button[^>]*>([^<]{2,99})<\/button>/g,
    /\$t\(["']([^"']{2,99})["']\)/g,
    /\$tc\(["']([^"']{2,99})["']\)/g,
    /v-t=["']([^"']{2,99})["']/g,
    /\blocalePath\(\s*['"`]([^'"`]{2,99})['"`]\s*\)/g
  ],
  vue: [
    /v-text=["']([^"']{2,99})["']/g,
    /v-html=["']([^"']{2,99})["']/g,
    />([^<{][^<>{]*[^}>])</g,
    /<button[^>]*>([^<]{2,99})<\/button>/g,
    /<span[^>]*>([^<]{2,99})<\/span>/g,
    /\$t\(["']([^"']{2,99})["']\)/g,
    /v-t=["']([^"']{2,99})["']/g
  ],
  angular: [
    /\[innerHTML\]=["']([^"']{2,99})["']/g,
    /\[textContent\]=["']([^"']{2,99})["']/g,
    />([^<{][^<>{]*[^}>])</g,
    /<button[^>]*>([^<]{2,99})<\/button>/g,
    /<span[^>]*>([^<]{2,99})<\/span>/g,
    /i18n=["']([^"']{2,99})["']/g,
    /\[attr\.title\]=["']([^"']{2,99})["']/g
  ],
  svelte: [
    />([^<{][^<>{]*[^}>])</g,
    /<button[^>]*>([^<]{2,99})<\/button>/g,
    /\$_\(["']([^"']{2,99})["']\)/g,
    /t\.set\(["']([^"']{2,99})["']/g,
    /\{#if[^}]*\}([^<]{2,99})\{\/if\}/g
  ],
  astro: [
    />([^<{][^<>{]*[^}>])</g,
    /<button[^>]*>([^<]{2,99})<\/button>/g,
    /t\(["']([^"']{2,99})["']\)/g
  ],
  remix: [
    /children:\s*["']([^"']{2,99})["']/g,
    />([^<{][^<>{]*[^}>])</g,
    /<button[^>]*>([^<]{2,99})<\/button>/g,
    /<(?:FormattedMessage|Trans)[\s\S]*?\b(?:id|defaultMessage|i18nKey)\s*=\s*(?:\{|)(['"`])([^'"`}]+)\1[^>]*>/g
  ],
  qwik: [
    />([^<{][^<>{]*[^}>])</g,
    /<button[^>]*>([^<]{2,99})<\/button>/g,
    /t\(["']([^"']{2,99})["']\)/g,
    /useTranslate\(\)/g
  ],
  solid: [
    />([^<{][^<>{]*[^}>])</g,
    /<button[^>]*>([^<]{2,99})<\/button>/g,
    /t\(["']([^"']{2,99})["']\)/g,
    /useI18n\(\)\.t\(["']([^"']{2,99})["']\)/g
  ],
  ember: [
    />([^<{][^<>{]*[^}>])</g,
    /\{\{t\s+["']([^"']{2,99})["']\s*\}\}/g,
    /\{\{intl\.t\s+["']([^"']{2,99})["']\s*\}\}/g
  ],
  gatsby: [
    /children:\s*["']([^"']{2,99})["']/g,
    />([^<{][^<>{]*[^}>])</g,
    /<(?:Trans)[\s\S]*?\bi18nKey\s*=\s*(?:\{|)(['"`])([^'"`}]+)\1[^>]*>/g
  ],
  django: [
    /\{\%\s*trans\s+["']([^"']{2,99})["']\s*%\}/g,
    /\{\%\s*blocktrans\s*%\}([^%]{2,99})\{\%\s*endblocktrans\s*%\}/g,
    /{{\s*_["']([^"']{2,99})["']\s*}}/g,
    /{{\s*gettext\(["']([^"']{2,99})["']\)\s*}}/g
  ],
  flask: [
    /\{\{\s*_["']([^"']{2,99})["']\s*}}/g,
    /\{\{\s*gettext\(["']([^"']{2,99})["']\)\s*}}/g,
    /\{\{\s*lazy_gettext\(["']([^"']{2,99})["']\)\s*}}/g
  ],
  python: [
    /gettext\(["']([^"']{2,99})["']\)/g,
    /_\(["']([^"']{2,99})["']\)/g,
    /gettext_lazy\(["']([^"']{2,99})["']\)/g,
    /lazy_gettext\(["']([^"']{2,99})["']\)/g
  ],
  rust: [
    /bundle\.get_message\(\s*["']([^"']{2,99})["']\)/g,
    /\.get_message\s*\(\s*["']([^"']{2,99})["']\)/g,
    /ts!\s*\(\s*["']([^"']{2,99})["']/g,
    /fluent!\s*\(\s*["']([^"']{2,99})["']/g
  ],
  go: [
    /i18n\.Translate\([^,]+,\s*["']([^"']{2,99})["']\)/g,
    /i18n\.NewMessage\([^,]+,\s*["']([^"']{2,99})["']\)/g,
    /t\.Get\([^,]+,\s*["']([^"']{2,99})["']\)/g
  ],
  lingui: [
    />([^<{][^<>{]*[^}>])</g,
    /(?<![\w$.])t\s*\(\s*['"`]([^'"`]{2,99})['"`]/g,
    /_\(\s*['"`]([^'"`]{2,99})['"`]/g,
    /<Translate\s[\s\S]*?\bid\s*=\s*(?:\{|)(['"`])([^'"`}]+)\1[^>]*>/g
  ],
  formatjs: [
    />([^<{][^<>{]*[^}>])</g,
    /formatMessage\(\s*\{\s*id:\s*['"`]([^'"`]{2,99})['"`]/g,
    /<FormattedMessage\s[\s\S]*?\bid\s*=\s*(?:\{|)(['"`])([^'"`}]+)\1[^>]*>/g
  ],
  'ngx-translate': [
    />([^<{][^<>{]*[^}>])</g,
    /\|\s*translate\s*[^}]*\}\}/g,
    /translateService\.instant\(\s*['"`]([^'"`]{2,99})['"`]/g,
    /translateService\.get\(\s*['"`]([^'"`]{2,99})['"`]/g,
    /translate\s*=\s*["'`]([^"'`]{2,99})["'`]/g,
    /\[innerHTML\]=["']([^"']{2,99})["']/g
  ],
  'angular-i18n': [
    /\$localize`([^`]{2,99})`/g,
    /\bi18n(?:-[\w-]+)?=["']([^"']{2,99})["']/g,
    />([^<{][^<>{]*[^}>])</g
  ],
  'next-intl': [
    />([^<{][^<>{]*[^}>])</g,
    /t\(\s*['"`]([^'"`]{2,99})['"`]/g,
    /\buseTranslations\(\s*['"`]([^'"`]{1,99})['"`]\s*\)/g
  ],
  'svelte-i18n': [
    />([^<{][^<>{]*[^}>])</g,
    /\$_\(\s*['"`]([^'"`]{2,99})['"`]/g,
    /\$_\w*\(\s*['"`]([^'"`]{2,99})['"`]/g,
    /\bt\.get\(\s*['"`]([^'"`]{2,99})['"`]/g
  ],
  'solid-i18n': [
    />([^<{][^<>{]*[^}>])</g,
    /\buseI18n\(\s*\)\s*\.\s*t\(\s*['"`]([^'"`]{2,99})['"`]/g,
    /t\(\s*['"`]([^'"`]{2,99})['"`]/g,
    /<Translate\s[\s\S]*?\bid\s*=\s*(?:\{|)(['"`])([^'"`}]+)\1[^>]*>/g
  ],
  fastapi: [
    /_\(\s*['"`]([^'"`]{2,99})['"`]/g,
    /i18n\.t\(\s*['"`]([^'"`]{2,99})['"`]/g,
    /\{\{\s*_['"]([^'"]{2,99})['"]\s*\}\}/g,
    /\{\{\s*gettext\(['"`]([^'"`]{2,99})['"`]\)\s*\}\}/g
  ],
  'ruby-on-rails': [
    /I18n\.t\(\s*['"]([^'"]{2,99})['"]/g,
    /I18n\.translate\(\s*['"]([^'"]{2,99})['"]/g,
    /I18n\.l\(\s*['"]([^'"]{2,99})['"]/g,
    /<%= t\(['"]([^'"]{2,99})['"]/g,
    /<%= I18n\.t\(['"]([^'"]{2,99})['"]/g,
    /(?<![\w$.])t\s*\(\s*['"]([^'"]{2,99})['"]/g
  ],
  'react-native-localize': [
    />([^<{][^<>{]*[^}>])</g,
    /\bi18n\.t\(\s*['"`]([^'"`]{2,99})['"`]/g,
    /\bt\(\s*['"`]([^'"`]{2,99})['"`]/g,
    /\btranslate\(\s*['"`]([^'"`]{2,99})['"`]/g
  ],
  ionic: [
    />([^<{][^<>{]*[^}>])</g,
    /\|\s*translate\s*[^}]*\}\}/g,
    /translateService\.instant\(\s*['"`]([^'"`]{2,99})['"`]/g,
    /translateService\.get\(\s*['"`]([^'"`]{2,99})['"`]/g
  ],
  'spring-boot': [
    /messageSource\.getMessage\(\s*["']([^"']{2,99})["']/g,
    /\#\{([^}]{2,99})\}/g,
    /getMessage\(\s*["']([^"']{2,99})["']/g
  ],
  laravel: [
    /__\(\s*["']([^"']{2,99})["']/g,
    /(?:trans|Lang::get)\(\s*["']([^"']{2,99})["']/g,
    /@lang\(\s*["']([^"']{2,99})["']/g
  ],
  vanilla: [
    /t\(["']([^"']{2,99})["']\)/g,
    /i18n\.t\(["']([^"']{2,99})["']\)/g,
    /translate\(["']([^"']{2,99})["']\)/g
  ]
};

const FRAMEWORK_SUGGESTIONS = {
  react: { hook: 'const { t } = useTranslation();', usage: "{t('ui.KEY')}", component: "<Trans i18nKey=\"ui.KEY\">text</Trans>" },
  next: { hook: 'const t = useTranslations();', usage: "{t('ui.KEY')}", component: "<Trans i18nKey=\"ui.KEY\">text</Trans>" },
  vue: { directive: "{{ $t('ui.KEY') }}", method: "this.$t('ui.KEY')" },
  angular: { pipe: "{{ 'text' | translate }}", service: "this.translateService.instant('ui.KEY')" },
  svelte: { store: "$_(('ui.KEY'))", method: "t.set('ui.KEY', 'text')" },
  astro: { import: "import { t } from 'astro-i18next';", usage: "{t('ui.KEY')}" },
  remix: { hook: 'const { t } = useTranslation();', usage: "{t('ui.KEY')}", server: 'export const handle = i18next.handle;' },
  qwik: { hook: 'const t = useTranslate();', usage: "{t('ui.KEY')}" },
  solid: { hook: 'const [t] = useI18n();', usage: "{t('ui.KEY')}" },
  ember: { template: "{{t 'ui.KEY'}}", helper: "this.intl.t('ui.KEY')" },
  gatsby: { hook: 'const { t } = useTranslation();', usage: "{t('ui.KEY')}", plugin: "'gatsby-plugin-react-i18next'" },
  nuxt: { directive: "{{ $t('ui.KEY') }}", method: "this.$t('ui.KEY')", component: "<NuxtLink :to=\"localePath('ui.KEY')\">" },
  'i18ntk-runtime': { hook: 'const { t } = useI18n();', usage: "{t('ui.KEY')}", component: "<t message=\"ui.KEY\">text</t>" },
  lingui: { hook: 'import { t } from \"@lingui/macro\";', usage: "{t('ui.KEY')}", component: "<Trans id=\"ui.KEY\">text</Trans>" },
  formatjs: { hook: 'import { FormattedMessage, useIntl } from \"react-intl\";', usage: "intl.formatMessage({ id: 'ui.KEY' })", component: "<FormattedMessage id=\"ui.KEY\" />" },
  'ngx-translate': { pipe: "{{ 'ui.KEY' | translate }}", service: "this.translateService.instant('ui.KEY')" },
  'angular-i18n': { template: '<span i18n>text</span>', code: '$localize`text`' },
  'next-intl': { hook: 'const t = useTranslations();', usage: "{t('ui.KEY')}" },
  'svelte-i18n': { store: "$_('ui.KEY')", method: "t.get('ui.KEY')" },
  'solid-i18n': { hook: 'const [t] = useI18n();', usage: "{t('ui.KEY')}", component: "<Translate id=\"ui.KEY\" />" },
  fastapi: { python: "from fastapi_i18n import _\n_('text')", template: "{{ _('text') }}" },
  'ruby-on-rails': { helper: "t('ui.KEY')", method: "I18n.t('ui.KEY')", template: "<%= t('ui.KEY') %>" },
  'react-native-localize': { hook: 'import { t } from \"i18n-js\";', usage: "{t('ui.KEY')}" },
  ionic: { pipe: "{{ 'ui.KEY' | translate }}", service: "this.translateService.instant('ui.KEY')" },
  'spring-boot': { java: 'messageSource.getMessage("ui.KEY", null, locale)', template: '#{ui.KEY}' },
  laravel: { php: "__('ui.KEY')", blade: "@lang('ui.KEY')" },
  django: { template: "{% trans 'text' %}", python: "from django.utils.translation import gettext as _\n_('text')", model: "from django.utils.translation import gettext_lazy as _\n_('text')" },
  flask: { template: "{{ _('text') }}", python: "from flask_babel import gettext as _\n_('text')", lazy: "from flask_babel import lazy_gettext as _\n_('text')" },
  python: { gettext: "import gettext\ngettext.gettext('text')", underscore: "from gettext import gettext as _\n_('text')", lazy: "from gettext import gettext_lazy as _\n_('text')" },
  rust: { fluent: 'bundle.get_message("ui_KEY")', gettext: 'gettext("ui_KEY")' },
  go: { translate: 'i18n.Translate("ui_KEY")', message: 'i18n.NewMessage("ui_KEY")' },
  vanilla: { generic: "t('ui.KEY')" }
};

const WRAPPER_SKIP_PATTERNS = [
  't(', 'tx(', 'i18n.t(', 'i18n.translate(', 'translate(',
  'useI18n(', 'useTranslation(', '__', '__t', '$_(', '$t(', '_(',
  '$tc(', 'gettext(', 'gettext_lazy(', 'lazy_gettext(', 'pgettext(', 'ngettext(',
  'I18n.t(', 'I18n.translate(', 'I18n.l(', 'I18n.localize(',
  't.get(', 'useTranslate(', 'useSpeak(', 'withTranslation(',
  'formatMessage(', 'bundle.get_message(', 'i18n.NewMessage(',
  'i18n.Translate(', '_l(', '_n(', 't.set(', 'fluent!', 'ts!',
  'translateService.instant(', 'translateService.get('
];

function _keySnippet(text) {
  return String(text || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40);
}

function getFrameworkPatterns(framework) {
  const base = [
    /(?<![\w])["'`]([^"'`]{2,99})["'`]/g,
    /`([^`]{2,99})`/g,
    />([^<]{2,99})</g,
    /title=["']([^"']{2,99})["']/g,
    /alt=["']([^"']{2,99})["']/g,
    /placeholder=["']([^"']{2,99})["']/g
  ];
  return [...base, ...(FRAMEWORK_PATTERNS[framework] || FRAMEWORK_PATTERNS.vanilla || [])];
}

/**
 * Run framework patterns through a stable result contract. Regexes inherited
 * from older releases use either capture 1 or capture 2; the last non-empty
 * capture is the value while offsets always refer to the full match.
 */
function extractFrameworkMessages(source, framework = 'vanilla', options = {}) {
  const text = String(source || '');
  const maxMatches = Math.max(1, Math.min(Number(options.maxMatches) || 10000, 100000));
  const patterns = options.includeGeneric === false
    ? (FRAMEWORK_PATTERNS[framework] || FRAMEWORK_PATTERNS.vanilla)
    : getFrameworkPatterns(framework);
  const results = [];
  for (const original of patterns) {
    const regex = new RegExp(original.source, original.flags.includes('g') ? original.flags : original.flags + 'g');
    let match;
    while ((match = regex.exec(text)) !== null && results.length < maxMatches) {
      const captures = match.slice(1).filter(value => typeof value === 'string' && value.length > 0);
      const value = captures[captures.length - 1];
      if (value) results.push({
        value, kind: /(?:\bt\s*\(|\$t\s*\(|i18n|gettext|Message|Translate|trans\b)/i.test(match[0]) ? 'key' : 'hardcodedText',
        framework, start: match.index, end: match.index + match[0].length,
        confidence: captures.length ? 0.9 : 0.5, pattern: original.source
      });
      if (match[0] === '') regex.lastIndex++;
    }
    if (results.length >= maxMatches) break;
  }
  return results;
}

function getFrameworkSuggestions(framework, text) {
  const template = FRAMEWORK_SUGGESTIONS[framework] || FRAMEWORK_SUGGESTIONS.vanilla || {};
  const result = {};
  for (const [k, v] of Object.entries(template)) {
    result[k] = v.replace(/ui\.KEY/g, `ui.${_keySnippet(text)}`).replace(/\btext\b/g, text);
  }
  return result;
}

function getSourceExtensions() { return [...SOURCE_EXTENSIONS]; }

function getExcludeDirs() { return [...EXCLUDE_DIRS]; }

function detectProjectFramework(projectRoot) {
  const detected = detectFramework(projectRoot);
  if (detected && detected.id) return detected.id;
  return 'vanilla';
}

function detectProjectFrameworks(projectRoot) {
  const primaryResult = detectFramework(projectRoot);
  const primary = primaryResult?.id || 'vanilla';
  const detected = new Set([primary]);
  const evidence = [];
  const packagePath = path.join(projectRoot, 'package.json');
  try {
    if (SecurityUtils.safeExistsSync(packagePath, projectRoot)) {
      const pkg = SecurityUtils.safeParseJSON(SecurityUtils.safeReadFileSync(packagePath, projectRoot, 'utf8')) || {};
      const dependencies = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}), ...(pkg.peerDependencies || {}) };
      const platforms = { next: ['next'], react: ['react'], nuxt: ['nuxt'], vue: ['vue'], angular: ['@angular/core'], svelte: ['svelte'], astro: ['astro'], remix: ['@remix-run/react'], solid: ['solid-js'], qwik: ['@builder.io/qwik'] };
      for (const [id, packages] of Object.entries(platforms)) for (const dependency of packages) {
        if (dependencies[dependency]) {
          detected.add(id);
          evidence.push({ framework: id, source: 'package.json', dependency, version: dependencies[dependency], kind: 'platform' });
        }
      }
      for (const [id, info] of Object.entries(FRAMEWORKS)) {
        const packages = [...(info.deps || info.dependencies || [])].filter(Boolean);
        for (const dependency of packages) if (dependencies[dependency]) {
          detected.add(id);
          evidence.push({ framework: id, source: 'package.json', dependency, version: dependencies[dependency], kind: 'i18n-library' });
        }
      }
    }
  } catch (_) { /* primary detection remains usable */ }
  return { primary, detected: [...detected], evidence };
}

/**
 * Detects the i18n framework being used in the project
 * @param {string} projectRoot - Path to the project root
 * @returns {Object|null} Detected framework info or null if none found
 */
function detectFramework(projectRoot) {
  if (!projectRoot || typeof projectRoot !== 'string') {
    throw new Error('Invalid project root path');
  }

  const detectedFrameworks = [];

  // Phase 1: Check package.json for Node.js-based i18n frameworks
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (SecurityUtils.safeExistsSync(packageJsonPath, projectRoot)) {
    try {
      const packageJsonContent = SecurityUtils.safeReadFileSync(packageJsonPath, projectRoot, 'utf8');
      if (packageJsonContent) {
        const packageJson = SecurityUtils.safeParseJSON(packageJsonContent);
        if (packageJson) {
          const deps = {
            ...(packageJson.dependencies || {}),
            ...(packageJson.devDependencies || {}),
            ...(packageJson.peerDependencies || {})
          };

          const sortedFrameworks = Object.entries(FRAMEWORKS).sort((a, b) =>
            (b[1].priority || 0) - (a[1].priority || 0)
          );

          for (const [id, framework] of sortedFrameworks) {
            try {
              const frameworkDeps = framework.deps || framework.dependencies || [];
              const hasAnyDep = frameworkDeps.some(dep => dep in deps);
              if (hasAnyDep) {
                const mainDep = frameworkDeps[0];
                const frameworkInfo = {
                  id, name: framework.name || id, description: framework.description,
                  confidence: id === 'i18ntk-runtime' ? 0.95 : 0.9,
                  version: deps[mainDep] || '', priority: framework.priority || 0
                };
                detectedFrameworks.push(frameworkInfo);
              }
            } catch (_) { /* skip */ }
          }
        }
      }
    } catch (_) { /* skip */ }
  }

  // Phase 2: Check Python project files (no package.json or no Node matches)
  if (detectedFrameworks.length === 0) {
    const pyProjectFiles = ['requirements.txt', 'setup.py', 'setup.cfg', 'pyproject.toml', 'Pipfile', 'Pipfile.lock'];
    const hasPyProject = pyProjectFiles.some(f => SecurityUtils.safeExistsSync(path.join(projectRoot, f), projectRoot));
    if (hasPyProject) {
      const pyDeps = readPyProjectDeps(projectRoot);
      const pyFrameworks = ['django', 'flask', 'fastapi', 'python'];
      for (const id of pyFrameworks) {
        const framework = FRAMEWORKS[id];
        if (!framework) continue;
        const frameworkDeps = framework.deps || [];
        const hasAnyDep = frameworkDeps.some(dep => pyDeps.includes(dep.toLowerCase().replace(/[_-]/g, '')));
        if (hasAnyDep) {
          detectedFrameworks.push({
            id, name: framework.name || id, description: framework.description,
            confidence: 0.8, version: '', priority: framework.priority || 0
          });
        }
      }
      if (detectedFrameworks.length === 0 && hasPyProject) {
        detectedFrameworks.push({
          id: 'python', name: 'Python', description: 'Python project with gettext/i18n',
          confidence: 0.5, version: '', priority: 0
        });
      }
    }
  }

  // Phase 3: Check Rust project (Cargo.toml)
  if (detectedFrameworks.length === 0) {
    const cargoPath = path.join(projectRoot, 'Cargo.toml');
    if (SecurityUtils.safeExistsSync(cargoPath, projectRoot)) {
      try {
        const cargoContent = SecurityUtils.safeReadFileSync(cargoPath, projectRoot, 'utf8');
        if (cargoContent) {
          const hasRustI18n = /fluent|rust-i18n|gettext/.test(cargoContent);
          if (hasRustI18n || /^\[package\]/m.test(cargoContent)) {
            detectedFrameworks.push({
              id: 'rust', name: 'Rust', description: 'Rust project with i18n',
              confidence: hasRustI18n ? 0.85 : 0.4, version: '', priority: 0
            });
          }
        }
      } catch (_) { /* skip */ }
    }
  }

  // Phase 4: Check Go project (go.mod)
  if (detectedFrameworks.length === 0) {
    const goModPath = path.join(projectRoot, 'go.mod');
    if (SecurityUtils.safeExistsSync(goModPath, projectRoot)) {
      try {
        const goModContent = SecurityUtils.safeReadFileSync(goModPath, projectRoot, 'utf8');
        if (goModContent) {
          const hasGoI18n = /go-i18n|x-text|i18n/.test(goModContent);
          detectedFrameworks.push({
            id: 'go', name: 'Go', description: 'Go project with i18n',
            confidence: hasGoI18n ? 0.85 : 0.4, version: '', priority: 0
          });
        }
      } catch (_) { /* skip */ }
    }
  }

  // Phase 5: Check Ruby project (Gemfile)
  if (detectedFrameworks.length === 0) {
    const gemfilePaths = ['Gemfile', 'gems.rb'];
    for (const gf of gemfilePaths) {
      const gemfilePath = path.join(projectRoot, gf);
      if (SecurityUtils.safeExistsSync(gemfilePath, projectRoot)) {
        try {
          const gemfileContent = SecurityUtils.safeReadFileSync(gemfilePath, projectRoot, 'utf8');
          if (gemfileContent) {
            const hasRails = /rails/.test(gemfileContent);
            const hasI18n = /i18n/.test(gemfileContent);
            if (hasRails) {
              detectedFrameworks.push({
                id: 'ruby-on-rails', name: 'Ruby on Rails', description: 'Rails project with i18n',
                confidence: hasI18n ? 0.9 : 0.7, version: '', priority: 0
              });
              break;
            }
            if (hasI18n) {
              detectedFrameworks.push({
                id: 'ruby-on-rails', name: 'Ruby on Rails', description: 'Ruby project with i18n',
                confidence: 0.6, version: '', priority: 0
              });
              break;
            }
          }
        } catch (_) { /* skip */ }
      }
    }
  }

  // Phase 6: Check PHP Composer projects.
  if (detectedFrameworks.length === 0) {
    const composerPath = path.join(projectRoot, 'composer.json');
    if (SecurityUtils.safeExistsSync(composerPath, projectRoot)) {
      try {
        const composer = SecurityUtils.safeParseJSON(
          SecurityUtils.safeReadFileSync(composerPath, projectRoot, 'utf8')
        ) || {};
        const dependencies = { ...(composer.require || {}), ...(composer['require-dev'] || {}) };
        if (dependencies['laravel/framework']) {
          detectedFrameworks.push({
            id: 'laravel', name: FRAMEWORKS.laravel.name,
            description: 'Laravel project with built-in localization',
            confidence: 0.9, version: dependencies['laravel/framework'], priority: 0
          });
        }
      } catch (_) { /* skip */ }
    }
  }

  // Phase 7: Check Maven and Gradle projects for Spring Boot.
  if (detectedFrameworks.length === 0) {
    const javaManifests = ['pom.xml', 'build.gradle', 'build.gradle.kts'];
    for (const manifest of javaManifests) {
      const manifestPath = path.join(projectRoot, manifest);
      if (!SecurityUtils.safeExistsSync(manifestPath, projectRoot)) continue;
      try {
        const content = SecurityUtils.safeReadFileSync(manifestPath, projectRoot, 'utf8') || '';
        if (/org\.springframework\.boot|spring-boot-(?:starter|dependencies|plugin)/i.test(content)) {
          const versionMatch = content.match(/spring-boot[^\n<]*[<:'"\s]+([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i)
            || content.match(/<version>\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)\s*<\/version>/i);
          detectedFrameworks.push({
            id: 'spring-boot', name: FRAMEWORKS['spring-boot'].name,
            description: 'Spring Boot project with message bundle support',
            confidence: 0.85, version: versionMatch?.[1] || '', priority: 0
          });
          break;
        }
      } catch (_) { /* skip */ }
    }
  }

  // Return the framework with highest confidence, if any
  if (detectedFrameworks.length > 0) {
    return detectedFrameworks.sort((a, b) => {
      const confidenceDiff = b.confidence - a.confidence;
      if (confidenceDiff !== 0) return confidenceDiff;
      return (b.priority || 0) - (a.priority || 0);
    })[0];
  }

  return null;
}

function readPyProjectDeps(projectRoot) {
  const deps = [];
  try {
    const reqPath = path.join(projectRoot, 'requirements.txt');
    if (SecurityUtils.safeExistsSync(reqPath, projectRoot)) {
      const content = SecurityUtils.safeReadFileSync(reqPath, projectRoot, 'utf8');
      if (content) {
        for (const line of content.split('\n')) {
          const stripped = line.replace(/[<>=!~].*$/, '').trim();
          if (stripped && !stripped.startsWith('#')) deps.push(stripped.toLowerCase().replace(/[_-]/g, ''));
        }
      }
    }
  } catch (_) { /* skip */ }
  return deps;
}

module.exports = { detectFramework, FRAMEWORKS, FRAMEWORK_COMPATIBILITY,
  SOURCE_EXTENSIONS, SCANNER_EXTENSIONS, EXCLUDE_DIRS, SOURCE_DIRS,
  FRAMEWORK_PATTERNS, FRAMEWORK_SUGGESTIONS, WRAPPER_SKIP_PATTERNS,
  getFrameworkPatterns, extractFrameworkMessages, getFrameworkSuggestions, getSourceExtensions, getExcludeDirs,
  detectProjectFramework, detectProjectFrameworks };
