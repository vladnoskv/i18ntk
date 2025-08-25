/**
 * File Management Service
 * Handles file operations, globbing, and cleanup operations
 * @module services/FileManagementService
 */

const path = require('path');
const fs = require('fs');
const SecurityUtils = require('../../../utils/security');

module.exports = class FileManagementService {
  constructor(config = {}) {
    this.config = config;
    this.settings = null;
    this.configManager = null;
  }

  /**
   * Initialize the service with required dependencies
   * @param {Object} configManager - Configuration manager instance
   */
  initialize(configManager) {
    this.configManager = configManager;
    this.settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
  }

  /**
   * Custom glob implementation using Node.js built-in modules (zero dependencies)
   * @param {string[]} patterns - Array of glob patterns
   * @param {Object} options - Options object with cwd and ignore properties
   * @returns {Promise<string[]>} Array of matching file paths
   */
  async customGlob(patterns, options = {}) {
    const cwd = options.cwd || process.cwd();
    const ignorePatterns = options.ignore || [];

    function matchesPattern(filename, pattern) {
      // Simple pattern matching for **/*.{js,jsx,ts,tsx} style patterns
      if (pattern.includes('**/*')) {
        const extensionPart = pattern.split('*.')[1];
        if (extensionPart) {
          const extensions = extensionPart.replace('{', '').replace('}', '').split(',');
          return extensions.some(ext => filename.endsWith('.' + ext.trim()));
        }
      }
      return filename.includes(pattern.replace('**/', ''));
    }

    function shouldIgnore(filePath) {
      return ignorePatterns.some(pattern => {
        if (pattern.includes('**/')) {
          const patternEnd = pattern.replace('**/', '');
          return filePath.includes('/' + patternEnd) || filePath.includes('\\' + patternEnd);
        }
        return filePath.includes(pattern);
      });
    }

    function findFiles(dir, results = []) {
      try {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          const relativePath = path.relative(cwd, fullPath);

          if (shouldIgnore(relativePath)) {
            continue;
          }

          try {
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
              findFiles(fullPath, results);
            } else if (stat.isFile()) {
              // Check if file matches any of our patterns
              for (const pattern of patterns) {
                if (matchesPattern(item, pattern)) {
                  results.push(relativePath);
                  break;
                }
              }
            }
          } catch (error) {
            // Skip files we can't access
            continue;
          }
        }
      } catch (error) {
        // Skip directories we can't access
      }

      return results;
    }

    return findFiles(cwd);
  }

  /**
   * Enhanced delete reports and logs functionality
   * @param {Object} prompt - Prompt interface for user interaction
   * @param {Object} ui - UI instance for translations (optional)
   * @returns {Promise<void>}
   */
  async deleteReports(prompt, ui = null) {
    // Check for PIN protection
    const authRequired = await this.isAuthRequiredForScript('deleteReports');
    if (authRequired) {
      console.log(`\n${ui ? ui.t('adminPin.protectedAccess') : 'Protected Access'}`);
      const cliHelper = require('../../../utils/cli-helper');
      const pin = await cliHelper.promptPin((ui ? ui.t('adminPin.enterPin') : 'Enter PIN: ') + ': ');
      const isValid = await this.verifyPin(pin);
      if (!isValid) {
        console.log(ui ? ui.t('adminPin.invalidPin') : 'Invalid PIN');
        await prompt(ui ? ui.t('menu.pressEnterToContinue') : 'Press Enter to continue...');
        return;
      }
      console.log(ui ? ui.t('adminPin.accessGranted') : 'Access granted');
    }

    console.log(`\n${ui ? ui.t('operations.deleteReportsTitle') : 'Delete Reports and Logs'}`);
    console.log('============================================================');

    const targetDirs = [
      { path: path.join(process.cwd(), 'i18ntk-reports'), name: 'Reports', type: 'reports' },
      { path: path.join(process.cwd(), 'reports'), name: 'Legacy Reports', type: 'reports' },
      { path: path.join(process.cwd(), 'reports', 'backups'), name: 'Reports Backups', type: 'backups' },
      { path: path.join(process.cwd(), 'scripts', 'debug', 'logs'), name: 'Debug Logs', type: 'logs' },
      { path: path.join(process.cwd(), 'scripts', 'debug', 'reports'), name: 'Debug Reports', type: 'reports' },
      { path: path.join(process.cwd(), 'settings', 'backups'), name: 'Settings Backups', type: 'backups' },
      { path: path.join(process.cwd(), 'utils', 'i18ntk-reports'), name: 'Utils Reports', type: 'reports' }
    ].filter(dir => dir.path && typeof dir.path === 'string');

    try {
      console.log(ui ? ui.t('operations.scanningForFiles') : 'Scanning for files...');

      let availableDirs = [];

      // Check which directories exist and have files
      for (const dir of targetDirs) {
        if (SecurityUtils.safeExistsSync(dir.path)) {
          const files = this.getAllReportFiles(dir.path);
          if (files.length > 0) {
            availableDirs.push({
              ...dir,
              files: files.map(file => ({ path: file, dir: dir.path })),
              count: files.length
            });
          }
        }
      }

      if (availableDirs.length === 0) {
        console.log(ui ? ui.t('operations.noFilesFoundToDelete') : 'No files found to delete');
        await prompt(ui ? ui.t('menu.pressEnterToContinue') : 'Press Enter to continue...');
        return;
      }

      // Show available directories
      console.log(ui ? ui.t('operations.availableDirectories') : 'Available directories:');
      availableDirs.forEach((dir, index) => {
        console.log(`  ${index + 1}. ${dir.name} (${dir.count} files)`);
      });
      console.log(`  ${availableDirs.length + 1}. ${ui ? ui.t('operations.allDirectories') : 'All directories'}`);
      console.log(`  0. ${ui ? ui.t('operations.cancelOption') : 'Cancel'}`);

      const dirChoice = await prompt(`\nSelect directory to clean (0-${availableDirs.length + 1}): `);
      const dirIndex = parseInt(dirChoice) - 1;

      let selectedDirs = [];

      if (dirChoice.trim() === '0') {
        console.log(ui ? ui.t('operations.cancelled') : 'Cancelled');
        await prompt(ui ? ui.t('menu.pressEnterToContinue') : 'Press Enter to continue...');
        return;
      } else if (dirIndex === availableDirs.length) {
        selectedDirs = availableDirs;
      } else if (dirIndex >= 0 && dirIndex < availableDirs.length) {
        selectedDirs = [availableDirs[dirIndex]];
      } else {
        console.log(ui ? ui.t('operations.invalidSelection') : 'Invalid selection');
        await prompt(ui ? ui.t('menu.pressEnterToContinue') : 'Press Enter to continue...');
        return;
      }

      // Collect all files from selected directories
      let allFiles = [];
      selectedDirs.forEach(dir => {
        allFiles.push(...dir.files);
      });

      console.log(ui ? ui.t('operations.foundFilesInSelectedDirectories', { count: allFiles.length }) : `Found ${allFiles.length} files in selected directories`);
      selectedDirs.forEach(dir => {
        console.log(`  📁 ${dir.name}: ${dir.count} files`);
      });

      // Show deletion options
      console.log(ui ? ui.t('operations.deletionOptions') : 'Deletion options:');
      console.log(`  1. ${ui ? ui.t('operations.deleteAllFiles') : 'Delete all files'}`);
      console.log(`  2. ${ui ? ui.t('operations.keepLast3Files') : 'Keep last 3 files'}`);
      console.log(`  3. ${ui ? ui.t('operations.keepLast5Files') : 'Keep last 5 files'}`);
      console.log(`  0. ${ui ? ui.t('operations.cancelReportOption') : 'Cancel'}`);

      const option = await prompt('\nSelect option (0-3): ');

      let filesToDelete = [];

      switch (option.trim()) {
        case '1':
          filesToDelete = allFiles;
          break;
        case '2':
          filesToDelete = this.getFilesToDeleteKeepLast(allFiles, 3);
          break;
        case '3':
          filesToDelete = this.getFilesToDeleteKeepLast(allFiles, 5);
          break;
        case '0':
          console.log(ui ? ui.t('operations.cancelled') : 'Cancelled');
          await prompt(ui ? ui.t('menu.pressEnterToContinue') : 'Press Enter to continue...');
          return;
        default:
          console.log(ui ? ui.t('menu.invalidOption') : 'Invalid option');
          await prompt(ui ? ui.t('menu.pressEnterToContinue') : 'Press Enter to continue...');
          return;
      }

      if (filesToDelete.length === 0) {
        console.log(ui ? ui.t('operations.noFilesToDelete') : 'No files to delete');
        await prompt(ui ? ui.t('menu.pressEnterToContinue') : 'Press Enter to continue...');
        return;
      }

      console.log(ui ? ui.t('operations.filesToDeleteCount', { count: filesToDelete.length }) : `Files to delete: ${filesToDelete.length}`);
      console.log(ui ? ui.t('operations.filesToKeepCount', { count: allFiles.length - filesToDelete.length }) : `Files to keep: ${allFiles.length - filesToDelete.length}`);

      const confirm = await prompt(ui ? ui.t('operations.confirmDeletion') : 'Are you sure you want to delete these files? (y/N): ');

      if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
        let deletedCount = 0;

        for (const fileInfo of filesToDelete) {
          try {
            fs.unlinkSync(fileInfo.path);
            console.log(ui ? ui.t('operations.deletedFile', { filename: path.basename(fileInfo.path) }) : `Deleted: ${path.basename(fileInfo.path)}`);
            deletedCount++;
          } catch (error) {
            console.log(ui ? ui.t('operations.failedToDeleteFile', { filename: path.basename(fileInfo.path), error: error.message }) : `Failed to delete ${path.basename(fileInfo.path)}: ${error.message}`);
          }
        }

        console.log(`\n🎉 Successfully deleted ${deletedCount} files!`);
      } else {
        console.log(ui ? ui.t('operations.cancelled') : 'Cancelled');
      }

    } catch (error) {
      console.error(`❌ Error during deletion process: ${error.message}`);
    }

    await prompt(ui ? ui.t('menu.pressEnterToContinue') : 'Press Enter to continue...');
  }

  /**
   * Helper method to get all report and log files recursively
   * @param {string} dir - Directory to scan
   * @returns {string[]} Array of file paths
   */
  getAllReportFiles(dir) {
    if (!dir || typeof dir !== 'string') {
      return [];
    }

    let files = [];

    try {
      if (!SecurityUtils.safeExistsSync(dir)) {
        return [];
      }

      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);

        try {
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            files.push(...this.getAllReportFiles(fullPath));
          } else if (
            // Common report file extensions
            item.endsWith('.json') ||
            item.endsWith('.html') ||
            item.endsWith('.txt') ||
            item.endsWith('.log') ||
            item.endsWith('.csv') ||
            item.endsWith('.md') ||
            // Specific report filename patterns
            item.includes('-report.') ||
            item.includes('_report.') ||
            item.includes('report-') ||
            item.includes('report_') ||
            item.includes('analysis-') ||
            item.includes('validation-')
          ) {
            files.push(fullPath);
          }
        } catch (error) {
          // Skip individual files that can't be accessed
          continue;
        }
      }
    } catch (error) {
      // Silent fail for inaccessible directories
      console.log(`⚠️ Could not access directory: ${dir}`);
    }

    return files;
  }

  /**
   * Helper method to determine which files to delete when keeping last N files
   * @param {Array} allFiles - Array of file objects with path property
   * @param {number} keepCount - Number of files to keep
   * @returns {Array} Array of files to delete
   */
  getFilesToDeleteKeepLast(allFiles, keepCount = 3) {
    // Sort files by modification time (newest first)
    const sortedFiles = allFiles.sort((a, b) => {
      try {
        const statA = fs.statSync(a.path || a);
        const statB = fs.statSync(b.path || b);
        return statB.mtime.getTime() - statA.mtime.getTime();
      } catch (error) {
        // If stat fails, sort by filename as fallback
        const pathA = a.path || a;
        const pathB = b.path || b;
        return pathB.localeCompare(pathA);
      }
    });

    // Keep the N newest files, delete the rest
    return sortedFiles.slice(keepCount);
  }

  /**
   * Check if authentication is required for a script
   * @param {string} scriptName - Name of the script
   * @returns {Promise<boolean>} True if authentication is required
   */
  async isAuthRequiredForScript(scriptName) {
    // This would need to be implemented based on the authentication service
    // For now, return false as a placeholder
    return false;
  }

  /**
   * Verify PIN for authentication
   * @param {string} pin - PIN to verify
   * @returns {Promise<boolean>} True if PIN is valid
   */
  async verifyPin(pin) {
    // This would need to be implemented based on the authentication service
    // For now, return true as a placeholder
    return true;
  }
};