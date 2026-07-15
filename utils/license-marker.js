'use strict';

const MARKER_NAME = 'i18ntk-site-verification';
const SCHEMA = 'https://i18ntk.dev/schemas/license-marker/v1';
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{5,127}$/;
const DOMAIN_PATTERN = /^(?:\*\.)?(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function normalizeDomain(value) {
  const input = String(value || '').trim().toLowerCase();
  if (!input) return '';
  try {
    const parsed = new URL(input.includes('://') ? input : `https://${input}`);
    const hostname = parsed.hostname.replace(/^www\./, '').replace(/\.$/, '');
    if (!DOMAIN_PATTERN.test(hostname) || hostname.endsWith('.local') || hostname.endsWith('.localhost')) return '';
    return hostname;
  } catch { return ''; }
}

function normalizeDomains(domains) {
  return [...new Set((Array.isArray(domains) ? domains : String(domains || '').split(','))
    .map(normalizeDomain).filter(Boolean))].sort();
}

function createLicenseMarker(options = {}) {
  const licenseId = String(options.licenseId || '').trim();
  if (!ID_PATTERN.test(licenseId)) throw new Error('licenseId must be 6-128 letters, numbers, dots, underscores, or hyphens');
  const domains = normalizeDomains(options.domains);
  if (domains.length === 0) throw new Error('At least one valid public domain is required');
  if (domains.length > 100) throw new Error('No more than 100 public domains are allowed per marker');
  return {
    $schema: SCHEMA,
    product: 'i18ntk',
    marker: MARKER_NAME,
    licenseId,
    licenseType: options.licenseType === 'noncommercial' ? 'noncommercial' : 'commercial',
    domains,
    productVersion: String(options.productVersion || '5.0.0'),
    verification: `${MARKER_NAME}:${licenseId}`
  };
}

function domainMatches(domain, allowed) {
  const normalized = normalizeDomain(domain);
  return allowed.some(entry => normalized === entry || (entry.startsWith('*.') && normalized.endsWith(entry.slice(1))));
}

function validateLicenseMarker(marker, options = {}) {
  const issues = [];
  if (!marker || typeof marker !== 'object' || Array.isArray(marker)) issues.push('Marker must be a JSON object');
  const value = marker && typeof marker === 'object' ? marker : {};
  if (value.product !== 'i18ntk') issues.push('product must be i18ntk');
  if (value.$schema !== SCHEMA) issues.push(`$schema must be ${SCHEMA}`);
  if (value.marker !== MARKER_NAME) issues.push(`marker must be ${MARKER_NAME}`);
  if (!ID_PATTERN.test(String(value.licenseId || ''))) issues.push('licenseId is invalid');
  if (!['commercial', 'noncommercial'].includes(value.licenseType)) issues.push('licenseType must be commercial or noncommercial');
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(String(value.productVersion || ''))) issues.push('productVersion must be a semantic version');
  const domains = normalizeDomains(value.domains);
  if (domains.length === 0) issues.push('domains must contain at least one valid domain');
  if (!Array.isArray(value.domains) || domains.length !== value.domains.length || domains.some((domain, index) => domain !== value.domains[index])) {
    issues.push('domains must be a sorted, unique list of canonical public domains');
  }
  if (domains.length > 100) issues.push('domains exceeds the limit of 100');
  if (value.verification !== `${MARKER_NAME}:${value.licenseId || ''}`) issues.push('verification value does not match licenseId');
  if (options.domain && !domainMatches(options.domain, domains)) issues.push(`domain is not covered: ${normalizeDomain(options.domain) || options.domain}`);
  return { valid: issues.length === 0, issues, licenseId: value.licenseId || null, domains };
}

function createMetaTag(marker) {
  const validation = validateLicenseMarker(marker);
  if (!validation.valid) throw new Error(validation.issues.join('; '));
  return `<meta name="${MARKER_NAME}" content="${marker.verification}">`;
}

function getDiscoveryQueries(licenseId) {
  if (!ID_PATTERN.test(String(licenseId || ''))) throw new Error('Invalid licenseId');
  return [`"${MARKER_NAME}:${licenseId}"`, `"${MARKER_NAME}" "${licenseId}"`, `"i18ntk-license.json" "${licenseId}"`];
}

module.exports = { MARKER_NAME, SCHEMA, normalizeDomain, normalizeDomains, createLicenseMarker,
  validateLicenseMarker, createMetaTag, getDiscoveryQueries };
