const fs = require('fs');

function generateReport(skippedKeys, translatedCount, totalCount, options = {}) {
  const {
    sourceFile,
    targetLang,
    dryRun = false,
    timestamp = new Date().toISOString(),
  } = options;

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
  lines.push(`  Skipped:         ${skippedKeys.length}`);
  lines.push('='.repeat(72));

  if (skippedKeys.length === 0) {
    lines.push('');
    lines.push('  All strings were processed. No keys were skipped.');
    lines.push('');
  } else {
    lines.push('');
    lines.push('  WARNING: The following keys were SKIPPED because they contain');
    lines.push('  dynamic placeholder tokens that should be manually translated');
    lines.push('  to avoid runtime substitution breakage.');
    lines.push('');
    lines.push('  These entries were copied verbatim into the output file.');
    lines.push('  You MUST manually translate them before using the file.');
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
    lines.push('');
    lines.push('  REMINDER:');
    lines.push('  1. Open the target JSON file');
    lines.push('  2. Search for the keys listed above');
    lines.push('  3. Manually translate each value, preserving all placeholders');
    lines.push('     exactly as they appear in the original');
    lines.push('  4. Verify placeholder integrity before runtime use');
    lines.push('');
  }

  lines.push('');
  lines.push('  The generated file can be used immediately for all');
  lines.push('  non-placeholder text. Only the skipped keys need');
  lines.push('  manual attention.');
  lines.push('='.repeat(72));

  return lines.join('\n');
}

function writeReport(reportText, filePath) {
  if (!filePath) return;
  try {
    fs.writeFileSync(filePath, reportText + '\n', 'utf-8');
  } catch (e) {
    console.error('Failed to write report file:', e.message);
  }
}

function formatSummaryLine(skippedCount, translatedCount, totalCount) {
  return `[translate] ${translatedCount} translated, ${skippedCount} skipped (of ${totalCount} total keys)`;
}

module.exports = {
  generateReport,
  writeReport,
  formatSummaryLine,
};
