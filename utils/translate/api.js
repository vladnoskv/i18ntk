const { URL } = require('url');
const { safeHttpGet, safeHttpPost, buildGoogleTranslateUrl } = require('./safe-network');

const DEFAULT_CONCURRENCY = 12;
const PROVIDER_CONCURRENCY_LIMITS = {
  google: 100,
  deepl: 25,
  libretranslate: 25,
  custom: 100,
};
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY = 1000;
const MAX_BACKOFF_DELAY = 30000;


function extractTranslation(result) {
  if (result && Array.isArray(result) && result[0]) {
    return result[0]
      .filter((part) => part && typeof part[0] === 'string')
      .map((part) => part[0])
      .join('')
      .trim() || null;
  }
  return null;
}

function normalizeProvider(provider) {
  const value = String(provider || process.env.I18NTK_TRANSLATE_PROVIDER || 'google').trim().toLowerCase();
  if (value === 'deepl-free' || value === 'deepl-pro') return 'deepl';
  if (value === 'libre' || value === 'libretranslate') return 'libretranslate';
  if (value === 'google' || value === 'gtx') return 'google';
  return value;
}

function getProviderConcurrencyLimit(provider) {
  return PROVIDER_CONCURRENCY_LIMITS[normalizeProvider(provider)] || 25;
}

function clampProviderConcurrency(value, provider, fallback = DEFAULT_CONCURRENCY) {
  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), getProviderConcurrencyLimit(provider));
}

function normalizeDeepLLanguage(code) {
  return String(code || '').replace('-', '_').toUpperCase();
}

function getDeepLApiUrl(options = {}) {
  if (options.deeplApiUrl) return options.deeplApiUrl;
  if (process.env.DEEPL_API_URL) return process.env.DEEPL_API_URL;
  return 'https://api-free.deepl.com/v2/translate';
}

function isEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function getDeepLAllowedHosts(url, options = {}) {
  const hosts = ['api-free.deepl.com', 'api.deepl.com'];
  if (options.allowCustomTranslateHosts || isEnabled(process.env.I18NTK_ALLOW_CUSTOM_TRANSLATE_HOSTS)) {
    hosts.push(new URL(url).hostname);
  }
  return [...new Set(hosts)];
}

function parseProviderUrl(url, provider) {
  try {
    return { ok: true, parsed: new URL(url) };
  } catch (error) {
    return {
      ok: false,
      error: 'InvalidProviderUrl',
      message: `${provider} provider URL is invalid: ${error.message}`,
    };
  }
}

function extractDeepLTranslation(data) {
  const value = data && Array.isArray(data.translations) && data.translations[0] && data.translations[0].text;
  return typeof value === 'string' && value.trim() ? value : null;
}

function getLibreTranslateUrl(options = {}) {
  if (options.libreTranslateUrl) return options.libreTranslateUrl;
  if (process.env.LIBRETRANSLATE_URL) return process.env.LIBRETRANSLATE_URL;
  return 'https://libretranslate.com/translate';
}

function getLibreTranslateAllowedHosts(url) {
  return [...new Set(['libretranslate.com', new URL(url).hostname])];
}

function extractLibreTranslateTranslation(data) {
  const value = data && data.translatedText;
  return typeof value === 'string' && value.trim() ? value : null;
}

function buildProviderRequest(text, targetLang, options = {}) {
  const provider = normalizeProvider(options.provider);
  const sourceLang = options.sourceLang || 'en';

  if (provider === 'google') {
    return {
      provider,
      method: 'GET',
      url: buildGoogleTranslateUrl(text, sourceLang, targetLang),
      extract: extractTranslation,
    };
  }

  if (provider === 'deepl') {
    const apiKey = options.deeplApiKey || process.env.DEEPL_API_KEY;
    if (!apiKey) {
      return {
        provider,
        error: 'MissingApiKey',
        message: 'DeepL provider requires DEEPL_API_KEY in the environment or deeplApiKey in options.',
      };
    }

    const url = getDeepLApiUrl(options);
    const parsedUrl = parseProviderUrl(url, 'DeepL');
    if (!parsedUrl.ok) return { provider, error: parsedUrl.error, message: parsedUrl.message };

    return {
      provider,
      method: 'POST',
      url,
      body: {
        text: [text],
        target_lang: normalizeDeepLLanguage(targetLang),
        source_lang: normalizeDeepLLanguage(sourceLang),
      },
      requestOptions: {
        provider,
        allowedHosts: getDeepLAllowedHosts(url, options),
        allowedPaths: ['/v2/translate'],
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
        },
      },
      extract: extractDeepLTranslation,
    };
  }

  if (provider === 'libretranslate') {
    const apiKey = options.libreTranslateApiKey || process.env.LIBRETRANSLATE_API_KEY || '';
    const url = getLibreTranslateUrl(options);
    const parsedUrl = parseProviderUrl(url, 'LibreTranslate');
    if (!parsedUrl.ok) return { provider, error: parsedUrl.error, message: parsedUrl.message };

    const params = new URLSearchParams({
      q: text,
      source: sourceLang,
      target: targetLang,
      format: 'text',
    });
    if (apiKey) params.set('api_key', apiKey);

    return {
      provider,
      method: 'POST',
      url,
      body: params.toString(),
      requestOptions: {
        provider,
        allowedHosts: getLibreTranslateAllowedHosts(url),
        allowedPaths: ['/translate'],
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
      extract: extractLibreTranslateTranslation,
    };
  }

  return {
    provider,
    error: 'UnsupportedProvider',
    message: `Unsupported translation provider "${provider}". Use google, deepl, or libretranslate.`,
  };
}

function detectRateLimitError(result) {
  if (!result.ok && result.status === 429) return true;
  if (result.ok && result.status === 429) return true;
  if (!result.ok && result.error === 'TimeoutError') return false;
  if (result.data && (result.data.error || result.data.error_description)) return true;
  return false;
}

async function translateText(text, targetLang, options = {}) {
  const {
    sourceLang = 'en',
    retryCount = DEFAULT_RETRY_COUNT,
    retryDelay = DEFAULT_RETRY_DELAY,
    customFn,
    timeout = 15000,
    httpGet = safeHttpGet,
    httpPost = safeHttpPost,
  } = options;

  if (!text || text.trim().length === 0) return { ok: true, translated: text };

  if (typeof customFn === 'function') {
    try {
      const translated = await customFn(text, { sourceLang, targetLang });
      return { ok: true, translated: translated || text };
    } catch (e) {
      return { ok: false, error: 'CustomFnError', message: e.message };
    }
  }

  const request = buildProviderRequest(text, targetLang, { ...options, sourceLang });
  if (request.error) {
    return { ok: false, translated: null, error: request.error, message: request.message };
  }

  let lastError = null;
  for (let attempt = 0; attempt < retryCount; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(retryDelay * Math.pow(2, attempt - 1), MAX_BACKOFF_DELAY);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const result = request.method === 'POST'
      ? await httpPost(request.url, request.body, { ...(request.requestOptions || {}), timeout })
      : await httpGet(request.url, timeout);

    if (result.ok) {
      const translated = request.extract(result.data);
      if (translated !== null && translated !== text) {
        return { ok: true, translated };
      }
      if (translated === text) {
        return { ok: true, translated: text };
      }
      if (result.status === 429 || (translated === null && result.status >= 400)) {
        lastError = { error: 'RateLimited', message: `${request.provider} rate limit hit` };
        continue;
      }
    }

    if (detectRateLimitError(result)) {
      lastError = { error: 'RateLimited', message: 'Rate limit detected' };
      continue;
    }

    if (result.error === 'TimeoutError' || result.error === 'NetworkError') {
      lastError = { error: result.error, message: result.message || 'Network request failed, retrying' };
      continue;
    }

    lastError = { error: result.error || 'UnknownError', message: result.message || 'Request failed' };
  }

  return { ok: false, translated: null, ...lastError };
}

async function translateBatch(batch, targetLang, options = {}) {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    onProgress,
    onError,
  } = options;

  const results = new Array(batch.length).fill(null);
  let idx = 0;
  let completed = 0;

  async function worker() {
    while (idx < batch.length) {
      const i = idx++;
      const item = batch[i];
      const value = typeof item === 'string' ? item : item.value;
      const result = await translateText(value, targetLang, options);

      if (result.ok) {
        results[i] = result.translated;
      } else {
        results[i] = value;
        if (typeof onError === 'function') {
          onError({ index: i, item, error: result.error, message: result.message });
        }
      }

      completed++;
      if (typeof onProgress === 'function') {
        onProgress({
          completed,
          total: batch.length,
          index: i,
          ok: result.ok,
          keyPath: item && typeof item === 'object' ? item.keyPath : undefined,
        });
      }
    }
  }

  const workerCount = Math.min(
    clampProviderConcurrency(concurrency, options.provider, DEFAULT_CONCURRENCY),
    batch.length
  );
  const workers = Array.from({ length: workerCount }, () => worker());

  await Promise.all(workers);

  return results;
}

module.exports = {
  extractTranslation,
  extractDeepLTranslation,
  extractLibreTranslateTranslation,
  buildProviderRequest,
  normalizeProvider,
  detectRateLimitError,
  translateText,
  translateBatch,
  DEFAULT_CONCURRENCY,
  PROVIDER_CONCURRENCY_LIMITS,
  getProviderConcurrencyLimit,
  clampProviderConcurrency,
  DEFAULT_RETRY_COUNT,
  DEFAULT_RETRY_DELAY,
};
