'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const core = require('../runtime/core');
const nodeRuntime = require('../runtime/node');
const enhanced = require('../runtime/enhanced');
const { createStaticLoader } = require('../runtime/static');
const { createReactBindings } = require('../runtime/react');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`);
}

test('universal core has no Node built-ins and preserves SSR/hydration snapshots', () => {
  const source = fs.readFileSync(path.join(__dirname, '../runtime/core.js'), 'utf8');
  assert.doesNotMatch(source, /require\(['"](?:fs|path|crypto|events)['"]\)|\bprocess\.|\bBuffer\b/);
  const resources = {
    en: { common: { title: 'Title', same: 'same' } },
    de: { common: { title: 'Titel' } }
  };
  const server = core.createRuntime({ locale: 'de-CH', fallbackLocale: 'en', resources });
  const client = core.createRuntime({ locale: 'de-CH', fallbackLocale: 'en', resources: JSON.parse(JSON.stringify(resources)) });
  assert.equal(server.t('title', {}, { namespace: 'common' }), 'Titel');
  assert.equal(client.t('title', {}, { namespace: 'common' }), server.t('title', {}, { namespace: 'common' }));
  assert.equal(server.t('same', {}, { namespace: 'common' }), 'same');
  assert.equal(server.has('same', { namespace: 'common' }), true, 'key-equals-value must not be treated as missing');
  server.dispose();
  assert.throws(() => server.t('title', {}, { namespace: 'common' }), /disposed/);
});

test('universal loader deduplicates concurrent loads and exposes real locales', async () => {
  let loads = 0;
  const loader = {
    async load(locale) {
      loads++;
      await Promise.resolve();
      return { common: { hello: locale === 'fr' ? 'Bonjour' : 'Hello' } };
    }
  };
  const runtime = core.createRuntime({ locale: 'fr', fallbackLocale: 'en', loader });
  await Promise.all([runtime.load('fr'), runtime.load('fr')]);
  assert.equal(loads, 1);
  assert.deepEqual(runtime.listLocales(), ['fr']);
  assert.equal(runtime.t('hello', {}, { namespace: 'common' }), 'Bonjour');

  const staticRuntime = await core.initRuntime({
    locale: 'en',
    loader: createStaticLoader({ en: { common: { hello: 'Static hello' } } }),
    namespaces: ['common']
  });
  assert.equal(staticRuntime.t('hello', {}, { namespace: 'common' }), 'Static hello');
});

test('universal locale discovery, fallback aliases, and invalid locale handling are consistent', async () => {
  let discoveries = 0;
  const runtime = await core.initRuntime({
    locale: 'fr-CA',
    fallbackLanguage: 'en',
    preload: false,
    resources: { en: { common: { hello: 'Hello' } } },
    loader: {
      async listLocales() { discoveries++; return ['fr_CA', 'de']; },
      async load() { return {}; }
    }
  });
  assert.equal(discoveries, 1);
  assert.deepEqual(runtime.listLocales(), ['de', 'en', 'fr-CA']);
  assert.equal(runtime.has('hello', { namespace: 'common', language: 'fr-CA', fallbackLanguage: 'en' }), true);
  assert.throws(() => runtime.addResources('%%%invalid', 'common', { hello: 'No' }),
    error => error.code === 'I18NTK_RUNTIME_VALIDATION');
  assert.equal(runtime.listLocales().includes(''), false);
});

test('universal runtime isolates plugin failures and completes disposed in-flight loads safely', async () => {
  let releaseLoad;
  const runtime = core.createRuntime({
    locale: 'es-MX',
    fallbackLocale: 'pt-BR',
    resources: { pt: { common: { title: 'TÃ­tulo' } } },
    loader: { load: () => new Promise(resolve => { releaseLoad = resolve; }) }
  });
  let listenerCalls = 0;
  runtime.subscribe(() => { listenerCalls++; throw new Error('observer failure'); });
  runtime.addPlugin({ name: 'broken', transform() { throw new Error('plugin failure'); } });
  assert.equal(runtime.t('title', {}, { namespace: 'common' }), 'TÃ­tulo');
  assert.ok(listenerCalls > 0);
  assert.ok(runtime.getDiagnostics().some(item => item.category === 'plugin-error' && item.plugin === 'broken'));
  assert.equal(runtime.getPluralCategory(2), 'other');
  assert.equal(typeof runtime.formatList(['A', 'B']), 'string');

  const pending = runtime.load('fr');
  await Promise.resolve();
  runtime.dispose();
  releaseLoad({ common: { title: 'Titre' } });
  await pending;
});

test('universal resource precedence and load-error policies are deterministic', async () => {
  const runtime = core.createRuntime({
    locale: 'en',
    resources: { en: { common: { title: 'Original' } } },
    loadErrorPolicy: 'report-and-fallback',
    loader: { async load() { return null; } }
  });
  runtime.addResources('en', 'common', { title: 'Fallback', added: 'Added' }, { precedence: 'fallback' });
  assert.equal(runtime.t('title', {}, { namespace: 'common' }), 'Original');
  assert.equal(runtime.t('added', {}, { namespace: 'common' }), 'Added');
  runtime.addResources('en', 'common', { title: 'Override' });
  assert.equal(runtime.t('title', {}, { namespace: 'common' }), 'Override');
  assert.throws(() => runtime.addResources('en', 'common', { title: 'Invalid' }, { precedence: 'unknown' }),
    error => error.code === 'I18NTK_RUNTIME_VALIDATION');
  runtime.addPlugin({ name: 'unique' });
  assert.throws(() => runtime.addPlugin({ name: 'unique' }), error => error.code === 'I18NTK_RUNTIME_VALIDATION');
  await runtime.load('fr');
  assert.ok(runtime.getDiagnostics().some(item => item.category === 'load-error'));

  const strict = core.createRuntime({ locale: 'en', missingKeyPolicy: 'throw' });
  assert.throws(() => strict.t('missing'), error => error.code === 'I18NTK_RUNTIME_MISSING_KEY');
  await assert.rejects(core.initRuntime({ loader: { async load() { throw new Error('malformed resource'); } } }),
    error => error.code === 'I18NTK_RUNTIME_LOAD');
});

test('React translation subscriptions change snapshot when resources change', () => {
  const runtime = core.createRuntime({ locale: 'en', resources: { en: { common: { title: 'Before' } } } });
  let subscribed;
  let getSnapshot;
  let notified = 0;
  const React = {
    createContext: () => ({ Provider: function Provider() {} }),
    createElement: () => null,
    useContext: () => runtime,
    useCallback: callback => callback,
    useSyncExternalStore: (subscribe, snapshot) => {
      subscribed = subscribe;
      getSnapshot = snapshot;
      return snapshot();
    }
  };
  const { useTranslation } = createReactBindings(React);
  const translate = useTranslation('common');
  const before = getSnapshot();
  const unsubscribe = subscribed(() => { notified++; });
  runtime.addResources('en', 'common', { title: 'After' });
  assert.equal(notified, 1);
  assert.notEqual(getSnapshot(), before);
  assert.equal(translate('title'), 'After');
  unsubscribe();
});

test('Node runtime resolves projectRoot with localeDir and reports malformed resources', () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-runtime-51-node-'));
  const previousCwd = process.cwd();
  try {
    writeJson(path.join(project, 'locales', 'en.json'), { greeting: 'Project greeting' });
    writeJson(path.join(project, 'locales', 'de.json'), { greeting: 'Elternsprache' });
    fs.writeFileSync(path.join(project, 'locales', 'fr.json'), '{ invalid json');
    writeJson(path.join(project, 'locales', 'app.json'), { greeting: 'Noise' });
    writeJson(path.join(project, 'locales', 'components', 'not-a-locale.json'), { greeting: 'Noise' });
    process.chdir(os.tmpdir());
    const runtime = nodeRuntime.initRuntime({
      projectRoot: project,
      localeDir: 'locales',
      language: 'en',
      fallbackLanguage: 'en',
      preload: true
    });
    assert.equal(runtime.t('greeting'), 'Project greeting');
    assert.equal(runtime.t('greeting', {}, { language: 'de-CH' }), 'Elternsprache');
    assert.deepEqual(runtime.getAvailableLanguages().sort(), ['de', 'en', 'fr']);
    runtime.addPlugin({ name: 'broken', transform() { throw new Error('plugin failure'); } });
    assert.equal(runtime.t('greeting'), 'Project greeting');
    assert.ok(runtime.getDiagnostics().some(item => item.type === 'pluginError' && item.plugin === 'broken'));
    runtime.translate('missing', {}, { language: 'fr' });
    assert.ok(runtime.getDiagnostics().some(item => item.type === 'loadError' && item.resource === 'fr.json'));
  } finally {
    process.chdir(previousCwd);
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('enhanced compatibility instances are isolated and do not own process lifecycle', async () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-runtime-51-enhanced-'));
  const before = {
    sigint: process.listenerCount('SIGINT'),
    uncaught: process.listenerCount('uncaughtException')
  };
  const enhancedSource = fs.readFileSync(path.join(__dirname, '../runtime/enhanced.js'), 'utf8');
  assert.doesNotMatch(enhancedSource, /process\.(?:on|once)\(|setInterval\s*\(/);
  try {
    writeJson(path.join(project, 'one', 'en.json'), { greeting: 'One' });
    writeJson(path.join(project, 'two', 'en.json'), { greeting: 'Two' });
    const first = await enhanced.initI18nRuntime({ baseDir: path.join(project, 'one'), defaultLanguage: 'en', cache: { ttl: 1 } });
    const second = await enhanced.initI18nRuntime({ baseDir: path.join(project, 'two'), defaultLanguage: 'en' });
    assert.equal(await first.translate('greeting'), 'One');
    const metrics = first.getMetrics();
    assert.equal(metrics.translationCount, 1);
    assert.equal(metrics.averageTranslationDurationMs, metrics.translationDurationMsTotal / metrics.translationCount);
    assert.equal(await second.translate('greeting'), 'Two');
    assert.equal(first.getConfig().cache.enabled, true);
    assert.equal(first.getConfig().cache.maxSize, 1000);
    assert.equal(first.getConfig().cache.ttl, 1);
    assert.equal(Object.isFrozen(first.config), true);
    await assert.rejects(first.updateConfig({ cache: { maxSize: 0 } }), error => error.code === 'I18NTK_RUNTIME_VALIDATION');
    assert.equal(first.getConfig().cache.maxSize, 1000);
    assert.equal(await first.translate('greeting'), 'One');
    assert.throws(() => first.setLanguage('../unsafe'), error => error.code === 'I18NTK_RUNTIME_VALIDATION');
    assert.deepEqual({ sigint: process.listenerCount('SIGINT'), uncaught: process.listenerCount('uncaughtException') }, before);

    let observed;
    first.on('translationError', event => { observed = event.error; });
    await assert.rejects(first.translate(null), error => error.code === 'I18NTK_RUNTIME_VALIDATION');
    assert.equal(observed?.code, 'I18NTK_RUNTIME_VALIDATION');
    first.dispose();
    second.dispose();
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('enhanced namespaces, encryption, and cache settings are functional', async () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-runtime-511-enhanced-'));
  try {
    writeJson(path.join(project, 'en.json'), { disk: 'Before' });
    const runtime = new enhanced.I18nEnhancedRuntime({
      baseDir: project,
      defaultLanguage: 'en',
      encryption: { enabled: true },
      cache: { enabled: false, maxSize: 1, ttl: 0 }
    });
    runtime.addNamespace('custom', { en: { hello: 'Namespaced hello' } });
    assert.equal(await runtime.translate('hello', {}, { namespace: 'custom' }), 'Namespaced hello');
    assert.equal(await runtime.translate('hello'), 'Namespaced hello');
    assert.equal(runtime.has('hello'), true);
    assert.equal(runtime.getEncryptionStatus(), true);
    const encrypted = await runtime.translateEncrypted('hello');
    assert.equal(await runtime.decryptData(encrypted), 'Namespaced hello');
    assert.equal(runtime.getConfig().encryption.key, undefined);
    assert.equal(runtime.getCacheInfo().enabled, false);
    assert.deepEqual(runtime.getCacheInfo().cachedLanguages, []);
    assert.equal(await runtime.translate('disk'), 'Before');
    writeJson(path.join(project, 'en.json'), { disk: 'After' });
    assert.equal(await runtime.translate('disk'), 'After');
    assert.throws(() => runtime.setEncryptionKey('weak'), error => error.code === 'I18NTK_RUNTIME_VALIDATION');
    runtime.dispose();
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('Node cache TTL and maxSize reload and evict deterministically', () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-runtime-511-cache-'));
  let now = 0;
  try {
    writeJson(path.join(project, 'en.json'), { value: 'English one' });
    writeJson(path.join(project, 'fr.json'), { value: 'French' });
    const runtime = nodeRuntime.initRuntime({
      baseDir: project,
      language: 'en',
      fallbackLanguage: 'en',
      cache: { enabled: true, maxSize: 1, ttl: 10 },
      now: () => now
    });
    assert.equal(runtime.t('value'), 'English one');
    writeJson(path.join(project, 'en.json'), { value: 'English two' });
    now = 9;
    assert.equal(runtime.t('value'), 'English one');
    now = 10;
    assert.equal(runtime.t('value'), 'English two');
    assert.equal(runtime.t('value', {}, { language: 'fr' }), 'French');
    assert.deepEqual(runtime.getCacheInfo().cachedLanguages, ['fr']);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('runtime declarations do not advertise missing top-level exports', () => {
  for (const name of ['core', 'index', 'enhanced', 'crypto']) {
    const declarations = fs.readFileSync(path.join(__dirname, `../runtime/${name}.d.ts`), 'utf8');
    const declared = [...declarations.matchAll(/^export\s+(?:class|function|const)\s+([A-Za-z_$][\w$]*)/gm)]
      .map(match => match[1]);
    const implementation = require(`../runtime/${name}.js`);
    for (const exportedName of declared) {
      assert.ok(Object.prototype.hasOwnProperty.call(implementation, exportedName), `${name}.d.ts advertises missing export ${exportedName}`);
    }
  }
});

test('runtime package exports explicit environment adapters without a wildcard', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  for (const entry of ['./runtime', './runtime/node', './runtime/core', './runtime/static', './runtime/fetch', './runtime/react', './runtime/crypto', './runtime/enhanced']) {
    assert.ok(pkg.exports[entry], `Missing export ${entry}`);
  }
  assert.equal(pkg.exports['./runtime/*'], undefined);
  assert.equal(pkg.exports['./runtime'].browser.types, './runtime/core.d.ts');
  assert.equal(pkg.exports['./runtime'].browser.default, './runtime/core.js');
  assert.equal(pkg.exports['./runtime'].node.types, './runtime/index.d.ts');
  assert.equal(pkg.exports['./runtime'].node.default, './runtime/index.js');
  assert.match(fs.readFileSync(path.join(__dirname, '../runtime/core.d.ts'), 'utf8'), /export type TranslationValue/);
  assert.match(fs.readFileSync(path.join(__dirname, '../runtime/index.d.ts'), 'utf8'), /export type TranslationValue/);
});
