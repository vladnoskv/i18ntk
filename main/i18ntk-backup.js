#!/usr/bin/env node

'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const SecurityUtils = require('../utils/security');

// Simple CLI argument parser
function parseArgs(args) {
  const result = { _: [] };
  let currentOption = null;

  for (const arg of args) {
    if (arg.startsWith('--')) {
      // Handle --option=value
      if (arg.includes('=')) {
        const [key, value] = arg.split('=');
        result[key.slice(2)] = value;
      } else {
        currentOption = arg.slice(2);
        result[currentOption] = true;
      }
    } else if (arg.startsWith('-')) {
      // Handle short options
      currentOption = arg.slice(1);
      result[currentOption] = true;
    } else if (currentOption) {
      // Handle option value
      result[currentOption] = arg;
      currentOption = null;
    } else {
      // Handle positional arguments
      result._.push(arg);
    }
  }

  return result;
}
function handleError(error) {
  logger.error(error.message || 'Unknown error');
  logger.debug(error.stack || error.message);
  process.exit(1);
}

function computeFileHash(filePath) {
  const content = SecurityUtils.safeReadFileSync(filePath, path.dirname(filePath));
  if (content === null) return null;
  try {
    const parsed = JSON.parse(content);
    const normalized = JSON.stringify(parsed);
    return crypto.createHash('sha256').update(normalized).digest('hex');
  } catch {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

function computeContentHash(content) {
  if (typeof content === 'object' && content !== null) {
    const normalized = JSON.stringify(content);
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
  const str = String(content);
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function collectJsonFiles(rootDir, currentDir = rootDir) {
  const entries = await fsp.readdir(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJsonFiles(rootDir, fullPath));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }

    const relativePath = path.relative(rootDir, fullPath).split(path.sep).join('/');
    files.push({ relativePath, fullPath });
  }

  return files;
}

async function findMostRecentBackup(backupDirPath) {
  try {
    const files = await fsp.readdir(backupDirPath);
    const backups = [];
    for (const file of files) {
      if (file.startsWith('backup-') && file.endsWith('.json')) {
        const filePath = path.join(backupDirPath, file);
        const stats = await fsp.stat(filePath);
        backups.push({ name: file, path: filePath, mtime: stats.mtime });
      }
    }
    backups.sort((a, b) => b.mtime - a.mtime);
    return backups[0] || null;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function getParentHashes(parentData) {
  if (parentData._meta && parentData._meta.hashes) {
    return parentData._meta.hashes;
  }
  const hashes = {};
  for (const [file, content] of Object.entries(parentData)) {
    if (typeof content === 'object' && content !== null) {
      hashes[file] = computeContentHash(content);
    }
  }
  return hashes;
}

async function buildRestoreChain(startPath, startData) {
  const chain = [{ path: startPath, data: startData }];
  const visited = new Set();
  visited.add(path.basename(startPath));
  let current = startData;
  let currentPath = startPath;

  while (current._meta && current._meta.parent) {
    if (chain.length >= 11) {
      throw new Error('Chain broken: incremental backup chain exceeds the maximum depth of 10');
    }
    const parentName = current._meta.parent;
    if (visited.has(parentName)) {
      throw new Error('circular chain reference');
    }
    visited.add(parentName);
    const parentDir = path.dirname(currentPath);
    const parentPath = path.join(parentDir, parentName);
    if (!SecurityUtils.safeExistsSync(parentPath, parentDir)) {
      throw new Error(`Chain broken: parent backup '${parentName}' not found in ${parentDir}`);
    }
    const parentRaw = SecurityUtils.safeReadFileSync(parentPath, parentDir, 'utf8');
    if (parentRaw === null) {
      throw new Error(`Chain broken: cannot read parent backup '${parentName}'`);
    }
    current = JSON.parse(parentRaw);
    currentPath = parentPath;
    chain.push({ path: currentPath, data: current });
  }

  chain.reverse();
  return chain;
}

function readBackupData(backupPath, baseDir) {
  const raw = SecurityUtils.safeReadFileSync(backupPath, baseDir, 'utf8');
  if (raw === null) {
    throw new Error(`Unable to read backup: ${path.basename(backupPath)}`);
  }
  return JSON.parse(raw);
}

function validateBackupEntryName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('Invalid backup entry name');
  }
  if (fileName === '_meta') {
    return null;
  }
  if (fileName.includes('\0') || /^[a-zA-Z]:/.test(fileName)) {
    throw new Error(`Unsafe backup entry name: ${fileName}`);
  }

  const normalizedSeparators = fileName.replace(/\\/g, '/');
  const rawSegments = normalizedSeparators.split('/');
  const normalized = path.posix.normalize(normalizedSeparators);
  const segments = normalized.split('/');

  if (
    path.posix.isAbsolute(normalizedSeparators) ||
    rawSegments.some(segment => !segment || segment === '.' || segment === '..') ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    !normalized.endsWith('.json') ||
    segments.some(segment => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error(`Unsafe backup entry name: ${fileName}`);
  }

  return normalized;
}

function restoreBackupEntry(outputDir, fileName, content) {
  const safeName = validateBackupEntryName(fileName);
  if (!safeName) return false;

  const filePath = SecurityUtils.safeJoin(outputDir, safeName);
  if (!filePath) {
    throw new Error(`Backup entry escapes restore directory: ${fileName}`);
  }
  if (!SecurityUtils.safeWriteFileSync(filePath, JSON.stringify(content, null, 2), outputDir, 'utf8')) {
    throw new Error(`Unable to restore backup entry: ${fileName}`);
  }
  return true;
}

function collectProtectedChainNames(backupDirPath, keptFiles) {
  const protectedNames = new Set();
  const byName = new Map();
  for (const file of keptFiles) {
    byName.set(file.name, file);
  }

  const queue = [];
  for (const file of keptFiles) {
    try {
      const data = readBackupData(file.path, backupDirPath);
      if (data._meta && data._meta.parent) {
        queue.push(data._meta.parent);
      }
    } catch {}
  }

  while (queue.length > 0) {
    const name = queue.shift();
    if (protectedNames.has(name)) {
      continue;
    }
    protectedNames.add(name);

    const file = byName.get(name) || {
      name,
      path: path.join(backupDirPath, name)
    };
    if (!SecurityUtils.safeExistsSync(file.path, backupDirPath)) {
      continue;
    }

    try {
      const data = readBackupData(file.path, backupDirPath);
      if (data._meta && data._meta.parent) {
        queue.push(data._meta.parent);
      }
    } catch {}
  }

  return protectedNames;
}

const configManager = require('../utils/config-manager');
const { logger } = require('../utils/logger');
const { colors } = require('../utils/logger');
const prompt = require('../utils/prompt');

// Backup configuration
const config = configManager.getConfig();
const backupDir = path.join(process.cwd(), 'i18ntk-backups');
const maxBackups = Math.min(Math.max(parseInt(config.backup?.maxBackups, 10) || 1, 1), 3);

// Main function to handle commands
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  // Show help if no command provided
  if (!command) {
    showHelp();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'create':
        await handleCreate(args);
        break;
      case 'restore':
        await handleRestore(args);
        break;
      case 'list':
        await handleList();
        break;
      case 'verify':
        await handleVerify(args);
        break;
      case 'cleanup':
        await handleCleanup(args);
        break;
      default:
        logger.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    handleError(error);
  }
}

function showHelp() {
  console.log(`
i18ntk-backup - Secure backup and restore for i18n translation files

Usage:
  i18ntk-backup <command> [options]

Commands:
  create <dir>     Create a backup of translation files
  restore <file>   Restore from a backup
  list             List available backups
  verify <file>    Verify the integrity of a backup file
  cleanup          Remove old backups

Options:
  --output <path>   Output directory for backup/restore
  --force           Overwrite existing files without prompting
  --keep <number>   Number of backups to keep (default: 10)
  --incremental     Create an incremental backup (only changed files)
`);
}

// Command handlers
async function cleanupOldBackups(backupDirPath) {
  try {
    const files = await fsp.readdir(backupDirPath);
    const backupFiles = files
      .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(backupDirPath, file),
        time: fs.statSync(path.join(backupDirPath, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    const toDelete = backupFiles.slice(maxBackups);
    const kept = backupFiles.slice(0, maxBackups);

    const protectedChainNames = collectProtectedChainNames(backupDirPath, kept);

    for (const file of toDelete) {
      if (protectedChainNames.has(file.name)) {
        logger.info(`  Keeping ${file.name} (parent of a kept incremental backup)`);
        continue;
      }
      try {
        await fsp.unlink(file.path);
      } catch (err) {
        logger.warn(`Could not remove old backup ${file.name}: ${err.message}`);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      logger.warn(`Error during cleanup: ${err.message}`);
    }
  }
}

async function handleCreate(args) {
  const dir = args._[1] || path.join(__dirname, '..', 'locales');
  const outputDir = args.output || backupDir;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `backup-${timestamp}.json`;
  const backupPath = path.join(outputDir, backupName);
  const isIncremental = args.incremental !== 'false' && args.incremental !== false;

  logger.debug(`Source directory: ${dir}`);
  logger.debug(`Backup will be saved to: ${backupPath}`);

  try {
    await fsp.mkdir(outputDir, { recursive: true });
    logger.debug(`Created backup directory: ${outputDir}`);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      logger.error(`Failed to create backup directory: ${err.message}`);
      throw err;
    }
    logger.debug(`Using existing backup directory: ${outputDir}`);
  }

  const sourceDir = path.resolve(dir);
  try {
    const stats = await fsp.stat(sourceDir);
    if (!stats.isDirectory()) {
      throw new Error(`Path exists but is not a directory: ${sourceDir}`);
    }
    logger.debug(`Source directory exists: ${sourceDir}`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Directory not found: ${sourceDir}. Please specify a valid directory.`);
    }
    throw new Error(`Error accessing directory ${sourceDir}: ${err.message}`);
  }

  logger.info('\nCreating backup...');

  const files = await collectJsonFiles(sourceDir);

  if (files.length === 0) {
    logger.warn('No JSON files found in the specified directory');
    process.exit(0);
  }

  const translations = {};
  const hashes = {};
  for (const file of files) {
    const filePath = file.fullPath;
    try {
      const rawContent = SecurityUtils.safeReadFileSync(filePath, path.dirname(filePath), 'utf8');
      if (rawContent === null) {
        logger.error(`Could not read file ${file.relativePath}`);
        continue;
      }
      translations[file.relativePath] = JSON.parse(rawContent);
      hashes[file.relativePath] = computeFileHash(filePath);
    } catch (error) {
      logger.error(`Could not read file ${file.relativePath}: ${error.message}`);
    }
  }

  let meta = {
    type: 'full',
    parent: null,
    chainDepth: 0,
    hashes: hashes
  };
  let filesToInclude = translations;

  if (isIncremental) {
    const parentBackup = await findMostRecentBackup(outputDir);
    if (parentBackup) {
      const parentRaw = SecurityUtils.safeReadFileSync(parentBackup.path, path.dirname(parentBackup.path), 'utf8');
      const parentData = JSON.parse(parentRaw);
      const parentDepth = (parentData._meta && parentData._meta.chainDepth) || 0;
      if (parentDepth >= 10) {
        logger.info('  Incremental chain depth limit reached; creating a new full backup');
      } else {
        const parentHashes = getParentHashes(parentData);

        const changedFiles = {};
        for (const [file, content] of Object.entries(translations)) {
          if (!parentHashes[file] || hashes[file] !== parentHashes[file]) {
            changedFiles[file] = content;
          }
        }
        filesToInclude = changedFiles;

        meta = {
          type: 'incremental',
          parent: parentBackup.name,
          chainDepth: parentDepth + 1,
          hashes: hashes
        };

        logger.info(`  Incremental mode: found ${Object.keys(filesToInclude).length} changed files (parent: ${parentBackup.name}, depth: ${meta.chainDepth})`);
      }
    } else {
      logger.info('  No previous backup found; creating full backup');
    }
  }

  const backupData = { _meta: meta };
  for (const [file, content] of Object.entries(filesToInclude)) {
    backupData[file] = content;
  }

  await fsp.writeFile(backupPath, JSON.stringify(backupData, null, 2));
  const stats = await fsp.stat(backupPath);

  logger.success('Backup created successfully');
  logger.info(`  Location: ${backupPath}`);
  logger.info(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
  logger.info(`  Timestamp: ${new Date().toLocaleString()}`);
  logger.info(`  Files included: ${Object.keys(filesToInclude).length}`);
  logger.info(`  Type: ${meta.type}`);

  await cleanupOldBackups(outputDir);
}

async function handleRestore(args) {
  const backupFile = args._[1];
  if (!backupFile) {
    throw new Error('Backup file path is required');
  }

  const backupPath = path.resolve(process.cwd(), backupFile);
  const outputDir = args.output
    ? path.resolve(process.cwd(), args.output)
    : path.join(process.cwd(), 'restored');

  if (!SecurityUtils.safeExistsSync(backupPath, process.cwd())) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  logger.info('\nRestoring backup...');

  try {
    const backupData = JSON.parse(await fsp.readFile(backupPath, 'utf8'));
    const isIncremental = backupData._meta && backupData._meta.type === 'incremental';

    if (isIncremental) {
      const chain = await buildRestoreChain(backupPath, backupData);
      await fsp.mkdir(outputDir, { recursive: true });

      const restoredFiles = new Set();
      for (const entry of chain) {
        for (const [file, content] of Object.entries(entry.data)) {
          if (restoreBackupEntry(outputDir, file, content)) {
            restoredFiles.add(file);
          }
        }
      }

      logger.success('Incremental backup restored successfully');
      logger.info(`  ${restoredFiles.size} files restored across ${chain.length} backup(s) to: ${outputDir}`);
    } else {
      await fsp.mkdir(outputDir, { recursive: true });

      let count = 0;
      for (const [file, content] of Object.entries(backupData)) {
        if (restoreBackupEntry(outputDir, file, content)) {
          count++;
        }
      }

      logger.success('Backup restored successfully');
      logger.info(`  Restored ${count} files to: ${outputDir}`);
    }
  } catch (error) {
    handleError(error);
  }
}

async function handleList() {
  try {
    // Ensure backup directory exists
    try {
      await fsp.access(backupDir);
    } catch (err) {
      if (err.code === 'ENOENT') {
        logger.warn('No backups found. The backup directory does not exist yet.');
      } else {
        logger.error(`Error accessing backup directory: ${err.message}`);
      }
      return;
    }

    const files = await fsp.readdir(backupDir);
    const backups = [];
    
    for (const file of files) {
      if (file.startsWith('backup-') && file.endsWith('.json')) {
        try {
          const filePath = path.join(backupDir, file);
        const stats = await fsp.stat(filePath);
          backups.push({
            name: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.mtime
          });
        } catch (err) {
          logger.warn(`Skipping invalid backup file ${file}: ${err.message}`);
        }
      }
    }
    
    if (backups.length === 0) {
      logger.warn('No valid backup files found in the backup directory.');
      return;
    }
    
    // Sort by creation time (newest first)
    backups.sort((a, b) => b.createdAt - a.createdAt);
    
    logger.info('\n📋 Available Backups');
    logger.info('='.repeat(50));
    
    backups.forEach((backup, index) => {
      const sizeKB = (backup.size / 1024).toFixed(2);
      const formattedDate = backup.createdAt.toLocaleString();
      
      logger.info(`🔹 ${index + 1}. ${backup.name}`);
      logger.info(`   📏 Size: ${sizeKB} KB`);
      logger.info(`   📅 Created: ${formattedDate}`);
      logger.info(`   📂 Path: ${backup.path}\n`);
    });
    
    logger.info(`Total backups: ${backups.length}`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      logger.warn('No backups found.');
    } else {
      throw err;
    }
  }
}

async function handleVerify(args) {
  const backupFile = args._[1];
  if (!backupFile) {
    throw new Error('Backup file path is required');
  }

  const backupPath = path.resolve(process.cwd(), backupFile);

  if (!SecurityUtils.safeExistsSync(backupPath, process.cwd())) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  logger.info('\nVerifying backup...');

  try {
    const data = JSON.parse(await fsp.readFile(backupPath, 'utf8'));

    if (data._meta && data._meta.hashes) {
      logger.info('  Performing hash chain verification...');

      const chain = await buildRestoreChain(backupPath, data);

      let allValid = true;

      // Rebuild full state oldest->newest and verify each manifest against it.
      const reconstructed = {};
      for (const entry of chain) {
        const entryMeta = entry.data._meta;
        const entryHashes = entryMeta ? entryMeta.hashes : null;
        const entryName = path.basename(entry.path);

        for (const [file, content] of Object.entries(entry.data)) {
          if (file !== '_meta') reconstructed[file] = content;
        }

        if (!entryHashes) {
          logger.warn(`  ${entryName}: no manifest hashes (legacy backup)`);
          continue;
        }

        let entryValid = true;
        for (const [file, expectedHash] of Object.entries(entryHashes)) {
          if (!Object.prototype.hasOwnProperty.call(reconstructed, file)) {
            logger.warn(`    Missing file in reconstructed backup state: ${file}`);
            entryValid = false;
            continue;
          }
          const computedHash = computeContentHash(reconstructed[file]);
          if (computedHash !== expectedHash) {
            logger.error(`    Hash mismatch: ${file} (expected ${expectedHash.slice(0, 12)}..., got ${computedHash.slice(0, 12)}...)`);
            entryValid = false;
          }
        }

        if (entryValid) {
          logger.success(`  ${entryName}: ${Object.keys(entryHashes).length} file(s) verified`);
        } else {
          allValid = false;
        }
      }

      if (allValid) {
        logger.success('\nBackup chain verification passed');
      } else {
        logger.error('\nBackup chain verification FAILED');
        process.exitCode = 1;
      }
    } else {
      const fileCount = Object.keys(data).filter(k => k !== '_meta').length;
      logger.success('Backup is valid');
      logger.info(`  Contains ${fileCount} translation files`);
      logger.info(`  Last modified: ${(await fsp.stat(backupPath)).mtime.toLocaleString()}`);
    }
  } catch (error) {
    logger.error('Backup verification failed!');
    logger.error(`  Error: ${error.message}`);
    process.exit(1);
  }
}

async function handleCleanup(args) {
  const keep = args.keep ? parseInt(args.keep, 10) : maxBackups;
  
  logger.info('\nCleaning up old backups...');
  
  try {
    const files = await fsp.readdir(backupDir);
    const backupFiles = files
      .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    // Keep only the most recent 'keep' files
    const toDelete = backupFiles.slice(keep);
    const kept = backupFiles.slice(0, keep);
    
    if (toDelete.length === 0) {
      logger.info('No old backups to delete.');
      return;
    }
    
    const protectedChainNames = collectProtectedChainNames(backupDir, kept);
    let deletedCount = 0;
    
    // Delete old backups, skipping parents of kept backups
    for (const file of toDelete) {
      if (protectedChainNames.has(file.name)) {
        logger.info(`  Keeping ${file.name} (parent of a kept incremental backup)`);
        continue;
      }
      try {
        await fsp.unlink(file.path);
        logger.info(`  - Deleted: ${file.name}`);
        deletedCount++;
      } catch (err) {
        logger.error(`  - Failed to delete ${file.name}: ${err.message}`);
      }
    }
    
    logger.info(`\nRemoved ${deletedCount} old backups`);
    logger.info(`Total backups kept: ${keep}`);
    
  } catch (error) {
    logger.error('Error cleaning up backups:');
    logger.error(`  ${error.message}`);
    logger.debug(error.stack || error.message);
    process.exit(1);
  }
}

// Start the application
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
main().catch(error => {
  logger.error('Unhandled error:');
  logger.error(error.stack || error.message);
  process.exit(1);
});
