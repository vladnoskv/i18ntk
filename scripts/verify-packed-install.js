'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const SecurityUtils = require('../utils/security');

const root = path.resolve(__dirname, '..');
const expectedVersion = require(path.join(root, 'package.json')).version;
const inferredNpmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const npmCli = process.env.npm_execpath ||
  (SecurityUtils.safeExistsSync(inferredNpmCli, path.dirname(inferredNpmCli)) ? inferredNpmCli : null);
const npm = npmCli ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
const random = crypto.randomBytes(8).toString('hex');
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), `i18ntk-fresh-${random}-`));
const packDir = path.join(sandbox, 'pack');
const installDir = path.join(sandbox, 'consumer');
fs.mkdirSync(packDir); fs.mkdirSync(installDir);

function execute(command, args, cwd, env = {}) {
  return spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env }, timeout: 120000 });
}

function run(command, args, cwd, env = {}) {
  const result = execute(command, args, cwd, env);
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed\n${result.error?.stack || ''}\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

function runNpm(args, cwd, env) { return run(npm, npmCli ? [npmCli, ...args] : args, cwd, env); }

function assertReadable(filePath, description) {
  try { fs.accessSync(filePath, fs.constants.R_OK); }
  catch { throw new Error(`Missing packed ${description}: ${path.relative(installedRoot, filePath).replace(/\\/g, '/')}`); }
}

function collectExportTargets(value, targets = []) {
  if (typeof value === 'string' && value.startsWith('./') && !value.includes('*')) targets.push(value.slice(2));
  else if (value && typeof value === 'object') Object.values(value).forEach(item => collectExportTargets(item, targets));
  return targets;
}

function relativeMarkdownLinks(markdown) {
  const links = [];
  const pattern = /\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = pattern.exec(markdown)) !== null) {
    const raw = match[1].trim().replace(/^<|>$/g, '').split(/\s+["']/)[0];
    if (!raw || raw.startsWith('#') || path.isAbsolute(raw) || /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
    const withoutFragment = raw.split('#')[0].split('?')[0];
    if (withoutFragment) links.push(decodeURIComponent(withoutFragment));
  }
  return [...new Set(links)];
}

function writeJson(filePath, value) {
  SecurityUtils.safeMkdirSync(path.dirname(filePath), sandbox, { recursive: true });
  if (!SecurityUtils.safeWriteFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, sandbox, 'utf8')) {
    throw new Error(`Unable to write sandbox fixture: ${path.relative(sandbox, filePath)}`);
  }
}

let installedRoot;

try {
  const npmEnv = { npm_config_cache: path.join(sandbox, '.npm-cache') };
  let tarball;
  if (process.argv[2]) {
    tarball = path.resolve(root, process.argv[2]);
    if (path.extname(tarball) !== '.tgz' || !SecurityUtils.safeExistsSync(tarball, path.dirname(tarball))) {
      throw new Error(`Packed artifact does not exist or is not a .tgz file: ${process.argv[2]}`);
    }
  } else {
    const output = runNpm(['pack', '--ignore-scripts', '--json', '--pack-destination', packDir], root, npmEnv);
    const metadataStart = output.match(/\[\s*\{\s*"id"\s*:/);
    const jsonStart = metadataStart ? metadataStart.index : -1;
    if (jsonStart < 0) throw new Error(`npm pack did not return JSON metadata:\n${output}`);
    const metadata = JSON.parse(output.slice(jsonStart));
    tarball = path.join(packDir, metadata[0].filename);
  }
  const manifest = fs.openSync(path.join(installDir, 'package.json'), 'w', 0o600);
  try { fs.writeSync(manifest, JSON.stringify({ name: `i18ntk-sandbox-${random}`, private: true })); }
  finally { fs.closeSync(manifest); }
  runNpm(['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], installDir, npmEnv);
  const installed = path.join(installDir, 'node_modules', 'i18ntk');
  installedRoot = installed;
  const pkg = require(path.join(installed, 'package.json'));
  if (pkg.version !== expectedVersion) throw new Error(`Expected packed version ${expectedVersion}, received ${pkg.version}`);
  require(installed);
  for (const target of Object.values(pkg.bin || {})) {
    const absolute = path.join(installed, target);
    try { fs.accessSync(absolute, fs.constants.R_OK); }
    catch { throw new Error(`Missing packed bin target: ${target}`); }
  }
  for (const required of ['LICENSE', 'COMMERCIAL-LICENSE.md']) {
    assertReadable(path.join(installed, required), 'licensing document');
  }
  if (pkg.license !== 'SEE LICENSE IN LICENSE') throw new Error(`Unexpected packed license metadata: ${pkg.license}`);
  const publicTargets = [...collectExportTargets(pkg.exports), pkg.main, pkg.types].filter(Boolean);
  for (const target of [...new Set(publicTargets)]) assertReadable(path.join(installed, target), 'public export');
  for (const target of ['runtime/index.js', 'runtime/enhanced.js', 'utils/report-model.js']) require(path.join(installed, target));
  const readmePath = path.join(installed, 'README.md');
  const readme = SecurityUtils.safeReadFileSync(readmePath, installed, 'utf8');
  if (!readme) throw new Error('Unable to read packed README.md');
  for (const target of relativeMarkdownLinks(readme)) {
    const resolved = path.resolve(installed, target);
    if (resolved !== installed && !resolved.startsWith(`${installed}${path.sep}`)) {
      throw new Error(`Packed README link escapes the package: ${target}`);
    }
    assertReadable(resolved, 'README link target');
  }
  if (pkg.versionInfo?.apiReference) assertReadable(path.resolve(installed, pkg.versionInfo.apiReference), 'API reference');
  if (SecurityUtils.safeExistsSync(path.join(installed, 'i18ntk', 'package.json'), installed)) {
    throw new Error('Packed package contains a duplicate nested i18ntk package tree');
  }
  const markerApi = require(path.join(installed, 'utils/license-marker.js'));
  const marker = markerApi.createLicenseMarker({ licenseId: 'LIC-PACK-VERIFY', domains: ['example.com'] });
  if (!markerApi.validateLicenseMarker(marker, { domain: 'example.com' }).valid) throw new Error('Packed license marker API failed');

  const project = path.join(installDir, 'fixture-project');
  SecurityUtils.safeMkdirSync(path.join(project, 'src', 'components'), sandbox, { recursive: true });
  if (!SecurityUtils.safeWriteFileSync(path.join(project, 'src', 'components', 'app.js'), "export const label = 'Application copy';\n", sandbox, 'utf8')) {
    throw new Error('Unable to write sandbox application fixture');
  }
  writeJson(path.join(project, '.i18ntk-config'), {
    version: pkg.version,
    setup: { completed: true, version: pkg.version },
    sourceDir: './locales',
    i18nDir: './locales',
    sourceLanguage: 'en',
    defaultLanguages: ['en', 'fr']
  });
  writeJson(path.join(project, 'locales', 'en', 'common.json'), {
    greeting: 'Hello {name}', group: { count: 2, enabled: true, choices: ['One', 'Two'] }
  });
  writeJson(path.join(project, 'locales', 'fr', 'common.json'), {
    greeting: 'Bonjour {name}', group: { count: 2, enabled: true, choices: ['Un', 'Deux'] }
  });
  writeJson(path.join(project, 'locales', 'app.json'), { greeting: 'Not a locale' });
  writeJson(path.join(project, 'runtime-locales', 'en.json'), { greeting: 'Hello {name}' });
  writeJson(path.join(project, 'runtime-locales', 'fr.json'), { greeting: 'Bonjour {name}' });
  writeJson(path.join(project, 'runtime-locales', 'de.json'), { greeting: 'Hallo {name}' });
  writeJson(path.join(project, 'runtime-locales', 'app.json'), { greeting: 'Not a locale' });

  const cliEnv = { CI: 'true', NO_COLOR: '1', I18NTK_DISABLE_AUTOSAVE: '1' };
  const fixerOutput = run(process.execPath, [path.join(installed, pkg.bin['i18ntk-fixer']),
    '--code-dir=./src', '--locales-dir=./locales', '--source-locale=en', '--languages=fr',
    '--dry-run', '--json', '--indent=0', '--no-prompt'], project, cliEnv);
  const fixerJson = JSON.parse(fixerOutput);
  if (fixerJson.stats?.languages !== 1) throw new Error('Packed fixer did not honor distinct code/locales directories or language filtering');

  const validateOutput = run(process.execPath, [path.join(installed, pkg.bin['i18ntk-validate']),
    '--source-dir=./locales', '--source-locale=en', '--json', '--no-prompt'], project, cliEnv);
  const validateJson = JSON.parse(validateOutput);
  if (validateJson.data?.results?.fr?.summary?.percentage !== 100) {
    throw new Error('Packed validator did not report matching non-string locale structures as 100% complete');
  }
  writeJson(path.join(project, 'locales', 'fr', 'common.json'), {
    greeting: '[FR] Hello {name}', group: { count: 2, enabled: true, choices: ['', 'Prefix NOT_TRANSLATED suffix'] }
  });
  const strictValidation = execute(process.execPath, [path.join(installed, pkg.bin['i18ntk-validate']),
    '--source-dir=./locales', '--source-locale=en', '--strict', '--json', '--no-prompt'], project, cliEnv);
  if (strictValidation.status === 0) throw new Error('Packed strict validator accepted incomplete translation markers');
  const strictJson = JSON.parse(strictValidation.stdout);
  if (strictJson.stats?.errors < 3 || strictJson.data?.results?.fr?.summary?.percentage >= 100) {
    throw new Error('Packed validator did not promote or count incomplete translation values');
  }

  const runtimeProbe = `
    const assert = module['require']('node:assert/strict');
    const runtimeApi = module['require']('i18ntk/runtime/node');
    const enhancedApi = module['require']('i18ntk/runtime/enhanced');
    const before = [process.listenerCount('SIGINT'), process.listenerCount('uncaughtException')];
    const runtime = runtimeApi.initRuntime({ projectRoot: process.env.I18NTK_FIXTURE, localeDir: 'runtime-locales', language: 'de-CH', fallbackLanguage: 'en' });
    assert.equal(runtime.t('greeting', { name: 'Ada' }), 'Hallo Ada');
    assert.equal(runtime.has('greeting', { language: 'es', fallbackLanguage: 'de' }), true);
    assert.deepEqual(runtime.getAvailableLanguages().sort(), ['de', 'en', 'fr']);
    const one = new enhancedApi.I18nEnhancedRuntime({ projectRoot: process.env.I18NTK_FIXTURE, localeDir: 'runtime-locales', defaultLanguage: 'en', cache: { ttl: 1 } });
    const two = new enhancedApi.I18nEnhancedRuntime({ projectRoot: process.env.I18NTK_FIXTURE, localeDir: 'runtime-locales', defaultLanguage: 'fr' });
    assert.notEqual(one, two);
    assert.equal(one.getConfig().cache.maxSize, 1000);
    one.addNamespace('custom', { en: { hello: 'Hello namespace' } });
    assert.equal(await one.translate('hello', {}, { namespace: 'custom' }), 'Hello namespace');
    assert.equal(await one.translate('hello'), 'Hello namespace');
    const encryptedRuntime = new enhancedApi.I18nEnhancedRuntime({ encryption: { enabled: true } });
    assert.equal(encryptedRuntime.getEncryptionStatus(), true);
    const encrypted = await encryptedRuntime.translateEncrypted('missing');
    assert.equal(await encryptedRuntime.decryptData(encrypted), 'missing');
    encryptedRuntime.dispose();
    assert.deepEqual([process.listenerCount('SIGINT'), process.listenerCount('uncaughtException')], before);
    one.dispose(); two.dispose(); runtime.dispose();
  `;
  run(process.execPath, ['-e', `(async () => { ${runtimeProbe} })().catch(error => { console.error(error); process.exitCode = 1; })`], installDir, { I18NTK_FIXTURE: project });

  const esmProbe = `
    import assert from 'node:assert/strict';
    const runtime = await import('i18ntk/runtime/core');
    assert.equal(runtime.createRuntime({ resources: { en: { common: { ready: 'Ready' } } } }).t('ready', {}, { namespace: 'common' }), 'Ready');
    const staticApi = await import('i18ntk/runtime/static');
    const discovered = await staticApi.initRuntime({ locale: 'en', preload: false, loader: staticApi.createStaticLoader({ en: {}, fr: {}, de: {} }) });
    assert.deepEqual(discovered.listLocales(), ['de', 'en', 'fr']);
    assert.throws(() => discovered.addResources('not valid!', 'default', { ready: 'No' }), error => error.code === 'I18NTK_RUNTIME_VALIDATION');
  `;
  run(process.execPath, ['--input-type=module', '-e', esmProbe], installDir);
  const browserTarget = run(process.execPath, ['--conditions=browser', '-e', "process.stdout.write(module['require']('node:module').createRequire(process.cwd() + '/probe.js').resolve('i18ntk/runtime'))"], installDir);
  if (!browserTarget.replace(/\\/g, '/').endsWith('/runtime/core.js')) throw new Error(`Browser condition resolved Node runtime: ${browserTarget}`);
  const browserApiProbe = run(process.execPath, ['--conditions=browser', '--input-type=module', '-e',
    "const m=await import('i18ntk/runtime'); if(typeof m.createRuntime!=='function'||typeof m.translate!=='undefined'||typeof m.initRuntime!=='function') process.exit(1);"], installDir);

  const adapterProbe = `
    const assert = module['require']('node:assert/strict');
    const localRequire = module['require']('node:module').createRequire(process.cwd() + '/probe.js');
    const coreSource = module['require']('node:fs').readFileSync(localRequire.resolve('i18ntk/runtime/core'), 'utf8');
    assert.doesNotMatch(coreSource, /require\\(['\"](?:fs|path|crypto|events)['\"]\\)|\\bprocess\\.|\\bBuffer\\b/);
    const { createFetchLoader } = localRequire('i18ntk/runtime/fetch');
    const loader = createFetchLoader({ fetch: async () => ({ ok: true, json: async () => ({ ready: 'Fetched' }) }) });
    const crypto = localRequire('i18ntk/runtime/crypto');
    (async () => {
      const loaded = await loader.load('en', ['common']);
      assert.equal(loaded.common.ready, 'Fetched');
      const key = crypto.generateEncryptionKey();
      assert.equal(await crypto.decryptData(await crypto.encryptData('secret', key), key), 'secret');
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  run(process.execPath, ['-e', adapterProbe], installDir);

  process.stdout.write(`Verified ${pkg.name}@${pkg.version} from ${path.basename(tarball)} with CLI and runtime probes in randomized sandbox ${random}\n`);
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
