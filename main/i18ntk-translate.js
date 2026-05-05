#!/usr/bin/env node

/**
 * I18NTK TRANSLATION GENERATOR
 *
 * Zero-dependency translation utility that converts English source JSON
 * language files into any target language via Google's free Translate API.
 *
 * Usage:
 *   i18ntk-translate <source-file> <target-lang> [options]
 *   i18ntk-translate locales/en/common.json de
 *   i18ntk-translate locales/en/common.json fr --no-confirm --skip-placeholders
 *   i18ntk-translate locales/en/common.json es --dry-run
 *
 * Options:
 *   --source-dir <dir>         Source directory (default: ./locales/en)
 *   --output-dir <dir>         Output directory (default: ./locales/<lang>)
 *   --custom-regex <regex>     Additional placeholder regex pattern
 *   --no-confirm               Skip all confirmation dialogs
 *   --skip-placeholders        Skip all strings containing placeholders
 *   --send-placeholders        Translate all strings including placeholders
 *   --concurrency <n>          Max concurrent API requests (default: 3)
 *   --dry-run                  Preview mode without API calls
 *   --report-file <path>       Write report to file
 *   --report-stdout            Print report to stdout
 *   --bom                      Output UTF-8 with BOM
 *   --translate-fn <module>    Path to custom translation function module
 *   --retry-count <n>          Max retries per request (default: 3)
 *   --retry-delay <ms>         Base delay for retry backoff (default: 1000)
 *   --timeout <ms>             HTTP request timeout (default: 15000)
 *   --source-lang <code>       Source language code (default: en)
 *   --files <pattern>          Glob pattern for multiple files (e.g. *.json)
 *   -h, --help                 Show help
 */

const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');
const ExitCodes = require('../utils/exit-codes');
const { isInteractive } = require('../utils/prompt-helper');
const { detectPlaceholders, maskPlaceholders, unmaskPlaceholders } = require('../utils/translate/placeholder');
const { translateBatch } = require('../utils/translate/api');
const { collectLeaves, setLeaf, deepClone } = require('../utils/translate/traverse');
const { generateReport, writeReport, formatSummaryLine } = require('../utils/translate/report');
const {
  confirmGlobalChoice,
  confirmPerKey,
  previewSkipped,
} = require('../utils/translate/cli');

const BOM = '\uFEFF';

function printHelp() {
  console.log([
    '',
    `I18NTK Translation Generator - v${packageJson.version}`,
    '',
    'Usage:',
    '  i18ntk-translate <source-file> <target-lang> [options]',
    '  i18ntk-translate <source-file> <target-lang> --source-dir <dir> [options]',
    '',
    'Examples:',
    '  i18ntk-translate locales/en/common.json de',
    '  i18ntk-translate locales/en/common.json fr --dry-run',
    '  i18ntk-translate locales/en/ es --files "*.json"',
    '  i18ntk-translate locales/en/common.json ja --no-confirm --skip-placeholders',
    '  i18ntk-translate locales/en/common.json ko --report-file report.txt',
    '',
    'Options:',
    '  --source-dir <dir>         Source directory containing locale files',
    '  --output-dir <dir>         Output directory for translated files',
    '  --source-lang <code>       Source language code (default: en)',
    '  --custom-regex <regex>     Additional placeholder regex pattern',
    '  --no-confirm               Automate: skip confirmation dialogs',
    '  --skip-placeholders        Skip all strings with placeholder tokens',
    '  --send-placeholders        Translate all strings including placeholders',
    '  --concurrency <n>          Max concurrent API requests (default: 3)',
    '  --dry-run                  Preview: show what would be skipped',
    '  --report-file <path>       Write post-translation report to file',
    '  --report-stdout            Print post-translation report to stdout',
    '  --bom                      Write output files with UTF-8 BOM',
    '  --translate-fn <module>    Path to custom translation function module',
    '  --retry-count <n>          Max retries per failed request (default: 3)',
    '  --retry-delay <ms>         Base backoff delay in ms (default: 1000)',
    '  --timeout <ms>             HTTP request timeout in ms (default: 15000)',
    '  -h, --help                 Show this help',
  ].join('\n'));
}

function parseArgs(argv) {
  const args = {
    sourceFile: null,
    targetLang: null,
    sourceDir: null,
    outputDir: null,
    sourceLang: 'en',
    customRegex: [],
    noConfirm: false,
    skipPlaceholders: false,
    sendPlaceholders: false,
    concurrency: 3,
    dryRun: false,
    reportFile: null,
    reportStdout: false,
    bom: false,
    translateFnPath: null,
    retryCount: 3,
    retryDelay: 1000,
    timeout: 15000,
    filesPattern: null,
    help: false,
    unknown: [],
  };

  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') { args.help = true; }
    else if (arg === '--no-confirm') { args.noConfirm = true; }
    else if (arg === '--skip-placeholders') { args.skipPlaceholders = true; }
    else if (arg === '--send-placeholders') { args.sendPlaceholders = true; }
    else if (arg === '--dry-run') { args.dryRun = true; }
    else if (arg === '--report-stdout') { args.reportStdout = true; }
    else if (arg === '--bom') { args.bom = true; }
    else if (arg === '--source-dir' && i + 1 < argv.length) { args.sourceDir = argv[++i]; }
    else if (arg === '--output-dir' && i + 1 < argv.length) { args.outputDir = argv[++i]; }
    else if (arg === '--source-lang' && i + 1 < argv.length) { args.sourceLang = argv[++i]; }
    else if (arg === '--custom-regex' && i + 1 < argv.length) { args.customRegex.push(argv[++i]); }
    else if (arg === '--concurrency' && i + 1 < argv.length) { args.concurrency = parseInt(argv[++i], 10) || 3; }
    else if (arg === '--report-file' && i + 1 < argv.length) { args.reportFile = argv[++i]; }
    else if (arg === '--translate-fn' && i + 1 < argv.length) { args.translateFnPath = argv[++i]; }
    else if (arg === '--retry-count' && i + 1 < argv.length) { args.retryCount = parseInt(argv[++i], 10) || 3; }
    else if (arg === '--retry-delay' && i + 1 < argv.length) { args.retryDelay = parseInt(argv[++i], 10) || 1000; }
    else if (arg === '--timeout' && i + 1 < argv.length) { args.timeout = parseInt(argv[++i], 10) || 15000; }
    else if (arg === '--files' && i + 1 < argv.length) { args.filesPattern = argv[++i]; }
    else if (arg.startsWith('-')) { args.unknown.push(arg); }
    else { positional.push(arg); }
  }

  if (positional.length >= 1) args.sourceFile = positional[0];
  if (positional.length >= 2) args.targetLang = positional[1];

  if (args.sendPlaceholders && args.skipPlaceholders) {
    console.error('Error: --skip-placeholders and --send-placeholders are mutually exclusive.');
    process.exit(1);
  }

  return args;
}

function loadCustomTranslateFn(modulePath) {
  if (!modulePath) return null;
  try {
    const resolved = path.isAbsolute(modulePath) ? modulePath : path.resolve(process.cwd(), modulePath);
    const mod = require(resolved);
    if (typeof mod === 'function') return mod;
    if (mod && typeof mod.translate === 'function') return mod.translate;
    if (mod && typeof mod.default === 'function') return mod.default;
    console.error(`Warning: Custom translate module "${modulePath}" does not export a function.`);
    return null;
  } catch (e) {
    console.error(`Error: Failed to load translate function module "${modulePath}": ${e.message}`);
    process.exit(1);
  }
}

function resolveSourceFiles(sourceFile, sourceDir, filesPattern) {
  if (sourceDir) {
    const resolvedDir = path.resolve(process.cwd(), sourceDir);
    if (!fs.existsSync(resolvedDir)) {
      console.error(`Error: Source directory "${resolvedDir}" does not exist.`);
      process.exit(1);
    }
    const entries = fs.readdirSync(resolvedDir);
    const pattern = filesPattern || '*.json';
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    const files = entries.filter((f) => regex.test(f) && f.endsWith('.json')).sort();
    if (files.length === 0) {
      console.error(`Error: No JSON files matching "${pattern}" found in "${resolvedDir}".`);
      process.exit(1);
    }
    return files.map((f) => path.join(resolvedDir, f));
  }

  if (sourceFile) {
    const resolved = path.resolve(process.cwd(), sourceFile);
    if (!fs.existsSync(resolved)) {
      console.error(`Error: Source file "${resolved}" does not exist.`);
      process.exit(1);
    }
    return [resolved];
  }

  console.error('Error: No source file specified. Use --source-dir or provide a source file.');
  process.exit(1);
}

function classifyLeaves(leaves, customRegex) {
  const withPlaceholders = [];
  const withoutPlaceholders = [];

  for (const leaf of leaves) {
    const placeholders = detectPlaceholders(leaf.value, customRegex);
    if (placeholders.length > 0) {
      withPlaceholders.push({ ...leaf, placeholders });
    } else {
      withoutPlaceholders.push(leaf);
    }
  }

  return { withPlaceholders, withoutPlaceholders };
}

async function resolvePlaceholderStrategy(args) {
  const interactive = isInteractive({ noPrompt: args.noConfirm });

  if (args.sendPlaceholders) {
    return { strategy: 'send', interactiveMode: false };
  }
  if (args.skipPlaceholders) {
    return { strategy: 'skip', interactiveMode: false };
  }
  if (args.noConfirm) {
    return { strategy: 'skip', interactiveMode: false };
  }
  if (!interactive) {
    return { strategy: 'skip', interactiveMode: false };
  }

  const choice = await confirmGlobalChoice();
  return { strategy: choice.strategy, interactiveMode: choice.interactive };
}

async function resolvePerKeyDecisions(withPlaceholders, interactive) {
  const decisions = {};

  if (!interactive) {
    for (const leaf of withPlaceholders) {
      decisions[leaf.keyPath] = 'skip';
    }
    return decisions;
  }

  let bulkDecision = null;
  for (const leaf of withPlaceholders) {
    if (bulkDecision) {
      decisions[leaf.keyPath] = bulkDecision;
      continue;
    }
    const choice = await confirmPerKey(leaf.keyPath, leaf.value, leaf.placeholders);
    if (choice === 'skip-all') {
      bulkDecision = 'skip';
      decisions[leaf.keyPath] = 'skip';
    } else if (choice === 'send-all') {
      bulkDecision = 'send';
      decisions[leaf.keyPath] = 'send';
    } else {
      decisions[leaf.keyPath] = choice;
    }
  }

  return decisions;
}

function buildTranslateList(withPlaceholders, withoutPlaceholders, strategy, decisions) {
  const toTranslate = [];
  const toSkip = [];

  for (const leaf of withoutPlaceholders) {
    toTranslate.push(leaf);
  }

  if (strategy === 'send') {
    for (const leaf of withPlaceholders) {
      toTranslate.push(leaf);
    }
  } else {
    for (const leaf of withPlaceholders) {
      const decision = decisions[leaf.keyPath] || 'skip';
      if (decision === 'send') {
        toTranslate.push(leaf);
      } else {
        toSkip.push(leaf);
      }
    }
  }

  return { toTranslate, toSkip };
}

function maskAllForTranslation(toTranslate, customRegex) {
  return toTranslate.map((leaf) => {
    const { masked, map } = maskPlaceholders(leaf.value, customRegex);
    return { ...leaf, masked, placeholderMap: map, needsUnmask: map.size > 0 };
  });
}

async function runTranslation(maskedBatch, targetLang, options) {
  const batchItems = maskedBatch.map((item) => ({ value: item.masked, keyPath: item.keyPath }));
  const results = await translateBatch(batchItems, targetLang, options);
  return results;
}

function applyResults(sourceData, translatedResults, maskedBatch, toSkip, bom) {
  const output = deepClone(sourceData);

  for (let i = 0; i < maskedBatch.length; i++) {
    const item = maskedBatch[i];
    const translated = translatedResults[i];
    let finalValue;
    if (item.needsUnmask) {
      finalValue = unmaskPlaceholders(translated, item.placeholderMap);
    } else {
      finalValue = translated;
    }
    setLeaf(output, item.keyPath, finalValue);
  }

  for (const leaf of toSkip) {
    setLeaf(output, leaf.keyPath, leaf.value);
  }

  return output;
}

function writeOutput(outputData, outputPath, bom) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  let content = JSON.stringify(outputData, null, 2) + '\n';
  if (bom) {
    content = BOM + content;
  }
  fs.writeFileSync(outputPath, content, 'utf-8');
}

async function processFile(sourcePath, targetLang, args) {
  const fileName = path.basename(sourcePath);
  const targetDir = args.outputDir || path.join(path.dirname(path.dirname(sourcePath)), targetLang);
  const targetPath = path.join(targetDir, fileName);

  let sourceData;
  try {
    const raw = fs.readFileSync(sourcePath, 'utf-8');
    sourceData = JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading "${sourcePath}": ${e.message}`);
    return null;
  }

  const leaves = collectLeaves(sourceData);
  if (leaves.length === 0) {
    console.log(`[${fileName}] No translatable strings found.`);
    writeOutput(sourceData, targetPath, args.bom);
    return { total: 0, translated: 0, skipped: 0, skippedKeys: [] };
  }

  const { withPlaceholders, withoutPlaceholders } = classifyLeaves(leaves, args.customRegex);

  if (args.dryRun && withPlaceholders.length > 0) {
    await previewSkipped(withPlaceholders);
    return {
      total: leaves.length,
      translated: withoutPlaceholders.length,
      skipped: withPlaceholders.length,
      skippedKeys: withPlaceholders,
      dryRun: true,
    };
  }

  if (args.dryRun) {
    console.log(`[${fileName}] Dry-run: ${leaves.length} strings, all would be translated.`);
    return {
      total: leaves.length,
      translated: leaves.length,
      skipped: 0,
      skippedKeys: [],
      dryRun: true,
    };
  }

  const { strategy, interactiveMode } = await resolvePlaceholderStrategy(args);
  const decisions = await resolvePerKeyDecisions(withPlaceholders, interactiveMode);
  const { toTranslate, toSkip } = buildTranslateList(withPlaceholders, withoutPlaceholders, strategy, decisions);

  if (toSkip.length > 0) {
    console.log(`[${fileName}] Skipping ${toSkip.length} keys with placeholders.`);
  }

  const maskedBatch = maskAllForTranslation(toTranslate, args.customRegex);

  const translateOptions = {
    sourceLang: args.sourceLang,
    concurrency: args.concurrency,
    retryCount: args.retryCount,
    retryDelay: args.retryDelay,
    timeout: args.timeout,
    customFn: args.translateFn,
    onProgress: (info) => {
      if (info.completed % 10 === 0 || info.completed === info.total) {
        process.stdout.write(`\r[${fileName}] Translating... ${info.completed}/${info.total}`);
      }
    },
    onError: (err) => {
      console.error(`\n[${fileName}] Warning: Failed to translate key "${err.item.keyPath}": ${err.message}`);
    },
  };

  let translatedResults;
  if (maskedBatch.length > 0) {
    translatedResults = await runTranslation(maskedBatch, targetLang, translateOptions);
    process.stdout.write('\n');
  } else {
    translatedResults = [];
  }

  const output = applyResults(sourceData, translatedResults, maskedBatch, toSkip, args.bom);
  writeOutput(output, targetPath, args.bom);

  console.log(`[${fileName}] Written: ${targetPath}`);

  return {
    total: leaves.length,
    translated: translatedResults.length,
    skipped: toSkip.length,
    skippedKeys: toSkip,
  };
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(ExitCodes.SUCCESS);
  }

  if (args.unknown.length > 0) {
    console.error(`Unknown options: ${args.unknown.join(', ')}`);
    console.error('Use --help for usage information.');
    process.exit(1);
  }

  if (!args.targetLang) {
    console.error('Error: Target language code is required.');
    console.error('Usage: i18ntk-translate <source-file> <target-lang> [options]');
    process.exit(1);
  }

  if (args.translateFnPath) {
    args.translateFn = loadCustomTranslateFn(args.translateFnPath);
  }

  const sourceFiles = resolveSourceFiles(args.sourceFile, args.sourceDir, args.filesPattern);

  const allSkippedKeys = [];
  let grandTotal = 0;
  let grandTranslated = 0;
  let grandSkipped = 0;

  for (const srcPath of sourceFiles) {
    const result = await processFile(srcPath, args.targetLang, args);
    if (result) {
      grandTotal += result.total;
      grandTranslated += result.translated;
      grandSkipped += result.skipped;
      if (result.skippedKeys && result.skippedKeys.length > 0) {
        allSkippedKeys.push(...result.skippedKeys);
      }
    }
  }

  console.log('');
  console.log(formatSummaryLine(grandSkipped, grandTranslated, grandTotal));

  if (allSkippedKeys.length > 0 || args.reportFile || args.reportStdout) {
    const report = generateReport(allSkippedKeys, grandTranslated, grandTotal, {
      sourceFile: sourceFiles.length === 1 ? sourceFiles[0] : `${sourceFiles.length} files`,
      targetLang: args.targetLang,
      dryRun: args.dryRun,
    });

    if (args.reportStdout || (!args.reportFile && allSkippedKeys.length > 0)) {
      console.log('');
      console.log(report);
    }

    if (args.reportFile) {
      const reportPath = path.resolve(process.cwd(), args.reportFile);
      writeReport(report, reportPath);
      console.log(`Report written: ${reportPath}`);
    }
  }

  process.exit(ExitCodes.SUCCESS);
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
