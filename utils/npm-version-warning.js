const https = require('https');
const { compareVersions } = require('./version-utils');

const DEFAULT_TIMEOUT_MS = 1800;
const NPM_REGISTRY_BASE = 'https://registry.npmjs.org';

function isSemverLike(version) {
  return typeof version === 'string' && /^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$/.test(version.trim());
}

function fetchPackageMetadata(packageName, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const safePackageName = encodeURIComponent(packageName);
  const requestUrl = `${NPM_REGISTRY_BASE}/${safePackageName}`;

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    const req = https.get(
      requestUrl,
      {
        timeout: timeoutMs,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'i18ntk-version-check'
        }
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          finish(null);
          return;
        }

        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            finish(JSON.parse(raw));
          } catch {
            finish(null);
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      finish(null);
    });
    req.on('error', () => finish(null));
  });
}

function getOutdatedStatus(currentVersion, metadata) {
  if (!isSemverLike(currentVersion) || !metadata || !metadata.versions) {
    return null;
  }

  const distTags = metadata['dist-tags'] || {};
  const taggedLatest = distTags.latest;
  const allPublishedVersions = Object.keys(metadata.versions).filter(isSemverLike);

  if (allPublishedVersions.length === 0) {
    return null;
  }

  const latestVersion = isSemverLike(taggedLatest)
    ? taggedLatest
    : allPublishedVersions.sort(compareVersions).at(-1);

  if (!latestVersion || !isSemverLike(latestVersion)) {
    return null;
  }

  const currentMeta = metadata.versions[currentVersion] || null;
  const isCurrentDeprecated = Boolean(currentMeta && currentMeta.deprecated);
  const isOutdated = compareVersions(currentVersion, latestVersion) < 0;

  const newerStableVersions = allPublishedVersions.filter((version) => (
    compareVersions(version, currentVersion) > 0 &&
    compareVersions(version, latestVersion) <= 0
  ));

  return {
    latestVersion,
    isOutdated,
    isCurrentDeprecated,
    newerStableCount: newerStableVersions.length
  };
}

async function checkNpmOutdated({ packageName, currentVersion, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const metadata = await fetchPackageMetadata(packageName, timeoutMs);
  return getOutdatedStatus(currentVersion, metadata);
}

async function printUpgradeWarningIfOutdated({
  packageName,
  currentVersion,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) {
  const enabled = String(process.env.I18NTK_ENABLE_UPDATE_CHECK || '').toLowerCase();
  if (!(enabled === '1' || enabled === 'true' || enabled === 'yes')) {
    return;
  }

  if (process.env.I18NTK_DISABLE_UPDATE_CHECK === 'true') {
    return;
  }

  const status = await checkNpmOutdated({ packageName, currentVersion, timeoutMs });
  if (!status) {
    return;
  }

  if (status.isCurrentDeprecated) {
    console.warn(
      `\n⚠️  Installed ${packageName}@${currentVersion} is deprecated on npm. ` +
      `Upgrade to ${packageName}@${status.latestVersion}:\n` +
      `   npm install -g ${packageName}@latest`
    );
    return;
  }

  if (status.isOutdated) {
    const suffix = status.newerStableCount === 1 ? '' : 's';
    console.warn(
      `\n⚠️  Update available for ${packageName}: ${currentVersion} -> ${status.latestVersion} ` +
      `(${status.newerStableCount} newer release${suffix}).\n` +
      `   Run: npm install -g ${packageName}@latest`
    );
  }
}

module.exports = {
  checkNpmOutdated,
  printUpgradeWarningIfOutdated
};
