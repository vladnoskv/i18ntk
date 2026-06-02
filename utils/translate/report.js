const path = require('path');
const SecurityUtils = require('../security');

function generateReport(skippedKeys, translatedCount, totalCount, options = {}) {
  const {
    sourceFile,
    targetLang,
    dryRun = false,
    timestamp = new Date().toISOString(),
    placeholderProtected = 0,
    protectedSkipped = 0,
    residualUntranslated = [],
  } = options;
  const placeholderSkipped = skippedKeys.filter(key => key.skipReason !== 'protected');
  const protectedKeys = skippedKeys.filter(key => key.skipReason === 'protected');

  const lines = [];
  lines.push('='.repeat(72));
  lines.push('  I18NTK POST-TRANSLATION REPORT');
  lines.push('='.repeat(72));
  lines.push(`  Generated:       ${timestamp}`);
  lines.push(`  Source file:     ${sourceFile || 'N/A'}`);
  lines.push(`  Target language: ${targetLang || 'N/A'}`);
  if (dryRun) {
    lines.push(`  Mode:            DRY-RUN (no API calls made)`);
  }
  lines.push(`  Total keys:      ${totalCount}`);
  lines.push(`  Translated:      ${translatedCount}`);
  lines.push(`  Placeholder-safe: ${String(placeholderProtected).padStart(6)}`);
  lines.push(`  Protected:       ${String(protectedSkipped).padStart(6)}`);
  lines.push(`  Skipped:         ${skippedKeys.length}`);
  lines.push(`  Leftover warnings: ${String(residualUntranslated.length).padStart(3)}`);
  lines.push('='.repeat(72));

  if (skippedKeys.length === 0 && residualUntranslated.length === 0) {
    lines.push('');
    lines.push('  All strings were processed. No keys were skipped.');
    lines.push('');
  } else {
    if (residualUntranslated.length > 0) {
      lines.push('');
      lines.push('  WARNING: The following values still look untranslated after');
      lines.push('  Auto Translate and one final retry.');
      lines.push('');
      lines.push('  A resume report has been written so VS Code companions can');
      lines.push('  show the affected keys and retry only unresolved values.');
      lines.push('');
      lines.push(`  ${'-'.repeat(72)}`);
      lines.push('  File                 Key Path                                 Current Value');
      lines.push(`  ${'-'.repeat(72)}`);
      for (const item of residualUntranslated) {
        const fileDisplay = String(item.fileName || path.basename(sourceFile || '') || 'N/A').padEnd(20).slice(0, 20);
        const keyDisplay = String(item.keyPath || '').padEnd(40).slice(0, 40);
        const valDisplay = String(item.value || '').length > 90
          ? String(item.value).slice(0, 87) + '...'
          : String(item.value || '');
        lines.push(`  ${fileDisplay} ${keyDisplay} ${valDisplay}`);
      }
      lines.push(`  ${'-'.repeat(72)}`);
    }

    if (placeholderSkipped.length > 0) {
      lines.push('');
      lines.push('  WARNING: The following keys were SKIPPED because they contain');
      lines.push('  dynamic placeholder tokens that should be manually translated');
      lines.push('  to avoid runtime substitution breakage.');
      lines.push('');
      lines.push('  These entries were copied verbatim into the output file.');
      lines.push('  You MUST manually translate them before using the file.');
    }
    if (protectedKeys.length > 0) {
      lines.push('');
      lines.push('  The following keys were copied unchanged because they matched');
      lines.push('  Auto Translate protection rules for keys or exact values.');
    }
    lines.push('');
    lines.push(`  ${'-'.repeat(64)}`);
    lines.push(`  Key Path                                            Original Value`);
    lines.push(`  ${'-'.repeat(64)}`);

    for (const skip of skippedKeys) {
      const keyDisplay = skip.keyPath.length > 50
        ? skip.keyPath.substring(0, 47) + '...'
        : skip.keyPath.padEnd(50);
      const valDisplay = skip.value.length > 80
        ? skip.value.substring(0, 77) + '...'
        : skip.value;
      lines.push(`  ${keyDisplay} ${valDisplay}`);
    }

    lines.push(`  ${'-'.repeat(64)}`);
    if (placeholderSkipped.length > 0) {
      lines.push('');
      lines.push('  REMINDER:');
      lines.push('  1. Open the target JSON file');
      lines.push('  2. Search for the placeholder-skipped keys listed above');
      lines.push('  3. Manually translate each value, preserving all placeholders');
      lines.push('     exactly as they appear in the original');
      lines.push('  4. Verify placeholder integrity before runtime use');
      lines.push('');
    }
  }

  lines.push('');
  if (residualUntranslated.length > 0) {
    lines.push('  Auto Translate did not fully complete because leftover');
    lines.push('  placeholder-prefixed or English-looking values remain.');
  } else if (skippedKeys.length === 0) {
    lines.push('  The generated file can be used immediately after review.');
    lines.push('  Placeholder tokens were preserved automatically where found.');
  } else if (placeholderSkipped.length > 0) {
    lines.push('  The generated file can be used immediately for all');
    lines.push('  translated text. Only the skipped keys need');
    lines.push('  manual attention.');
  } else {
    lines.push('  Protected keys and values were intentionally copied unchanged.');
    lines.push('  Review the output file before using it in production.');
  }
  lines.push('='.repeat(72));

  return lines.join('\n');
}

function writeReport(reportText, filePath) {
  if (!filePath) return;
  try {
    const resolvedPath = path.resolve(process.cwd(), filePath);
    SecurityUtils.safeWriteFileSync(resolvedPath, reportText + '\n', path.dirname(resolvedPath), 'utf-8');
  } catch (e) {
    console.error('Failed to write report file:', e.message);
  }
}

function writeResidualReport(residualUntranslated, options = {}) {
  if (!Array.isArray(residualUntranslated) || residualUntranslated.length === 0) return null;
  const reportDir = path.resolve(process.cwd(), 'i18ntk-reports', 'auto-translate');
  const reportPath = path.join(reportDir, 'latest.json');
  const timestamp = options.timestamp || new Date().toISOString();
  const report = {
    kind: 'i18ntk.autoTranslateResiduals',
    version: 1,
    generatedAt: timestamp,
    targetLang: options.targetLang || '',
    sourceFile: options.sourceFile || '',
    resumeMode: 'onlyMissing',
    items: residualUntranslated.map((item) => ({
      fileName: String(item.fileName || ''),
      keyPath: String(item.keyPath || ''),
      value: String(item.value || ''),
      reason: String(item.reason || 'untranslated')
    }))
  };
  const ok = SecurityUtils.safeWriteFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', process.cwd(), 'utf-8');
  return ok ? reportPath : null;
}

function formatSummaryLine(skippedCount, translatedCount, totalCount, placeholderProtected = 0, protectedSkipped = 0, existingKept = 0) {
  const protectedPart = placeholderProtected > 0 ? `, ${placeholderProtected} placeholder-safe` : '';
  const glossaryPart = protectedSkipped > 0 ? `, ${protectedSkipped} protected` : '';
  const existingPart = existingKept > 0 ? `, ${existingKept} existing kept` : '';
  return `[translate] ${translatedCount} translated${protectedPart}${glossaryPart}${existingPart}, ${skippedCount} skipped (of ${totalCount} total keys)`;
}

module.exports = {
  generateReport,
  writeReport,
  writeResidualReport,
  formatSummaryLine,
};
