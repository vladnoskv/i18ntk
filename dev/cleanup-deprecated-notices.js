#!/usr/bin/env node

/**
 * Cleanup duplicate deprecation notices across the repository
 * - Collapses repeated "(DEPRECATED - use latest version)" tags
 * - Removes any deprecation tag right after latest version occurrences (1.6.3)
 * - Works idempotently and prints a concise summary
 */

const fs = require('fs');
const path = require('path');

const LATEST_VERSION = '1.6.3';
const DEPRECATION_TAG = '(DEPRECATED - use latest version)';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'coverage',
  'benchmarks/results',
  'i18ntk-reports',
]);

const TEXT_EXTENSIONS = new Set([
  '.md', '.mdx', '.txt',
  '.js', '.cjs', '.mjs',
  '.json', '.yml', '.yaml',
]);

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function shouldSkipDir(dirPath) {
  const parts = dirPath.split(path.sep);
  return parts.some((p, idx) => {
    const joinPart = parts.slice(0, idx + 1).join(path.sep);
    return IGNORED_DIRS.has(p) || IGNORED_DIRS.has(joinPart);
  });
}

function walkDir(dir) {
  const results = [];
  if (shouldSkipDir(dir)) return results;

  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else if (entry.isFile() && isTextFile(full)) {
      results.push(full);
    }
  }
  return results;
}

function cleanContent(content) {
  let updated = content;
  let changed = false;

  // 1) Collapse multiple occurrences of the tag anywhere
  const multiTag = /(\(DEPRECATED - use latest version\)\s*){2,}/g;
  if (multiTag.test(updated)) {
    updated = updated.replace(multiTag, `${DEPRECATION_TAG} `);
    changed = true;
  }

  // 2) Remove the tag when it follows the latest package version references
  const afterLatestRefs = [
    /(i18ntk@1\.6\.3)\s*(\(DEPRECATED - use latest version\)\s*)+/gi,
    /(@1\.6\.3)\s*(\(DEPRECATED - use latest version\)\s*)+/g,
    /(Version:\*\*\s*1\.6\.3)\s*(\(DEPRECATED - use latest version\)\s*)+/g,
  ];
  for (const r of afterLatestRefs) {
    if (r.test(updated)) {
      updated = updated.replace(r, (_, g1) => g1);
      changed = true;
    }
  }

  // 3) General safety: when a line already contains the tag, ensure only a single copy exists
  //    by collapsing any remaining repeats on the same line
  const lineRepeat = new RegExp(`(${escapeRegex(DEPRECATION_TAG)})(\s*${escapeRegex(DEPRECATION_TAG)})+`, 'g');
  if (lineRepeat.test(updated)) {
    updated = updated.replace(lineRepeat, '$1');
    changed = true;
  }

  // 4) Normalize extra spaces introduced during replacements
  updated = updated.replace(/[ \t]+\n/g, '\n');

  return { updated, changed };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  const root = process.cwd();

  console.log('🔧 Cleaning duplicate deprecation notices...');
  console.log(`📦 Root: ${root}`);
  console.log(`✅ Latest version: ${LATEST_VERSION}`);
  if (dryRun) console.log('🧪 Dry run mode (no files will be written)\n');

  const files = walkDir(root);

  let filesProcessed = 0;
  let filesChanged = 0;

  for (const file of files) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    if (!content.includes('DEPRECATED - use latest version')) {
      filesProcessed++;
      continue;
    }

    const { updated, changed } = cleanContent(content);
    if (changed) {
      if (dryRun) {
        console.log(`⚠️  Would fix: ${path.relative(root, file)}`);
      } else {
        fs.writeFileSync(file, updated, 'utf8');
        console.log(`✅ Fixed: ${path.relative(root, file)}`);
      }
      filesChanged++;
    } else {
      // No change needed, but still processed
    }

    filesProcessed++;
  }

  console.log('\n📊 Cleanup Summary');
  console.log(`📁 Files scanned: ${filesProcessed}`);
  console.log(`🧹 Files updated: ${filesChanged}`);
  console.log('🎉 Done.');
}

if (require.main === module) {
  main();
}