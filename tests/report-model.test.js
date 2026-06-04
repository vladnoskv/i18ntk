const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { generateI18ntkReport, renderReportAsMarkdown, renderReportAsHtml } = require('../utils/report-model');

test('generateI18ntkReport returns the stable schema with locale and issue summaries', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-report-'));
  const localesDir = path.join(projectRoot, 'locales');
  const srcDir = path.join(projectRoot, 'src');
  fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
  fs.mkdirSync(path.join(localesDir, 'fr'), { recursive: true });
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), JSON.stringify({
    hello: 'Hello {{name}}',
    bye: 'Goodbye',
    unused: 'Unused value',
    long: 'Short',
    cta: 'Start checkout'
  }, null, 2));
  fs.writeFileSync(path.join(localesDir, 'fr', 'common.json'), JSON.stringify({
    hello: 'Bonjour',
    bye: 'Goodbye',
    long: 'Ceci est une phrase beaucoup plus longue que la source courte',
    extra: 'Extra'
  }, null, 2));
  fs.writeFileSync(path.join(srcDir, 'app.js'), `
    console.log(t('hello'));
    console.log(t('missing.in.locale'));
    const label = "Start checkout";
  `);

  const report = generateI18ntkReport({
    projectRoot,
    localesDir,
    sourceDir: srcDir,
    sourceLocale: 'en'
  });

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.projectRoot, projectRoot);
  assert.equal(report.config.sourceLocale, 'en');
  assert.equal(report.config.localesDir, localesDir);
  assert.equal(report.summary.localeCount, 2);
  assert.equal(report.summary.totalKeys, 5);
  assert.ok(report.summary.issueCount >= 6);
  assert.ok(report.locales.find(locale => locale.locale === 'fr').missingKeys >= 2);

  const issueTypes = new Set(report.issues.map(issue => issue.type));
  assert.ok(issueTypes.has('missing_key'));
  assert.ok(issueTypes.has('unused_key'));
  assert.ok(issueTypes.has('placeholder_mismatch'));
  assert.ok(issueTypes.has('likely_untranslated'));
  assert.ok(issueTypes.has('expansion_risk'));
  assert.ok(issueTypes.has('hardcoded_text'));

  assert.ok(report.issues.every(issue => issue.id && issue.message));
  assert.match(renderReportAsMarkdown(report), /## Translation completeness/);
  assert.match(renderReportAsHtml(report), /<!doctype html>/i);
});
