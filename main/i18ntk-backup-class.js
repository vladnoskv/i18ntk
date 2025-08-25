#!/usr/bin/env node

'use strict';

const fs = require('fs/promises');
const path = require('path');
const { existsSync } = require('fs');
const configManager = require('../utils/config-manager');
const { logger } = require('../utils/logger');
const { colors } = require('../utils/logger');
const SecurityUtils = require('../utils/security');

/**
 * I18NTK BACKUP CLASS
 *
 * Class-based implementation of backup functionality for use with CommandRouter
 */
class I18nBackup {
    constructor(config = {}) {
        this.config = config;
        this.backupDir = path.join(process.cwd(), 'i18n-backups');
        this.maxBackups = config.backup?.maxBackups || 10;
    }

    /**
     * Main run method for the backup command
     */
    async run(options = {}) {
        const command = options.command || options._ && options._[0];

        // Show help if no command provided
        if (!command) {
            this.showHelp();
            return { success: true, command: 'help' };
        }

        try {
            switch (command) {
                case 'create':
                    return await this.handleCreate(options);
                case 'restore':
                    return await this.handleRestore(options);
                case 'list':
                    return await this.handleList();
                case 'verify':
                    return await this.handleVerify(options);
                case 'cleanup':
                    return await this.handleCleanup(options);
                default:
                    logger.error(`Unknown command: ${command}`);
                    this.showHelp();
                    return { success: false, error: `Unknown command: ${command}` };
            }
        } catch (error) {
            this.handleError(error);
            return { success: false, error: error.message };
        }
    }

    showHelp() {
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
    async handleCreate(options = {}) {
        // Use absolute path for the locales directory
        const dir = (options._ && options._[1]) || options.dir || path.join(__dirname, '..', 'locales');
        const outputDir = options.output || this.backupDir;
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
            return { success: true, message: 'No files to backup' };
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
        await this.cleanupOldBackups(outputDir);

        return {
            success: true,
            command: 'create',
            backupPath,
            size: stats.size,
            fileCount: files.length
        };
    }

    async handleRestore(options = {}) {
        const backupFile = options._ && options._[1];
        if (!backupFile) {
            throw new Error('Backup file path is required');
        }

        const backupPath = path.resolve(process.cwd(), backupFile);
        const outputDir = options.output
            ? path.resolve(process.cwd(), options.output)
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

            return {
                success: true,
                command: 'restore',
                outputDir,
                fileCount: Object.keys(translations).length
            };
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    async handleList() {
        try {
            // Ensure backup directory exists
            try {
                await fs.access(this.backupDir);
            } catch (err) {
                if (err.code === 'ENOENT') {
                    logger.warn('No backups found. The backup directory does not exist yet.');
                } else {
                    logger.error(`Error accessing backup directory: ${err.message}`);
                }
                return { success: true, backups: [] };
            }

            const files = await fs.readdir(this.backupDir);
            const backups = [];

            for (const file of files) {
                if (file.startsWith('backup-') && file.endsWith('.json')) {
                    try {
                        const filePath = path.join(this.backupDir, file);
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
                return { success: true, backups: [] };
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

            return { success: true, backups, count: backups.length };
        } catch (err) {
            if (err.code === 'ENOENT') {
                logger.warn('No backups found.');
                return { success: true, backups: [] };
            } else {
                throw err;
            }
        }
    }

    async handleVerify(options = {}) {
        const backupFile = options._ && options._[1];
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

                return {
                    success: true,
                    command: 'verify',
                    valid: true,
                    fileCount
                };
            } else {
                throw new Error('Invalid backup format');
            }
        } catch (error) {
            logger.error('Backup verification failed!');
            logger.error(`  Error: ${error.message}`);
            return {
                success: false,
                command: 'verify',
                valid: false,
                error: error.message
            };
        }
    }

    async handleCleanup(options = {}) {
        const keep = options.keep ? parseInt(options.keep, 10) : this.maxBackups;

        logger.info('\nCleaning up old backups...');

        try {
            const files = await fs.readdir(this.backupDir);
            const backupFiles = files
                .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(this.backupDir, file),
                    time: fs.statSync(path.join(this.backupDir, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);

            // Keep only the most recent 'keep' files
            const toDelete = backupFiles.slice(keep);

            if (toDelete.length === 0) {
                logger.info('No old backups to delete.');
                return { success: true, deleted: 0 };
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

            return {
                success: true,
                command: 'cleanup',
                deleted: toDelete.length,
                kept: keep
            };
        } catch (error) {
            logger.error('Error cleaning up backups:');
            logger.error(`  ${error.message}`);
            if (process.env.DEBUG) {
                console.error(error);
            }
            throw error;
        }
    }

    async cleanupOldBackups(outputDir) {
        try {
            const files = await fs.readdir(outputDir);
            const backupFiles = files
                .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(outputDir, file),
                    time: fs.statSync(path.join(outputDir, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);

            // Keep only the most recent files
            const toDelete = backupFiles.slice(this.maxBackups);

            for (const file of toDelete) {
                try {
                    await fs.unlink(file.path);
                } catch (err) {
                    // Ignore cleanup errors
                }
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    }

    handleError(error) {
        logger.error('Backup operation failed:');
        logger.error(`  ${error.message}`);
        if (process.env.DEBUG) {
            console.error(error);
        }
    }
}

module.exports = I18nBackup;