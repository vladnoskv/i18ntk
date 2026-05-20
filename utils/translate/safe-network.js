const https = require('https');
const { URL } = require('url');
const { logger } = require('../logger');

const MAX_RESPONSE_SIZE = 100 * 1024;
const ALLOWED_HOSTS = ['translate.googleapis.com', 'api-free.deepl.com', 'api.deepl.com', 'libretranslate.com'];
const ALLOWED_PATHS = ['/translate_a/single', '/v2/translate', '/translate'];
const USER_AGENT = 'i18ntk/3.3.0';

function isEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function isPrivateIPv4(hostname) {
  const parts = String(hostname || '').split('.');
  if (parts.length !== 4) return false;

  const bytes = parts.map((part) => {
    if (!/^\d+$/.test(part)) return null;
    const value = Number(part);
    return value >= 0 && value <= 255 ? value : null;
  });
  if (bytes.some((part) => part === null)) return false;

  const [a, b] = bytes;
  return a === 10
    || a === 127
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 169 && b === 254)
    || a === 0;
}

function isPrivateHost(hostname) {
  const normalized = String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  return normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized === '::1'
    || normalized.startsWith('fe80:')
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || isPrivateIPv4(normalized);
}

function redactUrlForLog(urlString) {
  try {
    const parsed = new URL(urlString);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch (e) {
    return '[invalid-url]';
  }
}

function validateUrl(urlString, options = {}) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'InvalidUrl', message: 'URL must be a non-empty string' };
  }

  try {
    const parsed = new URL(urlString);

    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'ProtocolError', message: 'Only HTTPS protocol is supported' };
    }

    const allowPrivateHosts = options.allowPrivateHosts || isEnabled(process.env.I18NTK_ALLOW_PRIVATE_TRANSLATE_URLS);
    if (!allowPrivateHosts && isPrivateHost(parsed.hostname)) {
      return {
        valid: false,
        error: 'PrivateHostNotAllowed',
        message: `Host "${parsed.hostname}" is private or local. Set I18NTK_ALLOW_PRIVATE_TRANSLATE_URLS=1 only for trusted local testing.`,
      };
    }

    const allowedHosts = options.allowedHosts || ALLOWED_HOSTS;
    const allowedPaths = options.allowedPaths || ALLOWED_PATHS;

    if (!allowedHosts.includes(parsed.hostname)) {
      return { valid: false, error: 'HostNotAllowed', message: `Host "${parsed.hostname}" is not in the allowed list` };
    }

    if (!allowedPaths.includes(parsed.pathname)) {
      return { valid: false, error: 'PathNotAllowed', message: `Path "${parsed.pathname}" is not in the allowed list` };
    }

    const suspiciousParams = ['redirect', 'callback', 'jsonp', 'script', 'src', 'eval', 'exec', 'url'];
    for (const key of parsed.searchParams.keys()) {
      const lower = key.toLowerCase();
      if (suspiciousParams.some((s) => lower.includes(s))) {
        return { valid: false, error: 'SuspiciousParam', message: `Query parameter "${key}" is not allowed` };
      }
      const value = parsed.searchParams.get(key);
      if (value && (value.includes('<script') || value.includes('javascript:') || value.includes('data:'))) {
        return { valid: false, error: 'SuspiciousParamValue', message: `Query parameter "${key}" contains potentially dangerous content` };
      }
    }

    return { valid: true, url: parsed };
  } catch (e) {
    return { valid: false, error: 'UrlParseError', message: `Failed to parse URL: ${e.message}` };
  }
}

function safeHttpGet(urlString, timeout = 15000) {
  return new Promise((resolve) => {
    const validation = validateUrl(urlString);
    if (!validation.valid) {
      logger.security('warn', 'Network request blocked by safe-network', {
        url: redactUrlForLog(urlString),
        reason: validation.error,
        detail: validation.message,
      });
      resolve({ ok: false, error: validation.error, message: validation.message });
      return;
    }

    const req = https.get(urlString, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      let data = '';
      let sizeExceeded = false;

      res.on('data', (chunk) => {
        if (data.length + chunk.length > MAX_RESPONSE_SIZE) {
          if (!sizeExceeded) {
            sizeExceeded = true;
            req.destroy();
            logger.security('warn', 'Network response size limit exceeded', {
              url: redactUrlForLog(urlString),
              limit: MAX_RESPONSE_SIZE,
            });
            resolve({ ok: false, error: 'ResponseTooLarge', message: `Response exceeds ${MAX_RESPONSE_SIZE} bytes limit` });
          }
          return;
        }
        data += chunk;
      });

      res.on('end', () => {
        if (sizeExceeded) return;
        try {
          const parsed = JSON.parse(data);
          logger.security('info', 'Network request completed', {
            status: res.statusCode,
            responseLength: data.length,
          });
          resolve({ ok: true, data: parsed, status: res.statusCode });
        } catch (e) {
          logger.security('warn', 'Network response parse error', {
            status: res.statusCode,
            responseLength: data.length,
          });
          resolve({ ok: false, error: 'ParseError', raw: data.substring(0, 500), status: res.statusCode });
        }
      });
    });

    req.setTimeout(timeout, () => {
      req.destroy();
      logger.security('warn', 'Network request timed out', { timeoutMs: timeout });
      resolve({ ok: false, error: 'TimeoutError', message: 'Request timed out' });
    });

    req.on('error', (e) => {
      logger.security('warn', 'Network request error', {
        code: e.code,
        message: e.message,
      });
      resolve({ ok: false, error: e.code || 'NetworkError', message: e.message });
    });
  });
}

function safeHttpPost(urlString, body, options = {}) {
  const timeout = options.timeout || 15000;

  return new Promise((resolve) => {
    const validation = validateUrl(urlString, {
      allowedHosts: options.allowedHosts,
      allowedPaths: options.allowedPaths,
      allowPrivateHosts: options.allowPrivateHosts,
    });
    if (!validation.valid) {
      logger.security('warn', 'Network request blocked by safe-network', {
        url: redactUrlForLog(urlString),
        reason: validation.error,
        detail: validation.message,
      });
      resolve({ ok: false, error: validation.error, message: validation.message });
      return;
    }

    const payload = typeof body === 'string' ? body : JSON.stringify(body || {});
    const headers = {
      'User-Agent': USER_AGENT,
      'Content-Type': options.contentType || 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      ...(options.headers || {}),
    };

    const req = https.request(validation.url, { method: 'POST', headers }, (res) => {
      let data = '';
      let sizeExceeded = false;

      res.on('data', (chunk) => {
        if (data.length + chunk.length > MAX_RESPONSE_SIZE) {
          if (!sizeExceeded) {
            sizeExceeded = true;
            req.destroy();
            logger.security('warn', 'Network response size limit exceeded', {
              url: redactUrlForLog(urlString),
              limit: MAX_RESPONSE_SIZE,
            });
            resolve({ ok: false, error: 'ResponseTooLarge', message: `Response exceeds ${MAX_RESPONSE_SIZE} bytes limit` });
          }
          return;
        }
        data += chunk;
      });

      res.on('end', () => {
        if (sizeExceeded) return;
        try {
          const parsed = JSON.parse(data || '{}');
          logger.security('info', 'Network request completed', {
            status: res.statusCode,
            responseLength: data.length,
          });
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: parsed, status: res.statusCode });
        } catch (e) {
          logger.security('warn', 'Network response parse error', {
            status: res.statusCode,
            responseLength: data.length,
          });
          resolve({ ok: false, error: 'ParseError', raw: data.substring(0, 500), status: res.statusCode });
        }
      });
    });

    req.setTimeout(timeout, () => {
      req.destroy();
      logger.security('warn', 'Network request timed out', { timeoutMs: timeout });
      resolve({ ok: false, error: 'TimeoutError', message: 'Request timed out' });
    });

    req.on('error', (e) => {
      logger.security('warn', 'Network request error', {
        code: e.code,
        message: e.message,
      });
      resolve({ ok: false, error: e.code || 'NetworkError', message: e.message });
    });

    req.write(payload);
    req.end();
  });
}

function buildGoogleTranslateUrl(text, sourceLang, targetLang) {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: sourceLang,
    tl: targetLang,
    dt: 't',
    q: text,
  });
  return `https://translate.googleapis.com/translate_a/single?${params.toString()}`;
}

module.exports = {
  safeHttpGet,
  safeHttpPost,
  buildGoogleTranslateUrl,
  validateUrl,
  isPrivateHost,
  redactUrlForLog,
  MAX_RESPONSE_SIZE,
  ALLOWED_HOSTS,
  ALLOWED_PATHS,
};
