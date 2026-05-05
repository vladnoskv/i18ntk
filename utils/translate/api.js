const https = require('https');
const http = require('http');
const { URL } = require('url');

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY = 1000;
const MAX_BACKOFF_DELAY = 30000;

function httpGet(urlString, timeout = 15000) {
  return new Promise((resolve) => {
    const url = new URL(urlString);
    const client = url.protocol === 'https:' ? https : http;
    const req = client.get(urlString, { timeout }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ ok: true, data: parsed, status: res.statusCode });
        } catch (e) {
          resolve({ ok: false, error: 'ParseError', raw: data.substring(0, 500), status: res.statusCode });
        }
      });
    });
    req.on('error', (e) => {
      resolve({ ok: false, error: e.code || 'NetworkError', message: e.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'TimeoutError', message: 'Request timed out' });
    });
  });
}

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

  const params = new URLSearchParams({
    client: 'gtx',
    sl: sourceLang,
    tl: targetLang,
    dt: 't',
    q: text,
  });
  const url = `https://translate.googleapis.com/translate_a/single?${params.toString()}`;

  let lastError = null;
  for (let attempt = 0; attempt < retryCount; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(retryDelay * Math.pow(2, attempt - 1), MAX_BACKOFF_DELAY);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const result = await httpGet(url, timeout);

    if (result.ok) {
      const translated = extractTranslation(result.data);
      if (translated !== null && translated !== text) {
        return { ok: true, translated };
      }
      if (translated === text) {
        return { ok: true, translated: text };
      }
      if (result.status === 429) {
        lastError = { error: 'RateLimited', message: 'Google Translate rate limit hit' };
        continue;
      }
    }

    if (detectRateLimitError(result)) {
      lastError = { error: 'RateLimited', message: 'Rate limit detected' };
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
        onProgress({ completed, total: batch.length, index: i, ok: result.ok });
      }
    }
  }

  const workerCount = Math.min(concurrency, batch.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return results;
}

module.exports = {
  httpGet,
  extractTranslation,
  detectRateLimitError,
  translateText,
  translateBatch,
  DEFAULT_CONCURRENCY,
  DEFAULT_RETRY_COUNT,
  DEFAULT_RETRY_DELAY,
};
