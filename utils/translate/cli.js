const { ask } = require('../cli');

const PLACEHOLDER_WARNING = [
  '',
  '============================================================',
  '  WARNING: DYNAMIC PLACEHOLDER TOKENS DETECTED',
  '============================================================',
  '',
  '  Google Translate will attempt to translate the ENTIRE',
  '  string value, including any placeholder tokens like:',
  '',
  '    {name}    {{count}}    %d    %s    :param    ${var}',
  '',
  '  This WILL corrupt or alter your placeholders, which',
  '  will break runtime substitution in your application.',
  '',
  '  You have two choices for strings containing placeholders:',
  '',
  '    SKIP  - Copy verbatim (safe); manually translate later',
  '    SEND  - Translate anyway (risky); may corrupt placeholders',
  '',
  '============================================================',
].join('\n');

async function confirmGlobalChoice() {
  console.log(PLACEHOLDER_WARNING);
  console.log('');
  console.log('  What should we do with ALL strings that contain');
  console.log('  dynamic placeholder tokens?');
  console.log('');
  console.log('  [s] SKIP all  - Copy verbatim, translate nothing with placeholders');
  console.log('  [t] SEND all  - Translate everything, accept corruption risk');
  console.log('  [i] ASK each  - Decide individually for each key');
  console.log('');

  while (true) {
    const answer = await ask('  Choice [s/t/i]: ');
    const lower = answer.toLowerCase().trim();
    if (lower === 's' || lower === 'skip') return { strategy: 'skip', interactive: false };
    if (lower === 't' || lower === 'send') return { strategy: 'send', interactive: false };
    if (lower === 'i' || lower === 'ask' || lower === 'interactive') return { strategy: 'skip', interactive: true };
    console.log('  Please enter s, t, or i.');
  }
}

async function confirmPerKey(keyPath, value, placeholders) {
  const displayVal = value.length > 60 ? value.substring(0, 57) + '...' : value;
  console.log('');
  console.log(`  Key:   ${keyPath}`);
  console.log(`  Value: "${displayVal}"`);
  console.log(`  Placeholders: ${placeholders.join(', ')}`);
  console.log('');

  while (true) {
    const answer = await ask('  [s]kip / [t]ranslate anyway / s[k]ip all remaining / [a]ll remaining? ');
    const lower = answer.toLowerCase().trim();
    if (lower === 's' || lower === 'skip') return 'skip';
    if (lower === 't' || lower === 'translate') return 'send';
    if (lower === 'k' || lower === 'skipall') return 'skip-all';
    if (lower === 'a' || lower === 'all') return 'send-all';
    console.log('  Please enter s, t, k, or a.');
  }
}

async function previewSkipped(skippedLeaves) {
  console.log('');
  console.log('============================================================');
  console.log('  DRY-RUN: Keys that would be skipped (placeholders found):');
  console.log('============================================================');
  console.log('');
  if (skippedLeaves.length === 0) {
    console.log('  No keys would be skipped.');
  } else {
    for (const leaf of skippedLeaves) {
      const displayVal = leaf.value.length > 60 ? leaf.value.substring(0, 57) + '...' : leaf.value;
      console.log(`  ${leaf.keyPath}`);
      console.log(`    "${displayVal}"`);
      console.log(`    Placeholders: ${leaf.placeholders.join(', ')}`);
      console.log('');
    }
    console.log(`  Total keys that would be skipped: ${skippedLeaves.length}`);
  }
  console.log('');
}

module.exports = {
  PLACEHOLDER_WARNING,
  confirmGlobalChoice,
  confirmPerKey,
  previewSkipped,
};
