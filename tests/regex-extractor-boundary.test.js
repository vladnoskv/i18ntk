const assert = require('node:assert/strict');
const test = require('node:test');

const regexExtractor = require('../utils/extractors/regex');

test('regex extractor does not match t-call patterns inside ordinary method names', () => {
  const content = [
    'const next = searchParams.get("next");',
    'window.localStorage.setItem("pending", "1");',
    'settingsRes.headers.get("etag");',
    'clearWaitlist("all");',
    'response.headers.set("Clear-Site-Data", "\\"cache\\", \\"storage\\"");',
    'const title = t("home.header.nav.markets");',
    'const custom = tx("games.crash.auth.description");',
    'const vue = $t("markets.detail.prediction_summary.sign_in_prompt");'
  ].join('\n');

  const keys = regexExtractor.extract(content, [
    /t\(['"`]([^'"`]+)['"`]/g,
    /tx\(['"`]([^'"`]+)['"`]/g,
    /\$t\(['"`]([^'"`]+)['"`]/g
  ]);

  assert.deepEqual(keys.sort(), [
    'games.crash.auth.description',
    'home.header.nav.markets',
    'markets.detail.prediction_summary.sign_in_prompt'
  ]);
});
