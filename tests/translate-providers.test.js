const assert = require('assert');
const { test } = require('node:test');
const { buildProviderRequest, translateBatch, translateText } = require('../utils/translate/api');
const { redactUrlForLog, validateUrl } = require('../utils/translate/safe-network');
const { parseArgs } = require('../main/i18ntk-translate');

test('translate CLI parses provider option', () => {
  const args = parseArgs(['node', 'i18ntk-translate', 'ui-locales/en.json', 'de', '--provider', 'deepl']);

  assert.strictEqual(args.provider, 'deepl');
});

test('translate CLI uses provider-specific concurrency caps', () => {
  const google = parseArgs(['node', 'i18ntk-translate', 'ui-locales/en.json', 'de', '--provider', 'google', '--concurrency', '100']);
  const googleTooHigh = parseArgs(['node', 'i18ntk-translate', 'ui-locales/en.json', 'de', '--provider', 'google', '--concurrency', '500']);
  const deeplTooHigh = parseArgs(['node', 'i18ntk-translate', 'ui-locales/en.json', 'de', '--provider', 'deepl', '--concurrency', '100']);

  assert.strictEqual(google.concurrency, 100);
  assert.strictEqual(googleTooHigh.concurrency, 100);
  assert.strictEqual(deeplTooHigh.concurrency, 25);
});

test('translate batch applies provider-specific concurrency caps at runtime', async () => {
  let active = 0;
  let maxActive = 0;

  await translateBatch(Array.from({ length: 120 }, (_, index) => `Text ${index}`), 'de', {
    provider: 'google',
    concurrency: 500,
    customFn: async (text) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 1));
      active--;
      return text;
    },
  });

  assert.strictEqual(maxActive, 100);
});

test('DeepL provider posts JSON with authorization header and extracts translated text', async () => {
  let captured;
  const result = await translateText('Hello', 'de', {
    provider: 'deepl',
    sourceLang: 'en',
    deeplApiKey: 'test-key',
    retryCount: 1,
    httpPost: async (url, body, options) => {
      captured = { url, body, options };
      return {
        ok: true,
        status: 200,
        data: {
          translations: [{ text: 'Hallo' }]
        }
      };
    }
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.translated, 'Hallo');
  assert.strictEqual(captured.url, 'https://api-free.deepl.com/v2/translate');
  assert.deepStrictEqual(captured.body, {
    text: ['Hello'],
    target_lang: 'DE',
    source_lang: 'EN'
  });
  assert.strictEqual(captured.options.headers.Authorization, 'DeepL-Auth-Key test-key');
});

test('DeepL provider fails clearly when no API key is configured', async () => {
  const result = await translateText('Hello', 'de', {
    provider: 'deepl',
    retryCount: 1,
    httpPost: async () => {
      throw new Error('must not be called');
    }
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error, 'MissingApiKey');
  assert.match(result.message, /DEEPL_API_KEY/);
});

test('provider URL configuration errors are returned without throwing', async () => {
  const deeplResult = await translateText('Hello', 'de', {
    provider: 'deepl',
    deeplApiKey: 'test-key',
    deeplApiUrl: 'not a url',
    retryCount: 1,
    httpPost: async () => {
      throw new Error('must not be called');
    }
  });

  assert.strictEqual(deeplResult.ok, false);
  assert.strictEqual(deeplResult.error, 'InvalidProviderUrl');
  assert.match(deeplResult.message, /DeepL/);

  const libreResult = await translateText('Hello', 'es', {
    provider: 'libretranslate',
    libreTranslateUrl: 'not a url',
    retryCount: 1,
    httpPost: async () => {
      throw new Error('must not be called');
    }
  });

  assert.strictEqual(libreResult.ok, false);
  assert.strictEqual(libreResult.error, 'InvalidProviderUrl');
  assert.match(libreResult.message, /LibreTranslate/);
});

test('unsupported providers fail clearly without network calls', async () => {
  const result = await translateText('Hello', 'de', {
    provider: 'unknown-provider',
    retryCount: 1,
    httpGet: async () => {
      throw new Error('must not be called');
    },
    httpPost: async () => {
      throw new Error('must not be called');
    }
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error, 'UnsupportedProvider');
  assert.match(result.message, /google, deepl, or libretranslate/);
});

test('LibreTranslate provider posts form data and extracts translated text', async () => {
  let captured;
  const result = await translateText('Hello', 'es', {
    provider: 'libretranslate',
    sourceLang: 'en',
    libreTranslateUrl: 'https://libretranslate.example/translate',
    libreTranslateApiKey: 'optional-key',
    retryCount: 1,
    httpPost: async (url, body, options) => {
      captured = { url, body, options };
      return {
        ok: true,
        status: 200,
        data: {
          translatedText: 'Hola'
        }
      };
    }
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.translated, 'Hola');
  assert.strictEqual(captured.url, 'https://libretranslate.example/translate');
  assert.strictEqual(captured.body, 'q=Hello&source=en&target=es&format=text&api_key=optional-key');
  assert.strictEqual(captured.options.provider, 'libretranslate');
  assert.strictEqual(captured.options.headers['Content-Type'], 'application/x-www-form-urlencoded');
});

test('DeepL custom hosts require explicit opt-in', () => {
  const request = buildProviderRequest('Hello', 'de', {
    provider: 'deepl',
    deeplApiKey: 'test-key',
    deeplApiUrl: 'https://deepl-proxy.example/v2/translate'
  });

  assert.deepStrictEqual(request.requestOptions.allowedHosts, ['api-free.deepl.com', 'api.deepl.com']);

  const optedIn = buildProviderRequest('Hello', 'de', {
    provider: 'deepl',
    deeplApiKey: 'test-key',
    deeplApiUrl: 'https://deepl-proxy.example/v2/translate',
    allowCustomTranslateHosts: true
  });

  assert.deepStrictEqual(
    optedIn.requestOptions.allowedHosts,
    ['api-free.deepl.com', 'api.deepl.com', 'deepl-proxy.example']
  );
});

test('provider URL validation blocks private hosts unless explicitly allowed', () => {
  const blocked = validateUrl('https://127.0.0.1/translate', {
    allowedHosts: ['127.0.0.1'],
    allowedPaths: ['/translate']
  });

  assert.strictEqual(blocked.valid, false);
  assert.strictEqual(blocked.error, 'PrivateHostNotAllowed');

  const allowedForLocalTesting = validateUrl('https://127.0.0.1/translate', {
    allowedHosts: ['127.0.0.1'],
    allowedPaths: ['/translate'],
    allowPrivateHosts: true
  });

  assert.strictEqual(allowedForLocalTesting.valid, true);
});

test('provider URL validation blocks IPv4-mapped IPv6 private hosts', () => {
  const blocked = validateUrl('https://[::ffff:127.0.0.1]/translate', {
    allowedHosts: ['[::ffff:7f00:1]'],
    allowedPaths: ['/translate']
  });

  assert.strictEqual(blocked.valid, false);
  assert.strictEqual(blocked.error, 'PrivateHostNotAllowed');
});

test('network log URL redaction removes translated query text', () => {
  assert.strictEqual(
    redactUrlForLog('https://translate.googleapis.com/translate_a/single?q=Secret%20copy&tl=de#frag'),
    'https://translate.googleapis.com/translate_a/single'
  );
});
