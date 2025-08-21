#!/usr/bin/env node

const path = require('path');
const SecurityUtils = require('../utils/security');
// main/i18ntk-backup.js

 const fs = require('fs/promises');
 const { constants: fsConstants } = require('fs');
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
const cliHelper = require('../utils/cli-helper');

// Backup configuration
const config = configManager.getConfig();
const backupDir = path.join(process.cwd(), 'i18ntk-backup');
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

function handleError(error) {
  logger.error('❌ Unhandled error:');
  logger.error(error.stack || error.message);
  
  if (process.env.DEBUG) {
    console.error(error);
  }
  
  process.exit(1);
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
    await SecurityUtils.safeMkdir(outputDir, process.cwd(), { recursive: true });
    logger.debug(`Created backup directory: ${outputDir}`);
  } catch (err) {
    if (err.code !== 'EEXIST') {
    await SecurityUtils.safeMkdir(outputDir, { recursive: true }, process.cwd());
      throw err;
    }
    logger.debug(`Using existing backup directory: ${outputDir}`);
  }

  // Validate directory with path traversal protection
  const sourceDir = SecurityUtils.safeValidatePath(path.resolve(dir));
  if (!sourceDir) {
    throw new Error(`Invalid directory path: ${dir}`);
  }
  
  try {
    const stats = await SecurityUtils.safeStat(sourceDir);
    if (!stats || !stats.isDirectory()) {
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
  
  // Read all files in the directory with path validation
  const validatedSourceDir = SecurityUtils.validatePath(sourceDir);
  if (!validatedSourceDir) {
    throw new Error(`Invalid source directory path: ${sourceDir}`);
  }
  
  // Additional security check to prevent path traversal
  const resolvedSource = path.resolve(validatedSourceDir);
  const resolvedCwd = path.resolve(process.cwd());
  if (!resolvedSource.startsWith(resolvedCwd)) {
    throw new Error(`Source directory must be within the current working directory: ${sourceDir}`);
  }
  
  const files = (await SecurityUtils.safeReaddir(validatedSourceDir, { withFileTypes: true }))
    .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
    .map(dirent => dirent.name);
    
  if (files.length === 0) {
    logger.warn('No JSON files found in the specified directory');
    process.exit(0);
  }
  
  // Read all translation files with path validation
  const translations = {};
  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    const validatedFilePath = SecurityUtils.validatePath(filePath, sourceDir);
    if (!validatedFilePath) {
      logger.warn(`Skipping invalid file path: ${file}`);
      continue;
    }
    
    try {
      const content = JSON.parse(await SecurityUtils.safeReadFile(validatedFilePath, sourceDir, 'utf8'));
      translations[file] = content;
    } catch (error) {
      logger.error(`Could not read file ${file}: ${error.message}`);
    }
  }
  
  // Create the backup with path validation
  const validatedBackupPath = SecurityUtils.validatePath(backupPath);
  if (!validatedBackupPath) {
    throw new Error(`Invalid backup path: ${backupPath}`);
  }
  
  await SecurityUtils.safeWriteFile(validatedBackupPath, JSON.stringify(translations, null, 2), outputDir);
  const stats = await SecurityUtils.safeStat(backupPath);
  
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

  const backupPath = SecurityUtils.safeValidatePath(path.resolve(process.cwd(), backupFile));
  if (!backupPath) {
    throw new Error(`Invalid backup file path: ${backupFile}`);
  }
  
  const outputDir = SecurityUtils.safeValidatePath(
    args.output 
      ? path.resolve(process.cwd(), args.output) 
      : path.join(process.cwd(), 'restored')
  );
  if (!outputDir) {
    throw new Error(`Invalid output directory path: ${args.output || 'restored'}`);
  }
  
  // Validate backup file
// add at the top of main/i18ntk-backup.js
const { getI18n } = require('../utils/i18n');

    if (!await SecurityUtils.safeExistsSecure(backupPath, process.cwd())) {
      const i18n = getI18n();
      throw new Error(i18n.t('backup.backupNotFound', { path: backupPath }));
    }
  
  logger.info('\nRestoring backup...');
  
  try {
    // Read the backup file with security validation
    const backupData = await SecurityUtils.safeReadFile(backupPath, 'utf8');
    const translations = JSON.parse(backupData);
    
    // Create output directory if it doesn't exist
    try {
      await SecurityUtils.safeMkdir(outputDir, { recursive: true }, process.cwd());
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    // Write the restored files with path validation
    for (const [file, content] of Object.entries(translations)) {
      const filePath = path.join(outputDir, file);
      const validatedFilePath = SecurityUtils.validatePath(filePath, outputDir);
      if (!validatedFilePath) {
        logger.warn(`Skipping invalid file path: ${file}`);
        continue;
      }
      await SecurityUtils.safeWriteFile(validatedFilePath, JSON.stringify(content, null, 2), outputDir);
    }
    
    logger.success('Backup restored successfully');
    logger.info(`  Restored ${Object.keys(translations).length} files to: ${outputDir}`);
  } catch (error) {
    handleError(error);
  }
}

async function handleList() {
  try {
    // Ensure backup directory exists with path validation
    const validatedBackupDir = SecurityUtils.validatePath(backupDir);
    if (!validatedBackupDir) {
      logger.warn('No backups found. The backup directory path is invalid.');
      return;
    }
    
    try {
      await SecurityUtils.safeAccess(validatedBackupDir, fsConstants.F_OK);
    } catch (err) {
      if (err.code === 'ENOENT') {
        logger.warn('No backups found. The backup directory does not exist yet.');
        
        try {
          // Prompt user to create backup directory
          const createDir = await cliHelper.confirm('Would you like to create a backup directory now?', true);
          
          if (createDir) {
            // Prompt for custom directory or use default
            const customDir = await cliHelper.prompt('Enter backup directory path (leave empty for default: i18ntk-backup): ');
            const dirToCreate = customDir.trim() || backupDir;
            const validatedCustomDir = SecurityUtils.validatePath(dirToCreate);
            
            if (!validatedCustomDir) {
              logger.error('Invalid directory path provided.');
              return;
            }
            
            try {
              await SecurityUtils.safeMkdir(validatedCustomDir, { recursive: true }, process.cwd());
              logger.success(`Backup directory created: ${validatedCustomDir}`);
              
              // Update config if different from default
              if (validatedCustomDir !== backupDir) {
                const updateConfig = await cliHelper.confirm('Would you like to save this as your default backup directory?', true);
                
                if (updateConfig) {
                  const currentConfig = configManager.getConfig();
                  const newConfig = {
                    ...currentConfig,
                    backup: {
                      ...currentConfig.backup,
                      directory: validatedCustomDir
                    }
                  };
                  await configManager.saveConfig(newConfig);
                  logger.success('Configuration updated with new backup directory.');
                }
              }
              
              logger.info('You can now use "i18ntk-backup create" to create your first backup.');
              process.exit(0);
            } catch (mkdirError) {
              logger.error(`Failed to create backup directory: ${mkdirError.message}`);
              process.exit(1);
            }
          }
          process.exit(0);
        } catch (promptError) {
          logger.error(`Error during prompt: ${promptError.message}`);
          process.exit(1);
        }
        return;
      } else {
        logger.error(`Error accessing backup directory: ${err.message}`);
      }
      return;
    }

    const files = await SecurityUtils.safeReaddirSecure(validatedBackupDir);
    const backups = [];
    
    for (const file of files) {
      if (file.startsWith('backup-') && file.endsWith('.json')) {
        try {
          const filePath = path.join(validatedBackupDir, file);
          const validatedFilePath = SecurityUtils.validatePath(filePath, validatedBackupDir);
          if (!validatedFilePath) {
            logger.warn(`Skipping invalid backup file path: ${file}`);
            continue;
          }
          
          const stats = await SecurityUtils.safeStatSecure(validatedFilePath);
          backups.push({
            name: file,
            path: validatedFilePath,
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
  const validatedBackupPath = SecurityUtils.safeValidatePath(backupPath);
  if (!validatedBackupPath) {
    throw new Error(`Invalid backup file path: ${backupPath}`);
  }
  
  // Validate backup file
  if (!SecurityUtils.safeExistsSync(validatedBackupPath, process.cwd())) {
    throw new Error(`Backup file not found: ${validatedBackupPath}`);
  }
  
  logger.info('\nVerifying backup...');
  
  try {
    const data = SecurityUtils.safeReadFile(validatedBackupPath, 'utf8');
    const content = JSON.parse(data);
    
    if (typeof content === 'object' && content !== null) {
      const fileCount = Object.keys(content).length;
      logger.success('Backup is valid');
      logger.info(`  Contains ${fileCount} translation files`);
      const stats = await SecurityUtils.safeStat(backupPath);
      logger.info(`  Last modified: ${stats ? stats.mtime.toLocaleString() : 'unknown'}`);
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
    const validatedBackupDir = SecurityUtils.validatePath(backupDir);
    if (!validatedBackupDir) {
      logger.warn('Invalid backup directory path.');
      return;
    }

    const files = await SecurityUtils.safeReaddir(validatedBackupDir);
    const backupFiles = files
      .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(validatedBackupDir, file);
        const validatedFilePath = SecurityUtils.validatePath(filePath, validatedBackupDir);
        if (!validatedFilePath) return null;

        return {
          name: file,
          path: validatedFilePath,
          time: SecurityUtils.safeStatSync(validatedFilePath)?.mtime.getTime()
        };
      })
      .filter(file => file !== null)
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
        const success = SecurityUtils.safeDeleteSync(file.path);
        if (success) {
          logger.info(`  - Deleted: ${file.name}`);
        } else {
          logger.error(`  - Failed to delete ${file.name}: Permission denied or file not found`);
        }
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

// Helper function to clean up old backups when creating new ones
async function cleanupOldBackups(outputDir) {
  try {
    const validatedOutputDir = SecurityUtils.validatePath(outputDir);
    if (!validatedOutputDir) {
      logger.warn('Invalid output directory path for cleanup.');
      return;
    }

    const files = await SecurityUtils.safeReaddir(validatedOutputDir);
    const backupFiles = files
      .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(validatedOutputDir, file);
        const validatedFilePath = SecurityUtils.validatePath(filePath, validatedOutputDir);
        if (!validatedFilePath) return null;

        return {
          name: file,
          path: validatedFilePath,
          time: SecurityUtils.safeStatSync(validatedFilePath)?.mtime.getTime()
        };
      })
      .filter(file => file !== null)
      .sort((a, b) => b.time - a.time);

    // Keep only the most recent maxBackups files
    const toDelete = backupFiles.slice(maxBackups);

    if (toDelete.length === 0) {
      logger.debug('No old backups to delete during cleanup.');
      return;
    }

    // Delete old backups silently
    for (const file of toDelete) {
      try {
        const success = SecurityUtils.safeDeleteSync(file.path);
        if (success) {
          logger.debug(`  - Deleted old backup: ${file.name}`);
        } else {
          logger.debug(`  - Failed to delete old backup ${file.name}: Permission denied or file not found`);
        }
      } catch (err) {
        logger.debug(`  - Failed to delete old backup ${file.name}: ${err.message}`);
      }
    }

    logger.debug(`Cleaned up ${toDelete.length} old backups`);
  } catch (error) {
    logger.debug(`Error during automatic cleanup: ${error.message}`);
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
