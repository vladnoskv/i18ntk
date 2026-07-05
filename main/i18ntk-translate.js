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
 *   --provider <name>          Translation provider: google, deepl, libretranslate
 *   --custom-regex <regex>     Additional placeholder regex pattern
 *   --no-confirm               Skip all confirmation dialogs
 *   --preserve-placeholders    Translate text around placeholders and reinsert tokens
 *   --skip-placeholders        Skip all strings containing placeholders
 *   --send-placeholders        Translate all strings including masked placeholders
 *   --protection-file <path>   JSON file with protected terms, keys, values, and patterns
 *   --create-protection-file   Create the protection JSON file if it does not exist
 *   --no-protection            Disable protected term/key/value handling for this run
 *   --concurrency <n>          Max concurrent API requests (default: 12, Google max: 100)
 *   --batch-size <n>           Number of text segments per batch (default: 50)
 *   --dry-run                  Preview mode without API calls
 *   --only-missing             Translate only missing, marker, source-copy, or likely English target values
 *   --translate-all            Re-translate every source string even when a target value already exists
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
const { translateBatch, DEFAULT_CONCURRENCY, clampProviderConcurrency } = require('../utils/translate/api');
const { collectLeaves, getLeaf, setLeaf, deepClone } = require('../utils/translate/traverse');
const { generateReport, writeReport, writeResidualReport, formatSummaryLine } = require('../utils/translate/report');
const { analyzeEnglishContent } = require('../utils/validation-risk');
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
    '  --provider <name>          Provider: google (default), deepl, libretranslate',
    '  --source-lang <code>       Source language code (default: en)',
    '  --custom-regex <regex>     Additional placeholder regex pattern',
    '  --no-confirm               Automate: skip confirmation dialogs',
    '  --preserve-placeholders    Translate text around placeholders and reinsert tokens',
    '  --skip-placeholders        Skip all strings with placeholder tokens',
    '  --send-placeholders        Translate all strings including masked placeholders',
    '  --protection-file <path>   Protected terms/keys JSON file (default: i18ntk-auto-translate.json)',
    '  --create-protection-file   Create the protection JSON file if missing',
    '  --no-protection            Disable protected term/key/value handling',
    '  --concurrency <n>          Max concurrent API requests (default: 12, Google max: 100)',
    '  --batch-size <n>           Number of text segments per batch (default: 50)',
    '  --progress-interval <n>    Progress update interval (default: 10)',
    '  --dry-run                  Preview: show what would be skipped',
    '  --only-missing             Translate only missing, marker, source-copy, or likely English target values (default)',
    '  --translate-all            Re-translate every source string even when target values already exist',
    '  --report-file <path>       Write post-translation report to file',
    '  --report-stdout            Print post-translation report to stdout',
    '  --bom                      Write output files with UTF-8 BOM',
    '  --translate-fn <module>    Path to custom translation function module',
    '  --retry-count <n>          Max retries per failed request (default: 3)',
    '  --retry-delay <ms>         Base backoff delay in ms (default: 1000)',
    '  --timeout <ms>             HTTP request timeout in ms (default: 15000)',
    '',
    'Environment:',
    '  I18NTK_TRANSLATE_PROVIDER  Default provider when --provider is omitted',
    '  DEEPL_API_KEY              Required for --provider deepl',
    '  DEEPL_API_URL              Optional, defaults to https://api-free.deepl.com/v2/translate',
    '  I18NTK_ALLOW_CUSTOM_TRANSLATE_HOSTS=1  Allow custom DeepL-compatible HTTPS hosts',
    '  LIBRETRANSLATE_URL         Optional, defaults to https://libretranslate.com/translate',
    '  LIBRETRANSLATE_API_KEY     Optional API key for LibreTranslate servers that require one',
    '  I18NTK_ALLOW_PRIVATE_TRANSLATE_URLS=1  Allow localhost/private provider URLs for trusted testing',
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
    provider: process.env.I18NTK_TRANSLATE_PROVIDER || 'google',
    customRegex: [],
    noConfirm: false,
    preservePlaceholders: false,
    skipPlaceholders: false,
    sendPlaceholders: false,
    protectionFile: DEFAULT_PROTECTION_FILE,
    protectionEnabled: true,
    createProtectionFile: false,
    concurrency: DEFAULT_CONCURRENCY,
    batchSize: 50,
    progressInterval: 10,
    dryRun: false,
    onlyMissingOrEnglish: true,
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
    else if (arg === '--translate-all' || arg === '--force-translate') { args.onlyMissingOrEnglish = false; }
    else if (arg === '--only-missing' || arg === '--only-missing-or-english') { args.onlyMissingOrEnglish = true; }
    else if (arg === '--report-stdout') { args.reportStdout = true; }
    else if (arg === '--bom') { args.bom = true; }
    else if (arg === '--source-dir' && i + 1 < argv.length) { args.sourceDir = argv[++i]; }
    else if (arg === '--output-dir' && i + 1 < argv.length) { args.outputDir = argv[++i]; }
    else if (arg === '--source-lang' && i + 1 < argv.length) { args.sourceLang = argv[++i]; }
    else if (arg === '--provider' && i + 1 < argv.length) { args.provider = argv[++i]; }
    else if (arg === '--custom-regex' && i + 1 < argv.length) { args.customRegex.push(argv[++i]); }
    else if (arg === '--protection-file' && i + 1 < argv.length) { args.protectionFile = argv[++i]; }
    else if (arg === '--concurrency' && i + 1 < argv.length) { args.concurrency = parseInt(argv[++i], 10) || DEFAULT_CONCURRENCY; }
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

  args.concurrency = clampProviderConcurrency(args.concurrency, args.provider, DEFAULT_CONCURRENCY);
  args.batchSize = clampInt(args.batchSize, 1, 10000, 50);
  args.progressInterval = clampInt(args.progressInterval, 1, 10000, 10);

  return args;
}

const UNTRANSLATED_MARKERS = new Set([
  '',
  '__not_translated__',
  'not_translated',
  '[translate]',
  '[not translated]',
  'todo',
  'tbd',
]);

function clampInt(value, min, max, fallback) {
  const num = parseInt(value, 10);
  if (!Number.isInteger(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}

function loadCustomTranslateFn(modulePath) {
  if (!modulePath) return null;
  try {
    const resolved = path.isAbsolute(modulePath) ? modulePath : path.resolve(process.cwd(), modulePath);
    const validated = SecurityUtils.validatePath(resolved);
    if (!validated) {
      SecurityUtils.logSecurityEvent('Blocked unsafe custom translate module path', 'warn', {
        modulePath,
        resolved,
        source: 'user'
      });
      console.error(`Error: Custom translate module path "${modulePath}" failed security validation.`);
      process.exit(1);
    }
    const mod = require(validated);
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

function readExistingTargetData(targetPath) {
  if (!SecurityUtils.safeExistsSync(targetPath, path.dirname(targetPath))) {
    return null;
  }

  try {
    const raw = SecurityUtils.safeReadFileSync(targetPath, path.dirname(targetPath), 'utf-8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Warning: Could not read existing target file "${targetPath}": ${error.message}`);
    return null;
  }
}

function isUntranslatedMarker(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return UNTRANSLATED_MARKERS.has(normalized);
}

function isLikelyEnglish(value, args) {
  const text = String(value || '').trim();
  if (!text) return false;
  const analysis = analyzeEnglishContent(text, {
    allowedEnglishTerms: args.allowedEnglishTerms,
  });
  const threshold = Number.isFinite(Number(args.englishThresholdPercent))
    ? Number(args.englishThresholdPercent)
    : 10;
  return analysis.englishPercentage > threshold && analysis.englishWordCount >= 2;
}

function normalizeLanguageCode(language) {
  return String(language || '').trim().toLowerCase().replace(/_/g, '-').split('-')[0];
}

function parseLanguagePrefix(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^\s*\[([A-Z]{2,3}(?:[-_][A-Z0-9]{2,4})?)\]\s*(.+)$/i);
  if (!match) return null;
  return {
    raw: match[1],
    language: normalizeLanguageCode(match[1]),
    text: match[2].trim(),
  };
}

function hasLatinWordContent(value, minWords = 2) {
  const words = String(value || '').match(/[A-Za-z][A-Za-z'-]*/g) || [];
  return words.filter(word => word.length > 1).length >= minWords;
}

function isLanguagePrefixedEnglish(value, args = {}) {
  const prefix = parseLanguagePrefix(value);
  if (!prefix || !prefix.text) return false;

  const targetLanguage = normalizeLanguageCode(args.targetLang);
  if (targetLanguage && prefix.language !== targetLanguage) return false;

  return hasLatinWordContent(prefix.text, 1) || isLikelyEnglish(prefix.text, args);
}

function isSafeUnchangedSourceCopy(value, args = {}) {
  const text = String(value ?? '').trim();
  if (!text) return false;

  const normalized = text.toLowerCase();
  const allowedTerms = new Set(['api']);
  if (Array.isArray(args.allowedEnglishTerms)) {
    args.allowedEnglishTerms
      .filter(term => typeof term === 'string' && term.trim())
      .forEach(term => allowedTerms.add(term.trim().toLowerCase()));
  }
  if (allowedTerms.has(normalized)) return true;

  const tokens = text.match(/[A-Za-z0-9]+/g) || [];
  if (tokens.length === 0) return true;

  return tokens.every((token) => {
    if (!/[A-Za-z]/.test(token)) return true;
    return token.length <= 8 && /^[A-Z0-9]{2,}$/.test(token);
  });
}

function isBrokenTranslationValue(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (!text) return false;
  if (text.includes('\uFFFD')) return true;

  const compact = text.replace(/[\s.,!;:()[\]{}'"`~_\-]/g, '');
  if (compact.length >= 1 && /^\?+$/.test(compact)) return true;
  if (/\?{3,}/.test(text)) return true;

  const questionCount = (text.match(/\?/g) || []).length;
  const visibleLength = Math.max(text.replace(/\s/g, '').length, 1);
  if (questionCount >= 3 && questionCount / visibleLength >= 0.5) return true;

  if (/[\u0080-\u009F]/.test(text) && /[ÃÂÐÑ]/.test(text)) return true;

  const mojibakePatterns = [
    /[ÃÂ][\u0080-\u00BF]/,
    /Ð[\u0080-\u00BF]/,
    /Ñ[\u0080-\u00BF]/,
    /ã[‚ƒ€]/,
  ];
  return mojibakePatterns.some((pattern) => pattern.test(text));
}

function shouldTranslateTargetValue(sourceValue, targetValue, args) {
  if (targetValue === undefined || targetValue === null) return true;
  if (typeof targetValue !== 'string') return true;
  if (isUntranslatedMarker(targetValue)) return true;
  if (isBrokenTranslationValue(targetValue)) return true;
  if (isLanguagePrefixedEnglish(targetValue, args)) return true;
  if (targetValue.trim() === String(sourceValue ?? '').trim()) {
    return !isSafeUnchangedSourceCopy(targetValue, args);
  }
  if (args.onlyMissingOrEnglish !== false && isLikelyEnglish(targetValue, args)) return true;
  return args.onlyMissingOrEnglish === false;
}

function getResidualUntranslatedReason(sourceValue, targetValue, args) {
  if (targetValue === undefined || targetValue === null) return 'missing';
  if (typeof targetValue !== 'string') return 'non_string';
  if (isUntranslatedMarker(targetValue)) return 'marker';
  if (isBrokenTranslationValue(targetValue)) return 'broken';
  if (isLanguagePrefixedEnglish(targetValue, args)) return 'language_prefix';
  if (targetValue.trim() === String(sourceValue ?? '').trim()) {
    return isSafeUnchangedSourceCopy(targetValue, args) ? null : 'source_copy';
  }
  return null;
}

function planTargetAwareLeaves(sourceLeaves, targetData, args) {
  if (!targetData || args.onlyMissingOrEnglish === false) {
    return {
      translatableLeaves: sourceLeaves,
      existingLeaves: [],
    };
  }

  const translatableLeaves = [];
  const existingLeaves = [];

  for (const leaf of sourceLeaves) {
    const targetValue = getLeaf(targetData, leaf.keyPath);
    if (shouldTranslateTargetValue(leaf.value, targetValue, args)) {
      translatableLeaves.push(leaf);
    } else {
      existingLeaves.push({ ...leaf, value: targetValue, skipReason: 'existing' });
    }
  }

  return { translatableLeaves, existingLeaves };
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
  const results = await translateBatchInChunks(batchItems, targetLang, {
    ...options,
    stageLabel: 'Translating strings',
    progressUnit: 'strings',
  });
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
            keyPath: info.keyPath,
            stage: options.stageLabel || 'Translating',
            unit: options.progressUnit || 'items',
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

  const translatedSegments = await translateBatchInChunks(segmentJobs, targetLang, {
    ...options,
    stageLabel: 'Translating placeholder-safe text segments',
    progressUnit: 'segments',
  });

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

function applyResults(sourceData, translatedResults, toTranslate, toSkip, targetData = null) {
  const output = deepClone(targetData || sourceData);

  for (let i = 0; i < toTranslate.length; i++) {
    setLeaf(output, toTranslate[i].keyPath, translatedResults[i]);
  }

  for (const leaf of toSkip) {
    setLeaf(output, leaf.keyPath, leaf.value);
  }

  return output;
}

function findResidualUntranslatedLeaves(sourceLeaves, outputData, args, options = {}) {
  const ignoredKeys = options.ignoredKeys || new Set();
  const residual = [];

  for (const leaf of sourceLeaves) {
    if (ignoredKeys.has(leaf.keyPath)) continue;

    const targetValue = getLeaf(outputData, leaf.keyPath);
    const reason = getResidualUntranslatedReason(leaf.value, targetValue, args);
    if (reason) {
      residual.push({
        keyPath: leaf.keyPath,
        value: String(targetValue ?? ''),
        sourceValue: leaf.value,
        reason,
        fileName: options.fileName,
      });
    }
  }

  return residual;
}

function buildResidualRetryItems(residualLeaves, customRegex) {
  return residualLeaves.map((leaf) => {
    const placeholders = detectPlaceholders(leaf.sourceValue, customRegex);
    return {
      keyPath: leaf.keyPath,
      value: leaf.sourceValue,
      placeholders,
      placeholderMode: placeholders.length > 0 ? 'preserve' : 'none',
    };
  });
}

function formatProgressKey(keyPath) {
  if (!keyPath) return '';
  const value = String(keyPath);
  return value.length > 72 ? `${value.slice(0, 69)}...` : value;
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
  const resolvedSourcePath = path.resolve(process.cwd(), sourcePath);
  const fileName = path.basename(resolvedSourcePath);
  const targetDir = args.outputDir
    ? path.join(args.outputDir, targetLang)
    : path.join(path.dirname(path.dirname(resolvedSourcePath)), targetLang);
  const targetPath = path.join(targetDir, fileName);
  const runArgs = { ...args, targetLang };

  let sourceData;
  try {
    const raw = SecurityUtils.safeReadFileSync(resolvedSourcePath, path.dirname(resolvedSourcePath), 'utf-8');
    if (raw === null || raw === undefined) {
      throw new Error('safe read returned no content');
    }
    sourceData = JSON.parse(raw.replace(/^\uFEFF/, ''));
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

  const targetData = readExistingTargetData(targetPath);
  const { translatableLeaves: candidateLeaves, existingLeaves } = planTargetAwareLeaves(leaves, targetData, runArgs);

  const protection = runArgs.protection || loadProtectionConfig(runArgs.protectionFile, {
    enabled: runArgs.protectionEnabled,
    create: runArgs.createProtectionFile,
  });
  const protectedLeaves = candidateLeaves
    .filter((leaf) => shouldPreserveWholeValue(leaf.keyPath, leaf.value, protection))
    .map((leaf) => ({ ...leaf, skipReason: 'protected' }));
  const translatableLeaves = candidateLeaves.filter((leaf) => !shouldPreserveWholeValue(leaf.keyPath, leaf.value, protection));
  const { withPlaceholders, withoutPlaceholders } = classifyLeaves(translatableLeaves, runArgs.customRegex);
  const { strategy, interactiveMode } = await resolvePlaceholderStrategy(runArgs);

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
      skippedExisting: existingLeaves.length,
      dryRun: true,
    };
  }

  if (args.dryRun) {
    const protectedCount = strategy === 'send' ? 0 : withPlaceholders.length;
    console.log(`[${fileName}] Dry-run: ${candidateLeaves.length} of ${leaves.length} strings would be translated.`);
    if (existingLeaves.length > 0) {
      console.log(`[${fileName}] Dry-run: ${existingLeaves.length} existing translated strings would be kept.`);
    }
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
      translated: candidateLeaves.length - protectedLeaves.length,
      skipped: protectedLeaves.length,
      skippedKeys: protectedLeaves,
      placeholderProtected: protectedCount,
      termProtected: hasProtectionRules(protection),
      skippedExisting: existingLeaves.length,
      dryRun: true,
    };
  }

  const decisions = await resolvePerKeyDecisions(withPlaceholders, interactiveMode);
  const { toTranslate, toSkip } = buildTranslateList(withPlaceholders, withoutPlaceholders, strategy, decisions);
  toSkip.push(...protectedLeaves);
  toSkip.push(...existingLeaves);
  const placeholderProtected = toTranslate.filter((leaf) => leaf.placeholderMode === 'preserve').length;
  const placeholderSkipped = toSkip.filter((leaf) => leaf.skipReason !== 'protected' && leaf.skipReason !== 'existing').length;

  if (placeholderSkipped > 0) {
    console.log(`[${fileName}] Skipping ${placeholderSkipped} keys with placeholders.`);
  }
  if (placeholderProtected > 0) {
    console.log(`[${fileName}] Preserving placeholders for ${placeholderProtected} keys.`);
  }
  if (protectedLeaves.length > 0) {
    console.log(`[${fileName}] Copying ${protectedLeaves.length} protected keys/values unchanged.`);
  }
  if (existingLeaves.length > 0) {
    console.log(`[${fileName}] Keeping ${existingLeaves.length} existing translated keys.`);
  }
  if (hasProtectionRules(protection)) {
    console.log(`[${fileName}] Protecting terms from: ${protection.filePath}`);
  }

  const manifestPath = createPlaceholderManifest(resolvedSourcePath, targetLang, toTranslate);

  const translateOptions = {
    sourceLang: runArgs.sourceLang,
    provider: runArgs.provider,
    concurrency: runArgs.concurrency,
    batchSize: runArgs.batchSize,
    retryCount: runArgs.retryCount,
    retryDelay: runArgs.retryDelay,
    timeout: runArgs.timeout,
    customFn: runArgs.translateFn,
    onProgress: (info) => {
      if (info.completed % runArgs.progressInterval === 0 || info.completed === info.total) {
        const stage = info.stage || 'Translating';
        const unit = info.unit || 'items';
        const keyPath = formatProgressKey(info.keyPath);
        const keySuffix = keyPath ? ` | ${keyPath}` : '';
        process.stdout.write(`\r[${fileName}] ${stage}: ${info.completed}/${info.total} ${unit}${keySuffix}`);
      }
    },
    onError: (err) => {
      console.error(`\n[${fileName}] Warning: Failed to translate key "${err.item.keyPath}": ${err.message}`);
    },
  };

  let translatedResults;
  try {
    if (toTranslate.length > 0) {
      console.log(`[${fileName}] Preparing translation plan for ${toTranslate.length} keys.`);
      translatedResults = await translateItems(toTranslate, targetLang, translateOptions, runArgs.customRegex, protection);
      process.stdout.write('\n');
      console.log(`[${fileName}] Applying translated values.`);
    } else {
      translatedResults = [];
    }
  } finally {
    cleanupPlaceholderManifest(manifestPath);
  }

  const output = applyResults(sourceData, translatedResults, toTranslate, toSkip, targetData);
  const ignoredResidualKeys = new Set(protectedLeaves.map((leaf) => leaf.keyPath));
  let residualUntranslated = findResidualUntranslatedLeaves(leaves, output, runArgs, {
    ignoredKeys: ignoredResidualKeys,
    fileName,
  });
  let finalCheckRetried = 0;

  if (residualUntranslated.length > 0) {
    console.warn(`[${fileName}] Warning: Final check found ${residualUntranslated.length} values that still look untranslated. Retrying once before writing.`);
    const retryItems = buildResidualRetryItems(residualUntranslated, runArgs.customRegex);
    const retryResults = await translateItems(retryItems, targetLang, translateOptions, runArgs.customRegex, protection);
    retryItems.forEach((item, index) => {
      setLeaf(output, item.keyPath, retryResults[index]);
    });
    finalCheckRetried = retryItems.length;
    residualUntranslated = findResidualUntranslatedLeaves(leaves, output, runArgs, {
      ignoredKeys: ignoredResidualKeys,
      fileName,
    });
  }

  if (residualUntranslated.length > 0) {
    console.warn(`[${fileName}] Warning: ${residualUntranslated.length} values still look untranslated after retry. A resume report will capture these keys.`);
  }

  console.log(`[${fileName}] Writing output.`);
  writeOutput(output, targetPath, runArgs.bom);

  console.log(`[${fileName}] Written: ${targetPath}`);

  return {
    total: leaves.length,
    translated: translatedResults.length,
    skipped: toSkip.filter((leaf) => leaf.skipReason !== 'existing').length,
    skippedKeys: toSkip.filter((leaf) => leaf.skipReason !== 'existing'),
    placeholderProtected,
    protectedSkipped: protectedLeaves.length,
    skippedExisting: existingLeaves.length,
    finalCheckRetried,
    residualUntranslated,
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
  let grandSkippedExisting = 0;
  let grandFinalCheckRetried = 0;
  const allResidualUntranslated = [];

  for (const srcPath of sourceFiles) {
    const result = await processFile(srcPath, args.targetLang, args);
    if (result) {
      grandTotal += result.total;
      grandTranslated += result.translated;
      grandSkipped += result.skipped;
      grandPlaceholderProtected += result.placeholderProtected || 0;
      grandProtectedSkipped += result.protectedSkipped || 0;
      grandSkippedExisting += result.skippedExisting || 0;
      grandFinalCheckRetried += result.finalCheckRetried || 0;
      if (result.skippedKeys && result.skippedKeys.length > 0) {
        allSkippedKeys.push(...result.skippedKeys);
      }
      if (result.residualUntranslated && result.residualUntranslated.length > 0) {
        allResidualUntranslated.push(...result.residualUntranslated);
      }
    }
  }

  console.log('');
  console.log(formatSummaryLine(grandSkipped, grandTranslated, grandTotal, grandPlaceholderProtected, grandProtectedSkipped, grandSkippedExisting));
  if (grandFinalCheckRetried > 0) {
    console.log(`[translate] final check retried ${grandFinalCheckRetried} leftover values`);
  }

  if (allResidualUntranslated.length > 0) {
    console.warn(`WARNING: ${allResidualUntranslated.length} values still look untranslated after Auto Translate.`);
    const residualReportPath = writeResidualReport(allResidualUntranslated, {
      sourceFile: sourceFiles.length === 1 ? sourceFiles[0] : `${sourceFiles.length} files`,
      targetLang: args.targetLang,
    });
    if (residualReportPath) {
      console.warn(`Auto Translate resume report written: ${residualReportPath}`);
    } else {
      console.warn('Auto Translate could not write the resume report. Review the values listed in the report output.');
    }
  }

  if (allSkippedKeys.length > 0 || allResidualUntranslated.length > 0 || args.reportFile || args.reportStdout) {
    const report = generateReport(allSkippedKeys, grandTranslated, grandTotal, {
      sourceFile: sourceFiles.length === 1 ? sourceFiles[0] : `${sourceFiles.length} files`,
      targetLang: args.targetLang,
      dryRun: args.dryRun,
      placeholderProtected: grandPlaceholderProtected,
      protectedSkipped: grandProtectedSkipped,
      residualUntranslated: allResidualUntranslated,
    });

    if (args.reportStdout || (!args.reportFile && (allSkippedKeys.length > 0 || allResidualUntranslated.length > 0))) {
      console.log('');
      console.log(report);
    }

    if (args.reportFile) {
      const reportPath = path.resolve(process.cwd(), args.reportFile);
      writeReport(report, reportPath);
      console.log(`Report written: ${reportPath}`);
    }
  }

  const hadRealErrors = grandTranslated === 0 && grandTotal > 0;
  const hasResiduals = allResidualUntranslated.length > 0;

  return {
    success: !hadRealErrors,
    exitCode: hadRealErrors ? ExitCodes.VALIDATION_FAILED : ExitCodes.SUCCESS,
    error: hadRealErrors ? 'Auto Translate failed to translate any values' : undefined,
    total: grandTotal,
    translated: grandTranslated,
    skipped: grandSkipped,
    placeholderProtected: grandPlaceholderProtected,
    protectedSkipped: grandProtectedSkipped,
    skippedExisting: grandSkippedExisting,
    finalCheckRetried: grandFinalCheckRetried,
    residualUntranslated: allResidualUntranslated.length,
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
  isBrokenTranslationValue,
  processFile,
  run,
};
