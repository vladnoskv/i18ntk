const fs = require('fs');
const path = require('path');

const FRAMEWORKS = {
  i18next: {
    deps: ['i18next', 'react-i18next', 'next-i18next'],
    globs: ['src/**/*.{js,jsx,ts,tsx}'],
    patterns: [
      /t\(['"`]([^'"`]+)['"`]/g,
      /i18n\.t\(['"`]([^'"`]+)['"`]/g
    ],
    ignore: ['node_modules/**']
  },
  lingui: {
    deps: ['@lingui/core', '@lingui/react'],
    globs: ['src/**/*.{js,jsx,ts,tsx}'],
    patterns: [
      /t\(['"`]([^'"`]+)['"`]/g,
      /_\(['"`]([^'"`]+)['"`]/g
    ],
    ignore: ['node_modules/**']
  },
  formatjs: {
    deps: ['react-intl', '@formatjs/intl'],
    globs: ['src/**/*.{js,jsx,ts,tsx}'],
    patterns: [
      /formatMessage\(\s*\{\s*id:\s*['"`]([^'"`]+)['"`]/g
    ],
    ignore: ['node_modules/**']
  }
};

function detectFramework(projectRoot = process.cwd()) {
  const pkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (e) {
    return null;
  }
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}), ...(pkg.peerDependencies || {}) };
  for (const [name, meta] of Object.entries(FRAMEWORKS)) {
    if (meta.deps.some(d => deps[d])) {
      return { name, ...meta };
    }
  }
  return null;
}

module.exports = { detectFramework, FRAMEWORKS };