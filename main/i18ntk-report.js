#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const SecurityUtils = require('../utils/security');
const {
  generateI18ntkReport,
  renderReportAsMarkdown,
  renderReportAsHtml,
} = require('../utils/report-model');

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    markdown: false,
    html: false,
    out: null,
    sourceDir: null,
    i18nDir: null,
    sourceLocale: 'en',
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    const arg = raw === 'report' ? '' : raw;
    if (!arg) continue;
    const nextValue = () => {
      if (i + 1 < argv.length && !String(argv[i + 1]).startsWith('--')) {
        return argv[++i];
      }
      return null;
    };
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--markdown' || arg === '--md') args.markdown = true;
    else if (arg === '--html') args.html = true;
    else if (arg.startsWith('--out=')) args.out = arg.slice('--out='.length);
    else if (arg === '--out') args.out = nextValue();
    else if (arg.startsWith('--source-dir=')) args.sourceDir = arg.slice('--source-dir='.length);
    else if (arg.startsWith('--code-dir=')) args.sourceDir = arg.slice('--code-dir='.length);
    else if (arg.startsWith('--source-code-dir=')) args.sourceDir = arg.slice('--source-code-dir='.length);
    else if (arg === '--source-dir' || arg === '--code-dir' || arg === '--source-code-dir') args.sourceDir = nextValue();
    else if (arg.startsWith('--i18n-dir=')) args.i18nDir = arg.slice('--i18n-dir='.length);
    else if (arg.startsWith('--locales-dir=')) args.i18nDir = arg.slice('--locales-dir='.length);
    else if (arg === '--i18n-dir' || arg === '--locales-dir') args.i18nDir = nextValue();
    else if (arg.startsWith('--source-language=')) args.sourceLocale = arg.slice('--source-language='.length);
    else if (arg.startsWith('--source-locale=')) args.sourceLocale = arg.slice('--source-locale='.length);
    else if (arg === '--source-language' || arg === '--source-locale') args.sourceLocale = nextValue();
  }

  if (!args.json && !args.markdown && !args.html) {
    args.json = true;
  }
  return args;
}

async function run(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(helpText());
    return { exitCode: 0 };
  }

  const projectRoot = path.resolve(env.I18NTK_PROJECT_ROOT || process.cwd());
  const report = generateI18ntkReport({
    projectRoot,
    sourceDir: args.sourceDir || env.I18NTK_SOURCE_DIR || './src',
    localesDir: args.i18nDir || env.I18NTK_I18N_DIR || './locales',
    sourceLocale: args.sourceLocale || env.I18NTK_SOURCE_LOCALE || 'en',
  });

  const exports = {};
  if (args.out) {
    const outDir = path.resolve(projectRoot, args.out);
    ensureWithin(projectRoot, outDir);
    fs.mkdirSync(outDir, { recursive: true });
    if (args.json) {
      exports.json = path.join(outDir, 'i18ntk-report.json');
      SecurityUtils.safeWriteFileSync(exports.json, `${JSON.stringify({ ...report, exports: undefined }, null, 2)}\n`, projectRoot, 'utf8');
    }
    if (args.markdown) {
      exports.markdown = path.join(outDir, 'i18ntk-report.md');
      SecurityUtils.safeWriteFileSync(exports.markdown, renderReportAsMarkdown(report), projectRoot, 'utf8');
    }
    if (args.html) {
      exports.html = path.join(outDir, 'i18ntk-report.html');
      SecurityUtils.safeWriteFileSync(exports.html, renderReportAsHtml(report), projectRoot, 'utf8');
    }
  }

  const response = Object.keys(exports).length ? { ...report, exports } : report;
  if (args.markdown && !args.json && !args.html && !args.out) {
    process.stdout.write(renderReportAsMarkdown(response));
  } else if (args.html && !args.json && !args.markdown && !args.out) {
    process.stdout.write(renderReportAsHtml(response));
  } else {
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
  }
  return { exitCode: 0, report: response };
}

function ensureWithin(root, target) {
  const rel = path.relative(root, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Report output directory must be inside the project root.');
  }
}

function helpText() {
  return `Usage: i18ntk report [options]

Options:
  --json                    Print/write stable JSON report output
  --markdown                Print/write Markdown report output
  --html                    Print/write HTML report output
  --out <dir>               Write selected report formats into a directory
  --code-dir=<dir>          Source code directory to scan
  --source-code-dir=<dir>   Alias for --code-dir
  --source-dir=<dir>        Legacy alias for --code-dir
  --locales-dir=<dir>       Locale directory
  --i18n-dir=<dir>          Alias for --locales-dir
  --source-locale=<code>    Source locale code (default: en)
  --source-language=<code>  Legacy alias for --source-locale
`;
}

if (require.main === module) {
  run().catch(error => {
    process.stderr.write(`i18ntk report failed: ${error.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  run,
};
