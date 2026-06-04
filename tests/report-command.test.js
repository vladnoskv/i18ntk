const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('i18ntk report writes JSON, Markdown, and HTML exports', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-report-cli-'));
  const localesDir = path.join(projectRoot, 'locales');
  const srcDir = path.join(projectRoot, 'src');
  const outDir = path.join(projectRoot, 'reports');
  fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
  fs.mkdirSync(path.join(localesDir, 'de'), { recursive: true });
  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), JSON.stringify({ hello: 'Hello', unused: 'Unused' }));
  fs.writeFileSync(path.join(localesDir, 'de', 'common.json'), JSON.stringify({ hello: 'Hallo' }));
  fs.writeFileSync(path.join(srcDir, 'index.js'), "console.log(t('hello'));\n");

  const cli = path.join(__dirname, '..', 'main', 'manage', 'index.js');
  const result = spawnSync(process.execPath, [
    cli,
    'report',
    '--json',
    '--markdown',
    '--html',
    `--source-dir=${srcDir}`,
    `--i18n-dir=${localesDir}`,
    `--out=${outDir}`,
    '--source-language=en'
  ], { cwd: projectRoot, encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.exports.json, path.join(outDir, 'i18ntk-report.json'));
  assert.equal(payload.exports.markdown, path.join(outDir, 'i18ntk-report.md'));
  assert.equal(payload.exports.html, path.join(outDir, 'i18ntk-report.html'));
  assert.equal(fs.existsSync(payload.exports.json), true);
  assert.equal(fs.existsSync(payload.exports.markdown), true);
  assert.equal(fs.existsSync(payload.exports.html), true);
});
