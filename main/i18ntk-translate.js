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
 *   i18ntk-translate locales/en/common.json fr --no-confirm --preserve-placeholders
 *   i18ntk-translate locales/en/common.json es --dry-run
 *
 * Options:
 *   --source-dir <dir>         Source directory (default: ./locales/en)
 *   --output-dir <dir>         Output directory (default: ./locales/<lang>)
 *   --custom-regex <regex>     Additional placeholder regex pattern
 *   --no-confirm               Skip all confirmation dialogs
 *   --preserve-placeholders    Translate text around placeholders and reinsert tokens
 *   --skip-placeholders        Skip all strings containing placeholders
 *   --send-placeholders        Translate all strings including masked placeholders
 *   --protection-file <path>   JSON file with protected terms, keys, values, and patterns
 *   --create-protection-file   Create the protection JSON file if it does not exist
 *   --no-protection            Disable protected term/key/value handling for this run
 *   --concurrency <n>          Max concurrent API requests (default: 3)
 *   --batch-size <n>           Number of text segments per batch (default: 50)
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
const os = require('os');
const path = require('path');
const packageJson = require('../package.json');
const ExitCodes = require('../utils/exit-codes');
const SecurityUtils = require('../utils/security');
const { isInteractive } = require('../utils/prompt-helper');
const {
  detectPlaceholders,
  maskPlaceholders,
  splitByPlaceholders,
  unmaskPlaceholders,
} = require('../utils/translate/placeholder');
const {
  DEFAULT_PROTECTION_FILE,
  createProtectionFile,
  hasProtectionRules,
  loadProtectionConfig,
  protectText,
  restoreText,
  shouldPreserveWholeValue,
} = require('../utils/translate/protection');
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
    '  i18ntk-translate locales/en/common.json ja --no-confirm --preserve-placeholders',
    '  i18ntk-translate locales/en/common.json ko --report-file report.txt',
    '',
    'Options:',
    '  --source-dir <dir>         Source directory containing locale files',
    '  --output-dir <dir>         Output directory for translated files',
    '  --source-lang <code>       Source language code (default: en)',
    '  --custom-regex <regex>     Additional placeholder regex pattern',
    '  --no-confirm               Automate: skip confirmation dialogs',
    '  --preserve-placeholders    Translate text around placeholders and reinsert tokens',
    '  --skip-placeholders        Skip all strings with placeholder tokens',
    '  --send-placeholders        Translate all strings including masked placeholders',
    '  --protection-file <path>   Protected terms/keys JSON file (default: i18ntk-auto-translate.json)',
    '  --create-protection-file   Create the protection JSON file if missing',
    '  --no-protection            Disable protected term/key/value handling',
    '  --concurrency <n>          Max concurrent API requests (default: 3)',
    '  --batch-size <n>           Number of text segments per batch (default: 50)',
    '  --progress-interval <n>    Progress update interval (default: 10)',
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
    preservePlaceholders: false,
    skipPlaceholders: false,
    sendPlaceholders: false,
    protectionFile: DEFAULT_PROTECTION_FILE,
    protectionEnabled: true,
    createProtectionFile: false,
    concurrency: 3,
    batchSize: 50,
    progressInterval: 10,
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
    else if (arg === '--preserve-placeholders') { args.preservePlaceholders = true; }
    else if (arg === '--skip-placeholders') { args.skipPlaceholders = true; }
    else if (arg === '--send-placeholders') { args.sendPlaceholders = true; }
    else if (arg === '--no-protection') { args.protectionEnabled = false; }
    else if (arg === '--create-protection-file') { args.createProtectionFile = true; }
    else if (arg === '--dry-run') { args.dryRun = true; }
    else if (arg === '--report-stdout') { args.reportStdout = true; }
    else if (arg === '--bom') { args.bom = true; }
    else if (arg === '--source-dir' && i + 1 < argv.length) { args.sourceDir = argv[++i]; }
    else if (arg === '--output-dir' && i + 1 < argv.length) { args.outputDir = argv[++i]; }
    else if (arg === '--source-lang' && i + 1 < argv.length) { args.sourceLang = argv[++i]; }
    else if (arg === '--custom-regex' && i + 1 < argv.length) { args.customRegex.push(argv[++i]); }
    else if (arg === '--protection-file' && i + 1 < argv.length) { args.protectionFile = argv[++i]; }
    else if (arg === '--concurrency' && i + 1 < argv.length) { args.concurrency = parseInt(argv[++i], 10) || 3; }
    else if (arg === '--batch-size' && i + 1 < argv.length) { args.batchSize = parseInt(argv[++i], 10) || 50; }
    else if (arg === '--progress-interval' && i + 1 < argv.length) { args.progressInterval = parseInt(argv[++i], 10) || 10; }
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

  const placeholderModeCount = [
    args.preservePlaceholders,
    args.skipPlaceholders,
    args.sendPlaceholders,
  ].filter(Boolean).length;
  if (placeholderModeCount > 1) {
    console.error('Error: --preserve-placeholders, --skip-placeholders, and --send-placeholders are mutually exclusive.');
    process.exit(1);
  }

  args.concurrency = clampInt(args.concurrency, 1, 25, 3);
  args.batchSize = clampInt(args.batchSize, 1, 10000, 50);
  args.progressInterval = clampInt(args.progressInterval, 1, 10000, 10);

  return args;
}

function clampInt(value, min, max, fallback) {
  const num = parseInt(value, 10);
  if (!Number.isInteger(num)) return fallback;
  return Math.min(Math.max(num, min), max);
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
    const sourceDirBase = path.dirname(resolvedDir);
    if (!SecurityUtils.safeExistsSync(resolvedDir, sourceDirBase)) {
      console.error(`Error: Source directory "${resolvedDir}" does not exist.`);
      process.exit(1);
    }
    const entries = SecurityUtils.safeReaddirSync(resolvedDir, sourceDirBase);
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
    if (!SecurityUtils.safeExistsSync(resolved, path.dirname(resolved))) {
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

  if (args.preservePlaceholders) {
    return { strategy: 'preserve', interactiveMode: false };
  }
  if (args.sendPlaceholders) {
    return { strategy: 'send', interactiveMode: false };
  }
  if (args.skipPlaceholders) {
    return { strategy: 'skip', interactiveMode: false };
  }
  if (args.noConfirm) {
    return { strategy: 'preserve', interactiveMode: false };
  }
  if (!interactive) {
    return { strategy: 'preserve', interactiveMode: false };
  }

  const choice = await confirmGlobalChoice();
  return { strategy: choice.strategy, interactiveMode: choice.interactive };
}

async function resolvePerKeyDecisions(withPlaceholders, interactive) {
  const decisions = {};

  if (!interactive) {
    for (const leaf of withPlaceholders) {
      decisions[leaf.keyPath] = 'preserve';
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
    } else if (choice === 'preserve-all') {
      bulkDecision = 'preserve';
      decisions[leaf.keyPath] = 'preserve';
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
    toTranslate.push({ ...leaf, placeholderMode: 'none' });
  }

  if (strategy === 'preserve') {
    for (const leaf of withPlaceholders) {
      toTranslate.push({ ...leaf, placeholderMode: 'preserve' });
    }
  } else if (strategy === 'send') {
    for (const leaf of withPlaceholders) {
      toTranslate.push({ ...leaf, placeholderMode: 'mask' });
    }
  } else {
    for (const leaf of withPlaceholders) {
      const decision = decisions[leaf.keyPath] || 'skip';
      if (decision === 'preserve') {
        toTranslate.push({ ...leaf, placeholderMode: 'preserve' });
      } else if (decision === 'send') {
        toTranslate.push({ ...leaf, placeholderMode: 'mask' });
      } else {
        toSkip.push(leaf);
      }
    }
  }

  return { toTranslate, toSkip };
}

function prepareDirectBatch(toTranslate, customRegex, protection) {
  return toTranslate.map((leaf) => {
    const protectedText = protectText(leaf.value, protection);
    if (leaf.placeholderMode !== 'mask') {
      return {
        ...leaf,
        masked: protectedText.value,
        placeholderMap: new Map(),
        protectionMap: protectedText.map,
        needsUnmask: false,
      };
    }
    const { masked, map } = maskPlaceholders(protectedText.value, customRegex);
    return {
      ...leaf,
      masked,
      placeholderMap: map,
      protectionMap: protectedText.map,
      needsUnmask: map.size > 0,
    };
  });
}

async function runTranslation(maskedBatch, targetLang, options) {
  const batchItems = maskedBatch.map((item) => ({ value: item.masked, keyPath: item.keyPath }));
  const results = await translateBatchInChunks(batchItems, targetLang, options);
  return results;
}

async function translateBatchInChunks(batch, targetLang, options) {
  if (batch.length === 0) return [];

  const batchSize = clampInt(options.batchSize, 1, 10000, 50);
  const results = [];
  const onProgress = options.onProgress;
  let completed = 0;

  for (let start = 0; start < batch.length; start += batchSize) {
    const chunk = batch.slice(start, start + batchSize);
    const chunkResults = await translateBatch(chunk, targetLang, {
      ...options,
      onProgress: (info) => {
        completed++;
        if (typeof onProgress === 'function') {
          onProgress({
            ...info,
            completed,
            total: batch.length,
            chunkCompleted: info.completed,
            chunkTotal: info.total,
          });
        }
      },
    });
    results.push(...chunkResults);
  }

  return results;
}

function containsAllPlaceholders(value, placeholders) {
  if (typeof value !== 'string') return false;
  return (placeholders || []).every((placeholder) => value.includes(placeholder));
}

function createPlaceholderManifest(sourcePath, targetLang, leaves) {
  const records = leaves
    .filter((leaf) => Array.isArray(leaf.placeholders) && leaf.placeholders.length > 0)
    .map((leaf) => ({
      keyPath: leaf.keyPath,
      placeholders: leaf.placeholders,
    }));

  if (records.length === 0) return null;

  const safeName = path.basename(sourcePath).replace(/[^a-z0-9_.-]/gi, '_');
  const manifestPath = path.join(os.tmpdir(), `i18ntk-placeholders-${process.pid}-${Date.now()}-${targetLang}-${safeName}.json`);
  SecurityUtils.safeWriteFileSync(manifestPath, JSON.stringify({
    version: 1,
    sourceFile: sourcePath,
    targetLang,
    createdAt: new Date().toISOString(),
    records,
  }, null, 2), os.tmpdir(), 'utf8');
  return manifestPath;
}

function cleanupPlaceholderManifest(manifestPath) {
  if (!manifestPath) return;
  try {
    fs.unlinkSync(manifestPath);
  } catch (_) {
    // Best-effort cleanup only.
  }
}

function makeTextJob(item, segment, segmentIndex, protection) {
  const leading = segment.value.match(/^\s*/)[0];
  const trailing = segment.value.match(/\s*$/)[0];
  const core = segment.value.slice(leading.length, segment.value.length - trailing.length);
  const protectedText = protectText(core, protection);

  return {
    value: protectedText.value,
    leading,
    trailing,
    protectionMap: protectedText.map,
    keyPath: `${item.keyPath}#segment${segmentIndex}`,
  };
}

async function translatePreservedItems(items, targetLang, options, customRegex, protection) {
  const segmentJobs = [];
  const plans = items.map((item) => {
    const segments = splitByPlaceholders(item.value, customRegex);
    const plan = { item, segments: [] };

    segments.forEach((segment, index) => {
      if (segment.type !== 'text' || !/[A-Za-z0-9]/.test(segment.value)) {
        plan.segments.push({ type: segment.type, value: segment.value });
        return;
      }

      const job = makeTextJob(item, segment, index, protection);
      if (!job.value || !/[A-Za-z0-9]/.test(job.value)) {
        plan.segments.push({ type: 'text', value: segment.value });
        return;
      }

      const jobIndex = segmentJobs.length;
      segmentJobs.push(job);
      plan.segments.push({
        type: 'translated-text',
        jobIndex,
        leading: job.leading,
        trailing: job.trailing,
        protectionMap: job.protectionMap,
        fallback: segment.value,
      });
    });

    return plan;
  });

  const translatedSegments = await translateBatchInChunks(segmentJobs, targetLang, options);

  return plans.map((plan) => {
    const value = plan.segments.map((segment) => {
      if (segment.type === 'translated-text') {
        const translated = translatedSegments[segment.jobIndex];
        const restored = restoreText(translated || segment.fallback.trim(), segment.protectionMap);
        return `${segment.leading}${restored}${segment.trailing}`;
      }
      return segment.value;
    }).join('');

    return containsAllPlaceholders(value, plan.item.placeholders) ? value : plan.item.value;
  });
}

async function translateItems(toTranslate, targetLang, options, customRegex, protection) {
  const finalResults = new Array(toTranslate.length);
  const directItems = [];
  const directIndexes = [];
  const preserveItems = [];
  const preserveIndexes = [];

  toTranslate.forEach((item, index) => {
    if (item.placeholderMode === 'preserve') {
      preserveItems.push(item);
      preserveIndexes.push(index);
    } else {
      directItems.push(item);
      directIndexes.push(index);
    }
  });

  const preparedDirect = prepareDirectBatch(directItems, customRegex, protection);
  const directResults = await runTranslation(preparedDirect, targetLang, options);
  for (let i = 0; i < preparedDirect.length; i++) {
    const item = preparedDirect[i];
    let finalValue = item.needsUnmask
      ? unmaskPlaceholders(directResults[i], item.placeholderMap)
      : directResults[i];
    finalValue = restoreText(finalValue, item.protectionMap);

    if (item.placeholderMode === 'mask' && !containsAllPlaceholders(finalValue, item.placeholders)) {
      const fallback = await translatePreservedItems([item], targetLang, options, customRegex, protection);
      finalValue = fallback[0];
    }

    finalResults[directIndexes[i]] = finalValue;
  }

  const preservedResults = await translatePreservedItems(preserveItems, targetLang, options, customRegex, protection);
  for (let i = 0; i < preserveItems.length; i++) {
    finalResults[preserveIndexes[i]] = preservedResults[i];
  }

  return finalResults;
}

function applyResults(sourceData, translatedResults, toTranslate, toSkip) {
  const output = deepClone(sourceData);

  for (let i = 0; i < toTranslate.length; i++) {
    setLeaf(output, toTranslate[i].keyPath, translatedResults[i]);
  }

  for (const leaf of toSkip) {
    setLeaf(output, leaf.keyPath, leaf.value);
  }

  return output;
}

function writeOutput(outputData, outputPath, bom) {
  const resolvedOutputPath = path.resolve(process.cwd(), outputPath);
  const dir = path.dirname(resolvedOutputPath);
  if (!SecurityUtils.safeExistsSync(dir, path.dirname(dir))) {
    SecurityUtils.safeMkdirSync(dir, path.dirname(dir), { recursive: true });
  }
  let content = JSON.stringify(outputData, null, 2) + '\n';
  if (bom) {
    content = BOM + content;
  }
  SecurityUtils.safeWriteFileSync(resolvedOutputPath, content, dir, 'utf-8');
}

async function processFile(sourcePath, targetLang, args) {
  const fileName = path.basename(sourcePath);
  const targetDir = args.outputDir || path.join(path.dirname(path.dirname(sourcePath)), targetLang);
  const targetPath = path.join(targetDir, fileName);

  let sourceData;
  try {
    const raw = SecurityUtils.safeReadFileSync(sourcePath, path.dirname(sourcePath), 'utf-8').replace(/^\uFEFF/, '');
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

  const protection = args.protection || loadProtectionConfig(args.protectionFile, {
    enabled: args.protectionEnabled,
    create: args.createProtectionFile,
  });
  const protectedLeaves = leaves
    .filter((leaf) => shouldPreserveWholeValue(leaf.keyPath, leaf.value, protection))
    .map((leaf) => ({ ...leaf, skipReason: 'protected' }));
  const translatableLeaves = leaves.filter((leaf) => !shouldPreserveWholeValue(leaf.keyPath, leaf.value, protection));
  const { withPlaceholders, withoutPlaceholders } = classifyLeaves(translatableLeaves, args.customRegex);
  const { strategy, interactiveMode } = await resolvePlaceholderStrategy(args);

  if (args.dryRun && strategy === 'skip' && withPlaceholders.length > 0) {
    await previewSkipped(withPlaceholders);
    const skippedKeys = withPlaceholders.concat(protectedLeaves);
    return {
      total: leaves.length,
      translated: withoutPlaceholders.length,
      skipped: skippedKeys.length,
      skippedKeys,
      placeholderProtected: 0,
      protectedSkipped: protectedLeaves.length,
      dryRun: true,
    };
  }

  if (args.dryRun) {
    const protectedCount = strategy === 'send' ? 0 : withPlaceholders.length;
    console.log(`[${fileName}] Dry-run: ${leaves.length} strings would be translated.`);
    if (protectedLeaves.length > 0) {
      console.log(`[${fileName}] Dry-run: ${protectedLeaves.length} protected keys/values would be copied unchanged.`);
    }
    if (hasProtectionRules(protection)) {
      console.log(`[${fileName}] Dry-run: protected terms would be masked from ${protection.filePath}.`);
    }
    if (protectedCount > 0) {
      console.log(`[${fileName}] Dry-run: ${protectedCount} placeholder strings would use preserve mode.`);
    }
    return {
      total: leaves.length,
      translated: leaves.length - protectedLeaves.length,
      skipped: protectedLeaves.length,
      skippedKeys: protectedLeaves,
      placeholderProtected: protectedCount,
      termProtected: hasProtectionRules(protection),
      dryRun: true,
    };
  }

  const decisions = await resolvePerKeyDecisions(withPlaceholders, interactiveMode);
  const { toTranslate, toSkip } = buildTranslateList(withPlaceholders, withoutPlaceholders, strategy, decisions);
  toSkip.push(...protectedLeaves);
  const placeholderProtected = toTranslate.filter((leaf) => leaf.placeholderMode === 'preserve').length;
  const placeholderSkipped = toSkip.filter((leaf) => leaf.skipReason !== 'protected').length;

  if (placeholderSkipped > 0) {
    console.log(`[${fileName}] Skipping ${placeholderSkipped} keys with placeholders.`);
  }
  if (placeholderProtected > 0) {
    console.log(`[${fileName}] Preserving placeholders for ${placeholderProtected} keys.`);
  }
  if (protectedLeaves.length > 0) {
    console.log(`[${fileName}] Copying ${protectedLeaves.length} protected keys/values unchanged.`);
  }
  if (hasProtectionRules(protection)) {
    console.log(`[${fileName}] Protecting terms from: ${protection.filePath}`);
  }

  const manifestPath = createPlaceholderManifest(sourcePath, targetLang, toTranslate);

  const translateOptions = {
    sourceLang: args.sourceLang,
    concurrency: args.concurrency,
    batchSize: args.batchSize,
    retryCount: args.retryCount,
    retryDelay: args.retryDelay,
    timeout: args.timeout,
    customFn: args.translateFn,
    onProgress: (info) => {
      if (info.completed % args.progressInterval === 0 || info.completed === info.total) {
        process.stdout.write(`\r[${fileName}] Translating... ${info.completed}/${info.total}`);
      }
    },
    onError: (err) => {
      console.error(`\n[${fileName}] Warning: Failed to translate key "${err.item.keyPath}": ${err.message}`);
    },
  };

  let translatedResults;
  try {
    if (toTranslate.length > 0) {
      translatedResults = await translateItems(toTranslate, targetLang, translateOptions, args.customRegex, protection);
      process.stdout.write('\n');
    } else {
      translatedResults = [];
    }
  } finally {
    cleanupPlaceholderManifest(manifestPath);
  }

  const output = applyResults(sourceData, translatedResults, toTranslate, toSkip);
  writeOutput(output, targetPath, args.bom);

  console.log(`[${fileName}] Written: ${targetPath}`);

  return {
    total: leaves.length,
    translated: translatedResults.length,
    skipped: toSkip.length,
    skippedKeys: toSkip,
    placeholderProtected,
    protectedSkipped: protectedLeaves.length,
  };
}

async function run(args) {
  if (args.help) {
    printHelp();
    return { success: true, exitCode: ExitCodes.SUCCESS };
  }

  if (args.unknown.length > 0) {
    console.error(`Unknown options: ${args.unknown.join(', ')}`);
    console.error('Use --help for usage information.');
    return { success: false, exitCode: 1, error: 'Unknown options' };
  }

  if (!args.targetLang) {
    console.error('Error: Target language code is required.');
    console.error('Usage: i18ntk-translate <source-file> <target-lang> [options]');
    return { success: false, exitCode: 1, error: 'Target language code is required' };
  }

  if (args.translateFnPath) {
    args.translateFn = loadCustomTranslateFn(args.translateFnPath);
  }

  if (args.protectionEnabled !== false) {
    if (args.createProtectionFile) {
      const protectionPath = createProtectionFile(args.protectionFile);
      console.log(`Protection file ready: ${protectionPath}`);
    }
    try {
      args.protection = loadProtectionConfig(args.protectionFile, {
        enabled: args.protectionEnabled,
      });
    } catch (error) {
      return { success: false, exitCode: 1, error: error.message };
    }
  }

  const sourceFiles = resolveSourceFiles(args.sourceFile, args.sourceDir, args.filesPattern);

  const allSkippedKeys = [];
  let grandTotal = 0;
  let grandTranslated = 0;
  let grandSkipped = 0;
  let grandPlaceholderProtected = 0;
  let grandProtectedSkipped = 0;

  for (const srcPath of sourceFiles) {
    const result = await processFile(srcPath, args.targetLang, args);
    if (result) {
      grandTotal += result.total;
      grandTranslated += result.translated;
      grandSkipped += result.skipped;
      grandPlaceholderProtected += result.placeholderProtected || 0;
      grandProtectedSkipped += result.protectedSkipped || 0;
      if (result.skippedKeys && result.skippedKeys.length > 0) {
        allSkippedKeys.push(...result.skippedKeys);
      }
    }
  }

  console.log('');
  console.log(formatSummaryLine(grandSkipped, grandTranslated, grandTotal, grandPlaceholderProtected, grandProtectedSkipped));

  if (allSkippedKeys.length > 0 || args.reportFile || args.reportStdout) {
    const report = generateReport(allSkippedKeys, grandTranslated, grandTotal, {
      sourceFile: sourceFiles.length === 1 ? sourceFiles[0] : `${sourceFiles.length} files`,
      targetLang: args.targetLang,
      dryRun: args.dryRun,
      placeholderProtected: grandPlaceholderProtected,
      protectedSkipped: grandProtectedSkipped,
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

  return {
    success: true,
    exitCode: ExitCodes.SUCCESS,
    total: grandTotal,
    translated: grandTranslated,
    skipped: grandSkipped,
    placeholderProtected: grandPlaceholderProtected,
    protectedSkipped: grandProtectedSkipped,
  };
}

async function main() {
  const result = await run(parseArgs(process.argv));
  process.exit(result.exitCode || (result.success ? ExitCodes.SUCCESS : 1));
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  resolveSourceFiles,
  processFile,
  run,
};
