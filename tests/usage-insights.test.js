const assert = require('node:assert/strict');
const test = require('node:test');

const {
  analyzeSourceForUsageInsights,
  createTextKey,
  deriveNamespaceCandidates,
} = require('../utils/usage-insights');

test('usage insights finds literal known keys outside direct t calls', () => {
  const content = `
    const checkoutKey = 'shop.checkout.title';
    const label = t('common.save');
  `;

  const insights = analyzeSourceForUsageInsights({
    content,
    relativePath: 'app/shop/page.tsx',
    availableKeys: new Set(['shop.checkout.title', 'common.save', 'shop.unused']),
    directKeys: ['common.save'],
    translationValueIndex: new Map(),
  });

  assert.deepEqual(
    insights.keyReferences.map(ref => [ref.key, ref.matchType]),
    [
      ['common.save', 'direct'],
      ['shop.checkout.title', 'literal'],
    ]
  );
});

test('usage insights recommends route namespace alignment for page files', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `export default function Shop() { return <h1>{t('common.title')}</h1>; }`,
    relativePath: 'app/shop/page.tsx',
    availableKeys: new Set(['common.title', 'shop.title']),
    directKeys: ['common.title'],
    translationValueIndex: new Map(),
  });

  assert.deepEqual(deriveNamespaceCandidates('app/shop/page.tsx'), ['shop']);
  assert.equal(insights.namespaceRecommendation.namespace, 'shop');
  assert.equal(insights.namespaceRecommendation.expectedFile, 'shop.json');
  assert.match(insights.namespaceRecommendation.message, /shop\.\*/);
});

test('usage insights reports hardcoded text and prefers existing matching translation values', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      export function Button() {
        return <button aria-label="Start checkout">Start checkout</button>;
      }
    `,
    relativePath: 'app/shop/page.tsx',
    availableKeys: new Set(['shop.startCheckout']),
    directKeys: [],
    translationValueIndex: new Map([['Start checkout', 'shop.startCheckout']]),
  });

  assert.ok(insights.hardcodedTexts.length >= 1);
  assert.equal(insights.hardcodedTexts[0].text, 'Start checkout');
  assert.equal(insights.hardcodedTexts[0].existingKey, 'shop.startCheckout');
  assert.equal(createTextKey('Start checkout', 'shop'), 'shop.start_checkout');
});

test('usage insights resolves simple dynamic template keys before wildcard fallback', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      const action = 'save';
      export function Button() {
        return <button>{t(\`common.\${action}\`)}</button>;
      }
    `,
    relativePath: 'app/shop/page.tsx',
    availableKeys: new Set(['common.save', 'common.cancel']),
    directKeys: ['common.*'],
    translationValueIndex: new Map(),
  });

  assert.deepEqual(
    insights.keyReferences.map(ref => [ref.key, ref.matchType]),
    [['common.save', 'dynamic-template']]
  );
});

test('usage insights resolves tx wrapper dynamic template keys', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      const statuses = ['open', 'closed'];
      statuses.map(normalized => tx(\`tournaments.status.\${normalized}\`));
    `,
    relativePath: 'app/tournaments/page.tsx',
    availableKeys: new Set(['tournaments.status.open', 'tournaments.status.closed', 'tournaments.status.pending']),
    directKeys: ['tournaments.status.*'],
    translationValueIndex: new Map(),
  });

  assert.deepEqual(
    insights.keyReferences.map(ref => [ref.key, ref.matchType]),
    [
      ['tournaments.status.open', 'dynamic-template'],
      ['tournaments.status.closed', 'dynamic-template'],
    ]
  );
});

test('usage insights reports unresolved tx dynamic expressions without wildcard over-credit', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      export function Status({ normalized }) {
        return <span>{tx(\`tournaments.status.\${normalized}\`)}</span>;
      }
    `,
    relativePath: 'app/tournaments/page.tsx',
    availableKeys: new Set(['tournaments.status.open', 'tournaments.status.closed']),
    directKeys: ['tournaments.status.*'],
    translationValueIndex: new Map(),
  });

  assert.deepEqual(insights.keyReferences, []);
  assert.equal(insights.unresolvedDynamicReferences.length, 1);
  assert.equal(insights.unresolvedDynamicReferences[0].prefix, 'tournaments.status.');
});

test('usage insights expands bounded dynamic key arrays to exact available keys', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      const actions = ['save', 'cancel'];
      actions.map(action => t(\`common.\${action}\`));
    `,
    relativePath: 'app/settings/page.tsx',
    availableKeys: new Set(['common.save', 'common.cancel', 'common.delete']),
    directKeys: ['common.*'],
    translationValueIndex: new Map(),
  });

  assert.deepEqual(
    insights.keyReferences.map(ref => [ref.key, ref.matchType]),
    [
      ['common.save', 'dynamic-template'],
      ['common.cancel', 'dynamic-template'],
    ]
  );
});

test('usage insights expands bounded object-map key lookups to exact available keys', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      const labelKeys = { save: 'common.save', cancel: 'common.cancel' };
      export function Actions({ action }) {
        return <button>{t(labelKeys[action])}{t(labelKeys.save)}</button>;
      }
    `,
    relativePath: 'app/settings/page.tsx',
    availableKeys: new Set(['common.save', 'common.cancel', 'common.delete']),
    directKeys: [],
    translationValueIndex: new Map(),
  });

  assert.deepEqual(
    insights.keyReferences.map(ref => [ref.key, ref.matchType]),
    [
      ['common.save', 'dynamic-variable'],
      ['common.cancel', 'dynamic-variable'],
    ]
  );
});

test('usage insights resolves object-map property key lookups', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      const labelKeys = { save: 'common.save', cancel: 'common.cancel' };
      export function Save() {
        return <button>{t(labelKeys.save)}</button>;
      }
    `,
    relativePath: 'app/settings/page.tsx',
    availableKeys: new Set(['common.save', 'common.cancel']),
    directKeys: [],
    translationValueIndex: new Map(),
  });

  assert.deepEqual(
    insights.keyReferences.map(ref => [ref.key, ref.matchType]),
    [['common.save', 'dynamic-variable']]
  );
});

test('usage insights reports unresolved dynamic expressions without wildcard over-credit', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      export function ServerLabel({ keyFromApi }) {
        return <span>{t(\`common.\${keyFromApi}\`)}</span>;
      }
    `,
    relativePath: 'app/settings/page.tsx',
    availableKeys: new Set(['common.save', 'common.cancel']),
    directKeys: ['common.*'],
    translationValueIndex: new Map(),
  });

  assert.deepEqual(insights.keyReferences, []);
  assert.equal(insights.unresolvedDynamicReferences.length, 1);
  assert.equal(insights.unresolvedDynamicReferences[0].prefix, 'common.');
  assert.match(insights.unresolvedDynamicReferences[0].expression, /keyFromApi/);
});

test('hardcoded text filtering rejects JS/TS built-in type names', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      export function Example() {
        return <button aria-label="Promise" title="Boolean" alt="String">Promise</button>;
      }
    `,
    relativePath: 'app/example/page.tsx',
    availableKeys: new Set(),
    directKeys: [],
    translationValueIndex: new Map(),
  });

  assert.deepEqual(insights.hardcodedTexts, []);
});

test('hardcoded text filtering rejects code expressions with && operator', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      export function Example() {
        return <span>= 0 && visibleRow</span>;
      }
    `,
    relativePath: 'app/example/page.tsx',
    availableKeys: new Set(),
    directKeys: [],
    translationValueIndex: new Map(),
  });

  assert.deepEqual(insights.hardcodedTexts, []);
});

test('hardcoded text filtering rejects code expressions with || operator', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      export function Example() {
        return <span>a || b</span>;
      }
    `,
    relativePath: 'app/example/page.tsx',
    availableKeys: new Set(),
    directKeys: [],
    translationValueIndex: new Map(),
  });

  assert.deepEqual(insights.hardcodedTexts, []);
});

test('hardcoded text filtering rejects template literal interpolation', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      export function Example() {
        return <span>{log(\`\${input.value} PDT chip\`)}</span>;
      }
    `,
    relativePath: 'app/example/page.tsx',
    availableKeys: new Set(),
    directKeys: [],
    translationValueIndex: new Map(),
  });

  assert.deepEqual(insights.hardcodedTexts, []);
});

test('hardcoded text filtering rejects arrow function syntax', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      export function Example() {
        return <span>= () => true</span>;
      }
    `,
    relativePath: 'app/example/page.tsx',
    availableKeys: new Set(),
    directKeys: [],
    translationValueIndex: new Map(),
  });

  assert.deepEqual(insights.hardcodedTexts, []);
});

test('hardcoded text still detects real human text like welcome messages', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      export function Welcome() {
        return <h1>Welcome to our store</h1>;
      }
    `,
    relativePath: 'app/welcome/page.tsx',
    availableKeys: new Set(),
    directKeys: [],
    translationValueIndex: new Map(),
  });

  assert.ok(insights.hardcodedTexts.length >= 1);
  assert.ok(insights.hardcodedTexts.some(h => h.text.includes('Welcome')));
});

test('hardcoded text filtering rejects strict equality operator strings', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      export function Example() {
        return <span>x === 0 && y !== 1</span>;
      }
    `,
    relativePath: 'app/example/page.tsx',
    availableKeys: new Set(),
    directKeys: [],
    translationValueIndex: new Map(),
  });

  assert.deepEqual(insights.hardcodedTexts, []);
});

test('hardcoded text still detects standard HTML attribute text', () => {
  const insights = analyzeSourceForUsageInsights({
    content: `
      export function Submit() {
        return <button aria-label="Submit form" title="Click to submit">Submit</button>;
      }
    `,
    relativePath: 'app/submit/page.tsx',
    availableKeys: new Set(),
    directKeys: [],
    translationValueIndex: new Map(),
  });

  assert.ok(insights.hardcodedTexts.length >= 1);
  assert.ok(insights.hardcodedTexts.some(h => h.text === 'Submit form'));
});
