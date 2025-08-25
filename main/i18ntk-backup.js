#!/usr/bin/env node

'use strict';

const fs = require('fs/promises');
const path = require('path');

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
const { existsSync } = require('fs');
const configManager = require('../utils/config-manager');
const { logger } = require('../utils/logger');
const { colors } = require('../utils/logger');
const prompt = require('../utils/prompt');

// Backup configuration
const config = configManager.getConfig();
const backupDir = path.join(process.cwd(), 'i18n-backups');
const maxBackups = config.backup?.maxBackups || 10;

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
`);
}

// Command handlers
async function handleCreate(args) {
  // Use absolute path for the locales directory
  const dir = args._[1] || path.join(__dirname, '..', 'locales');
  const outputDir = args.output || backupDir;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `backup-${timestamp}.json`;
  const backupPath = path.join(outputDir, backupName);

  // Log the paths for debugging
  logger.debug(`Source directory: ${dir}`);
  logger.debug(`Backup will be saved to: ${backupPath}`);

  // Create backup directory if it doesn't exist
  try {
    await fs.mkdir(outputDir, { recursive: true });
    logger.debug(`Created backup directory: ${outputDir}`);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      logger.error(`Failed to create backup directory: ${err.message}`);
      throw err;
    }
    logger.debug(`Using existing backup directory: ${outputDir}`);
  }

  // Validate directory
  const sourceDir = path.resolve(dir);
  try {
    const stats = await fs.stat(sourceDir);
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
  
  // Read all files in the directory
  const files = (await fs.readdir(sourceDir, { withFileTypes: true }))
    .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
    .map(dirent => dirent.name);
    
  if (files.length === 0) {
    logger.warn('No JSON files found in the specified directory');
    process.exit(0);
  }
  
  // Read all translation files
  const translations = {};
  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    try {
      const content = JSON.parse(await fs.readFile(filePath, 'utf8'));
      translations[file] = content;
    } catch (error) {
      logger.error(`Could not read file ${file}: ${error.message}`);
    }
  }
  
  // Create the backup
  await fs.writeFile(backupPath, JSON.stringify(translations, null, 2));
  const stats = await fs.stat(backupPath);
  
  logger.success('Backup created successfully');
  logger.info(`  Location: ${backupPath}`);
  logger.info(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
  logger.info(`  Timestamp: ${new Date().toLocaleString()}`);
  
  // Clean up old backups
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
  
  // Validate backup file
  if (!SecurityUtils.safeExistsSync(backupPath, process.cwd())) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  
  logger.info('\nRestoring backup...');
  
  try {
    // Read the backup file
    const backupData = await fs.readFile(backupPath, 'utf8');
    const translations = JSON.parse(backupData);
    
    // Create output directory if it doesn't exist
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    // Write the restored files
    for (const [file, content] of Object.entries(translations)) {
      const filePath = path.join(outputDir, file);
      await fs.writeFile(filePath, JSON.stringify(content, null, 2));
    }
    
    logger.success('Backup restored successfully');
    logger.info(`  Restored ${Object.keys(translations).length} files to: ${outputDir}`);
  } catch (error) {
    handleError(error);
  }
}

async function handleList() {
  try {
    // Ensure backup directory exists
    try {
      await fs.access(backupDir);
    } catch (err) {
      if (err.code === 'ENOENT') {
        logger.warn('No backups found. The backup directory does not exist yet.');
      } else {
        logger.error(`Error accessing backup directory: ${err.message}`);
      }
      return;
    }

    const files = await fs.readdir(backupDir);
    const backups = [];
    
    for (const file of files) {
      if (file.startsWith('backup-') && file.endsWith('.json')) {
        try {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
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
  
  // Validate backup file
  if (!SecurityUtils.safeExistsSync(backupPath, process.cwd())) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  
  logger.info('\nVerifying backup...');
  
  try {
    const data = await fs.readFile(backupPath, 'utf8');
    const content = JSON.parse(data);
    
    if (typeof content === 'object' && content !== null) {
      const fileCount = Object.keys(content).length;
      logger.success('Backup is valid');
      logger.info(`  Contains ${fileCount} translation files`);
      logger.info(`  Last modified: ${(await fs.stat(backupPath)).mtime.toLocaleString()}`);
    } else {
      throw new Error('Invalid backup format');
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
    const files = await fs.readdir(backupDir);
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
    
    if (toDelete.length === 0) {
      logger.info('No old backups to delete.');
      return;
    }
    
    // Delete old backups
    for (const file of toDelete) {
      try {
        await fs.unlink(file.path);
        logger.info(`  - Deleted: ${file.name}`);
      } catch (err) {
        logger.error(`  - Failed to delete ${file.name}: ${err.message}`);
      }
    }
    
    logger.info(`\nRemoved ${toDelete.length} old backups`);
    logger.info(`Total backups kept: ${keep}`);
    
  } catch (error) {
    logger.error('Error cleaning up backups:');
    logger.error(`  ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error);
    }
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
