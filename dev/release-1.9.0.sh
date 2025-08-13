#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME="i18ntk"
NEW_VERSION="1.9.0"
PREV_STABLE="1.8.2"   # optional dist-tag "prev" pointer

# All versions to deprecate (exactly your list)
DEPRECATE_LIST=(
  "1.8.2" "1.8.1" "1.8.0"
  "1.7.5" "1.7.4" "1.7.2" "1.7.1" "1.7.0"
  "1.6.3" "1.6.2" "1.6.1" "1.6.0"
  "1.5.3" "1.5.2" "1.5.1" "1.5.0"
  "1.4.2" "1.4.1" "1.4.0"
  "1.3.1" "1.3.0"
  "1.2.2" "1.2.1" "1.2.0"
  "1.1.5" "1.1.4"
  "1.0.5" "1.0.2" "1.0.1" "1.0.0"
)

DEPRECATION_MSG="This version is deprecated. Please upgrade to v${NEW_VERSION} for security, stability, and performance improvements."

echo "🔧 Bumping package.json version to ${NEW_VERSION} (no git tag)…"
npm version "${NEW_VERSION}" --no-git-tag-version

echo "📝 Updating versionInfo.version & versionInfo.nextVersion…"
node - <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
pkg.versionInfo = pkg.versionInfo || {};
pkg.versionInfo.version = process.env.NEW_VERSION;
pkg.versionInfo.nextVersion = process.env.NEW_VERSION;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log("✅ versionInfo updated to", process.env.NEW_VERSION);
NODE

echo "📦 Publishing ${PACKAGE_NAME}@${NEW_VERSION}…"
npm publish --access public

echo "🏷️ Setting dist-tag latest -> ${NEW_VERSION}…"
npm dist-tag add "${PACKAGE_NAME}@${NEW_VERSION}" latest

# Optional: keep a handy pointer to previous stable
if [[ -n "${PREV_STABLE}" ]]; then
  echo "🏷️ Setting dist-tag prev -> ${PREV_STABLE}…"
  npm dist-tag add "${PACKAGE_NAME}@${PREV_STABLE}" prev || true
fi

echo "⚠️ Deprecating old versions…"
for ver in "${DEPRECATE_LIST[@]}"; do
  echo "   → ${PACKAGE_NAME}@${ver}"
  npm deprecate "${PACKAGE_NAME}@${ver}" "${DEPRECATION_MSG}" || true
done

echo "🧪 Verifying dist-tags…"
npm view "${PACKAGE_NAME}" dist-tags --json

echo "✅ Release ${NEW_VERSION} complete and older versions deprecated."