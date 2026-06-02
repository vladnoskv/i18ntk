const assert = require('node:assert/strict');
const test = require('node:test');

const {
  findImportedLocaleKeys,
  detectCopyFormatters,
  findClientBoundaryIssues,
  detectMojibakeInTranslations,
  findLiteralKeyReferences,
  analyzeSourceForUsageInsights,
  findUnresolvedDynamicReferences,
} = require('../utils/usage-insights');

test('findImportedLocaleKeys detects import from locales path', () => {
  const content = `
    import en from "../../locales/en/leaderboard.json";
    const copy = en.leaderboard.error;
  `;
  const refs = findImportedLocaleKeys(content);
  assert.equal(refs.length, 1);
  assert.equal(refs[0].key, 'leaderboard.error');
  assert.equal(refs[0].matchType, 'imported-locale');
});

test('findImportedLocaleKeys detects require from translations path', () => {
  const content = `
    const en = require("../../../translations/en/common.json");
    const label = en.button.save;
  `;
  const refs = findImportedLocaleKeys(content);
  assert.equal(refs.length, 1);
  assert.equal(refs[0].key, 'common.button.save');
});

test('findImportedLocaleKeys detects multiple property reads', () => {
  const content = `
    import en from "../locales/en/dashboard.json";
    const title = en.dashboard.title;
    const desc = en.dashboard.description;
  `;
  const refs = findImportedLocaleKeys(content);
  assert.equal(refs.length, 2);
  assert.equal(refs[0].key, 'dashboard.title');
  assert.equal(refs[1].key, 'dashboard.description');
});

test('findImportedLocaleKeys skips non-locale JSON imports', () => {
  const content = `
    import config from "./config.json";
    const val = config.settings;
  `;
  const refs = findImportedLocaleKeys(content);
  assert.equal(refs.length, 0);
});

test('findImportedLocaleKeys handles i18n path in import', () => {
  const content = `
    import en from "../../i18n/en/common.json";
    const x = en.nav.home;
  `;
  const refs = findImportedLocaleKeys(content);
  assert.equal(refs.length, 1);
  assert.equal(refs[0].key, 'common.nav.home');
});

test('detectCopyFormatters flags local tx without runtime call', () => {
  const content = `
    const tx = useCallback((value, params) => formatCopy(value, params), []);
    tx(i18n.wizardCurrentStep, { step: stepLabels[step] });
  `;
  const formatters = detectCopyFormatters(content);
  assert.equal(formatters.length, 1);
  assert.equal(formatters[0].name, 'tx');
  assert.equal(formatters[0].type, 'suspectedCopyFormatter');
  assert.match(formatters[0].message, /does not call a known translation runtime/);
});

test('detectCopyFormatters does not flag tx that calls t()', () => {
  const content = `
    const tx = (key, params, locale) => t(key, params, locale);
    tx("common.save");
  `;
  const formatters = detectCopyFormatters(content);
  assert.equal(formatters.length, 0);
});

test('detectCopyFormatters detects copy and formatCopy as copyFormatters', () => {
  const content = `
    const copy = (value) => value.toUpperCase();
    const formatCopy = (val) => val.trim();
  `;
  const formatters = detectCopyFormatters(content);
  assert.equal(formatters.length, 2);
  assert.equal(formatters[0].name, 'copy');
  assert.equal(formatters[1].name, 'formatCopy');
});

test('detectCopyFormatters does not flag tx that calls i18n.t()', () => {
  const content = `
    const tx = (key) => i18n.t(key);
    tx("dashboard.title");
  `;
  const formatters = detectCopyFormatters(content);
  assert.equal(formatters.length, 0);
});

test('findClientBoundaryIssues detects use client with locale JSON import', () => {
  const content = `
    "use client"
    import en from "../../locales/en/common.json";
    export function ClientCmp() { return <div>{en.hello}</div>; }
  `;
  const issues = findClientBoundaryIssues(content, 'app/page.tsx');
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /use client.*imports locale JSON/);
  assert.equal(issues[0].filePath, 'app/page.tsx');
});

test('findClientBoundaryIssues does not flag server files with locale imports', () => {
  const content = `
    import en from "../../locales/en/dashboard.json";
    export default function ServerPage() { return <div>{en.title}</div>; }
  `;
  const issues = findClientBoundaryIssues(content, 'app/server.tsx');
  assert.equal(issues.length, 0);
});

test('findClientBoundaryIssues detects use client directive at start of file', () => {
  const content = `"use client";
import en from "../locales/en/leaderboard.json";
`;
  const issues = findClientBoundaryIssues(content, 'components/Leaderboard.tsx');
  assert.equal(issues.length, 1);
});

test('detectMojibakeInTranslations finds replacement-character artifacts', () => {
  const issue = detectMojibakeInTranslations('markets.detail.verify', 'Abwicklungspr?fung', 'en', 'de');
  assert.ok(issue);
  assert.equal(issue.key, 'markets.detail.verify');
  assert.equal(issue.locale, 'de');
  assert.equal(issue.artifact, 'Abwicklungspr?fung');
});

test('detectMojibakeInTranslations finds L?ser artifact', () => {
  const issue = detectMojibakeInTranslations('common.save', 'Speichern L?ser Export', 'en', 'de');
  assert.ok(issue);
  assert.equal(issue.artifact, 'L?ser');
});

test('detectMojibakeInTranslations returns null for clean text', () => {
  const issue = detectMojibakeInTranslations('common.save', 'Speichern', 'en', 'de');
  assert.equal(issue, null);
});

test('detectMojibakeInTranslations handles non-string values', () => {
  const issue = detectMojibakeInTranslations('common.save', null, 'en', 'de');
  assert.equal(issue, null);
});

test('detectMojibakeInTranslations finds Verificaci?n artifact', () => {
  const issue = detectMojibakeInTranslations('dashboard.title', 'Verificaci?n completada', 'en', 'es');
  assert.ok(issue);
  assert.equal(issue.artifact, 'Verificaci?n');
});

test('analyzeSourceForUsageInsights includes imported locale keys in keyReferences', () => {
  const content = `
    import dashboard from "../locales/en/dashboard.json";
    const title = dashboard.title;
  `;
  const insights = analyzeSourceForUsageInsights({
    content,
    relativePath: 'app/dashboard/page.tsx',
    availableKeys: new Set(['dashboard.title']),
    directKeys: [],
    translationValueIndex: new Map(),
  });
  // Key should be present regardless of which detection method found it first
  const hasKey = insights.keyReferences.some(r => r.key === 'dashboard.title');
  assert.ok(hasKey, 'dashboard.title should be found');
  // Also verify importedLocaleReferences raw output
  assert.equal(insights.importedLocaleReferences.length, 1);
  assert.equal(insights.importedLocaleReferences[0].key, 'dashboard.title');
});

test('analyzeSourceForUsageInsights includes client boundary issues', () => {
  const content = `
    "use client"
    import en from "../locales/en/common.json";
  `;
  const insights = analyzeSourceForUsageInsights({
    content,
    relativePath: 'components/ClientCmp.tsx',
    availableKeys: new Set(),
    directKeys: [],
    translationValueIndex: new Map(),
  });
  assert.equal(insights.clientBoundaryIssues.length, 1);
});

test('analyzeSourceForUsageInsights includes copy formatters', () => {
  const content = `
    const tx = useCallback((val) => formatCopy(val), []);
  `;
  const insights = analyzeSourceForUsageInsights({
    content,
    relativePath: 'components/Formatted.tsx',
    availableKeys: new Set(),
    directKeys: [],
    translationValueIndex: new Map(),
  });
  assert.equal(insights.copyFormatters.length, 1);
  assert.equal(insights.copyFormatters[0].type, 'suspectedCopyFormatter');
});

test('findUnresolvedDynamicReferences reports unresolved expressions with prefix', () => {
  const refs = findUnresolvedDynamicReferences(
    'const step = getStep(); const label = t(`steps.${step}`);',
    new Set(['steps.one', 'steps.two'])
  );
  assert.equal(refs.length, 1);
  assert.equal(refs[0].prefix, 'steps.');
});

test('findUnresolvedDynamicReferences does not report resolvable expressions', () => {
  const refs = findUnresolvedDynamicReferences(
    'const steps = ["one", "two"]; steps.map(s => t(`nav.${s}`))',
    new Set(['nav.one', 'nav.two'])
  );
  assert.equal(refs.length, 0);
});

test('findLiteralKeyReferences matches known keys as string literals', () => {
  const refs = findLiteralKeyReferences(
    '"common.save" "common.cancel"',
    new Set(['common.save', 'common.cancel', 'common.delete'])
  );
  assert.equal(refs.length, 2);
  const keys = refs.map(r => r.key).sort();
  assert.equal(keys[0], 'common.cancel');
  assert.equal(keys[1], 'common.save');
});

test('findLiteralKeyReferences skips object-value positions', () => {
  const refs = findLiteralKeyReferences(
    'const mapping = { key: "common.save" }',
    new Set(['common.save'])
  );
  // Should not match keys that look like object property values
  assert.equal(refs.length, 0);
});

// === Telemetry/Event Literal Classification Tests ===

test('findLiteralKeyReferences classifies telemetry calls as literal-telemetry', () => {
  const refs = findLiteralKeyReferences(
    'trackEvent("leaderboard.view", { value: "test" })',
    new Set(['leaderboard.view'])
  );
  assert.equal(refs.length, 1);
  assert.equal(refs[0].matchType, 'literal-telemetry');
  assert.equal(refs[0].context.isTelemetry, true);
  assert.match(refs[0].context.contextNote, /telemetry/);
});

test('findLiteralKeyReferences classifies emitDomainEvent as telemetry', () => {
  const refs = findLiteralKeyReferences(
    'emitDomainEvent("duel.created", { duel_id: 1 })',
    new Set(['duel.created'])
  );
  assert.equal(refs.length, 1);
  assert.equal(refs[0].matchType, 'literal-telemetry');
});

test('findLiteralKeyReferences classifies analytics.track as telemetry', () => {
  const refs = findLiteralKeyReferences(
    'analytics.track("user.signup", { source: "organic" })',
    new Set(['user.signup'])
  );
  assert.equal(refs.length, 1);
  assert.equal(refs[0].matchType, 'literal-telemetry');
});

test('findLiteralKeyReferences keeps regular literal for non-telemetry unknown calls', () => {
  const refs = findLiteralKeyReferences(
    'someFunction("common.save")',
    new Set(['common.save'])
  );
  assert.equal(refs.length, 1);
  assert.equal(refs[0].matchType, 'literal');
  assert.equal(refs[0].context.isTelemetry, false);
});

test('findLiteralKeyReferences keeps literal for translation wrapper context', () => {
  const refs = findLiteralKeyReferences(
    't("common.cancel")',
    new Set(['common.cancel'])
  );
  assert.equal(refs.length, 1);

  // In this case it was already found by the regex patterns so literal may dedupe.
  // Test in isolation to verify classification.
  const refs2 = findLiteralKeyReferences(
    'const x = "common.save"',
    new Set(['common.save'])
  );
  assert.equal(refs2.length, 1);
  assert.equal(refs2[0].matchType, 'literal');
});

// === Object-Method Translation Call Tests ===

test('analyzeSourceForUsageInsights detects object.tx method calls', () => {
  const content = `
    const input = { tx: (key, params) => t(key, params) };
    const label = input.tx("markets.question.template", { count: 5 });
  `;
  const insights = analyzeSourceForUsageInsights({
    content,
    relativePath: 'app/markets/page.tsx',
    availableKeys: new Set(['markets.question.template']),
    directKeys: [],
    translationValueIndex: new Map(),
  });
  const hasKey = insights.keyReferences.some(r => r.key === 'markets.question.template');
  assert.ok(hasKey, 'markets.question.template should be detected via object.tx()');
});

test('analyzeSourceForUsageInsights detects .tx static calls', () => {
  const content = `
    const input = { tx: (key) => t(key) };
    const label = input.tx("markets.question.template");
  `;
  const insights = analyzeSourceForUsageInsights({
    content,
    relativePath: 'app/markets/page.tsx',
    availableKeys: new Set(['markets.question.template']),
    directKeys: [],
    translationValueIndex: new Map(),
  });
  const hasKey = insights.keyReferences.some(r => r.key === 'markets.question.template');
  assert.ok(hasKey, 'markets.question.template should be detected via input.tx()');

  // Also check that .tx("literal") is found by the regex extractor
  const dynamicRefs = insights.keyReferences.filter(r => r.matchType === 'dynamic-variable');
  assert.ok(dynamicRefs.length >= 1, '.tx() static call should produce a dynamic reference');
});

// === Local Wrapper Resolution Tests ===

test('findLocalTranslationWrappers detects arrow function wrappers calling t()', () => {
  const wrappers = require('../utils/usage-insights').findLocalTranslationWrappers(
    'const text = (key, fallback) => { const v = tx(key); return v === key ? fallback : v; }'
  );
  assert.ok(wrappers.has('text'));
  const w = wrappers.get('text');
  assert.equal(w.name, 'text');
  assert.equal(w.type, 'translation-wrapper');
});

test('findLocalWrapperCallReferences resolves wrapper calls to keys', () => {
  const { findLocalTranslationWrappers, findLocalWrapperCallReferences } = require('../utils/usage-insights');
  const content = `
    const copy = (key, fallback) => { return tx(key) === key ? fallback : tx(key); };
    const label = copy("games.dice.hero.title", "Xtreme Dice");
  `;
  const wrappers = findLocalTranslationWrappers(content);
  assert.ok(wrappers.has('copy'));
  const refs = findLocalWrapperCallReferences(content, wrappers);
  assert.ok(refs.length >= 1, 'should resolve copy() calls');
  const hasKey = refs.some(r => r.key === 'games.dice.hero.title');
  assert.ok(hasKey);
});

test('analyzeSourceForUsageInsights includes local wrapper references', () => {
  const content = `
    const text = (key, fallback) => { return tx(key); };
    const label = text("games.dice.hero.title", "Fallback");
  `;
  const insights = analyzeSourceForUsageInsights({
    content,
    relativePath: 'app/games/page.tsx',
    availableKeys: new Set(['games.dice.hero.title']),
    directKeys: [],
    translationValueIndex: new Map(),
  });
  const wrapperRefs = insights.keyReferences.filter(r => r.matchType === 'local-wrapper');
  assert.ok(wrapperRefs.length >= 1, 'should find local wrapper calls');
  assert.equal(wrapperRefs[0].key, 'games.dice.hero.title');
});

// === Full End-to-End Integration Tests ===

test('telemetry literal + direct translation call both recognized correctly', () => {
  const content = `
    trackEvent("leaderboard.view", { value: "test" });
    const label = tx("leaderboard.title");
  `;
  const insights = analyzeSourceForUsageInsights({
    content,
    relativePath: 'app/leaderboard/page.tsx',
    availableKeys: new Set(['leaderboard.view', 'leaderboard.title', 'leaderboard.filter.search']),
    directKeys: ['leaderboard.title'],
    translationValueIndex: new Map(),
  });
  const hasDirect = insights.keyReferences.some(r => r.key === 'leaderboard.title' && (r.matchType === 'direct' || r.matchType === 'dynamic-variable'));
  const hasTelemetry = insights.keyReferences.some(r => r.key === 'leaderboard.view' && (r.matchType === 'literal-telemetry' || r.matchType === 'literal'));
  assert.ok(hasDirect, 'direct translation call should be found');
  assert.ok(hasTelemetry, 'telemetry literal should be detected');
});

test('combined pattern: object.tx + local wrapper + literal keywords all detected', () => {
  const content = `
    const helper = (key, fallback) => tx(key) === key ? fallback : tx(key);
    const a = helper("games.plinko.hero.title", "Plinko");
    const b = obj.tx("markets.question.template", { count: 1 });
    trackEvent("duel.created", { id: 1 });
  `;
  const insights = analyzeSourceForUsageInsights({
    content,
    relativePath: 'app/page.tsx',
    availableKeys: new Set(['games.plinko.hero.title', 'markets.question.template', 'duel.created']),
    directKeys: [],
    translationValueIndex: new Map(),
  });
  const keys = insights.keyReferences.map(r => r.key);
  assert.ok(keys.includes('games.plinko.hero.title'), 'local wrapper key found');
  assert.ok(keys.includes('markets.question.template'), 'object.tx key found');
  const telemetry = insights.keyReferences.find(r => r.key === 'duel.created');
  assert.ok(telemetry, 'telemetry key found');
  assert.equal(telemetry.matchType, 'literal-telemetry');
});
