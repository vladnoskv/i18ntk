/**
 * Path Configuration Utility
 * Provides centralized, dynamic path resolution for the i18ntk toolkit
 * Optimized for npm package integration and cross-platform compatibility
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { getPackageRoot, resolveProjectPath, ensureDirectory } = require('./path-utils');

class PathConfig {
  constructor() {
    this.packageRoot = getPackageRoot();
    this.projectRoot = process.cwd();
    this.init();
  }

  init() {
    // Ensure all required directories exist
    this.ensurePackageDirectories();
  }

  /**
   * Get the package installation directory
   * @returns {string} Absolute path to package root
   */
  getPackageRoot() {
    return this.packageRoot;
  }

  /**
   * Get the current project directory
   * @returns {string} Absolute path to project root
   */
  getProjectRoot() {
    return this.projectRoot;
  }

  /**
   * Resolve a path relative to the package directory
   * @param {string} relativePath - Path relative to package root
   * @returns {string} Absolute path
   */
  resolvePackage(relativePath) {
    return path.resolve(this.packageRoot, relativePath);
  }

  /**
   * Resolve a path relative to the project directory
   * @param {string} relativePath - Path relative to project root
   * @returns {string} Absolute path
   */
  resolveProject(relativePath) {
    return path.resolve(this.projectRoot, relativePath);
  }

  /**
   * Get the settings directory (within package)
   * @returns {string} Absolute path to settings directory
   */
  getSettingsDir() {
    return this.resolvePackage('settings');
  }

  /**
   * Get the main configuration file path
   * @returns {string} Absolute path to i18ntk-config.json
   */
  getConfigPath() {
    return path.join(this.getSettingsDir(), 'i18ntk-config.json');
  }

  /**
   * Get the UI locales directory
   * @returns {string} Absolute path to UI locales
   */
  getUiLocalesDir() {
    return this.resolvePackage('ui-locales');
  }

  /**
   * Get the runtime directory
   * @returns {string} Absolute path to runtime files
   */
  getRuntimeDir() {
    return this.resolvePackage('runtime');
  }

  /**
   * Get the main scripts directory
   * @returns {string} Absolute path to main CLI scripts
   */
  getMainDir() {
    return this.resolvePackage('main');
  }

  /**
   * Get the utils directory
   * @returns {string} Absolute path to utilities
   */
  getUtilsDir() {
    return this.resolvePackage('utils');
  }

  /**
   * Get the scripts directory
   * @returns {string} Absolute path to scripts
   */
  getScriptsDir() {
    return this.resolvePackage('scripts');
  }

  /**
   * Get the backups directory (within package)
   * @returns {string} Absolute path to backups
   */
  getBackupsDir() {
    return this.resolvePackage('backups');
  }

  /**
   * Get the reports directory (within project)
   * @param {string} [subDir] - Optional subdirectory
   * @returns {string} Absolute path to reports directory
   */
  getReportsDir(subDir = null) {
    const reportsDir = this.resolveProject('i18ntk-reports');
    return subDir ? path.join(reportsDir, subDir) : reportsDir;
  }

  /**
   * Get the default locales directory (within project)
   * @returns {string} Absolute path to default locales directory
   */
  getDefaultLocalesDir() {
    return this.resolveProject('locales');
  }

  /**
   * Get the default source directory (within project)
   * @returns {string} Absolute path to default source directory
   */
  getDefaultSourceDir() {
    return this.resolveProject('src');
  }

  /**
   * Resolve a directory path based on configuration
   * @param {string} configPath - Path from configuration
   * @param {string} [defaultPath] - Default relative path
   * @param {boolean} [isProjectRelative] - Whether path should be relative to project
   * @returns {string} Absolute resolved path
   */
  resolveConfigPath(configPath, defaultPath = './locales', isProjectRelative = true) {
    if (!configPath) {
      configPath = defaultPath;
    }

    // If already absolute, return as-is
    if (path.isAbsolute(configPath)) {
      return configPath;
    }

    // Resolve relative to appropriate root
    const basePath = isProjectRelative ? this.projectRoot : this.packageRoot;
    return path.resolve(basePath, configPath);
  }

  /**
   * Ensure all required package directories exist
   */
  ensurePackageDirectories() {
    const dirs = [
      this.getSettingsDir(),
      this.getBackupsDir()
    ];

    dirs.forEach(dir => {
      ensureDirectory(dir);
    });
  }

  /**
   * Ensure all required project directories exist
   * @param {Object} [config] - Configuration object with directory paths
   */
  ensureProjectDirectories(config = {}) {
    const dirs = [
      this.resolveConfigPath(config.sourceDir, './locales'),
      this.resolveConfigPath(config.i18nDir, './locales'),
      this.getReportsDir()
    ];

    dirs.forEach(dir => {
      ensureDirectory(dir);
    });
  }

  /**
   * Get environment-specific path overrides
   * @returns {Object} Object with environment path overrides
   */
  getEnvironmentPaths() {
    return {
      runtimeDir: process.env.I18NTK_RUNTIME_DIR,
      i18nDir: process.env.I18NTK_I18N_DIR,
      sourceDir: process.env.I18NTK_SOURCE_DIR,
      projectRoot: process.env.I18NTK_PROJECT_ROOT,
      packageRoot: process.env.I18NTK_PACKAGE_ROOT
    };
  }

  /**
   * Check if a path is within the project directory
   * @param {string} targetPath - Path to check
   * @returns {boolean} True if path is within project
   */
  isWithinProject(targetPath) {
    const relative = path.relative(this.projectRoot, targetPath);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  /**
   * Check if a path is within the package directory
   * @param {string} targetPath - Path to check
   * @returns {boolean} True if path is within package
   */
  isWithinPackage(targetPath) {
    const relative = path.relative(this.packageRoot, targetPath);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  /**
   * Convert a path to be relative to the project root
   * @param {string} absolutePath - Absolute path to convert
   * @returns {string} Relative path
   */
  toProjectRelative(absolutePath) {
    return path.relative(this.projectRoot, absolutePath);
  }

  /**
   * Convert a path to be relative to the package root
   * @param {string} absolutePath - Absolute path to convert
   * @returns {string} Relative path
   */
  toPackageRelative(absolutePath) {
    return path.relative(this.packageRoot, absolutePath);
  }
}

// Create singleton instance
const pathConfig = new PathConfig();

module.exports = {
  PathConfig,
  pathConfig,
  // Export convenience methods
  getPackageRoot: () => pathConfig.getPackageRoot(),
  getProjectRoot: () => pathConfig.getProjectRoot(),
  resolvePackage: (relativePath) => pathConfig.resolvePackage(relativePath),
  resolveProject: (relativePath) => pathConfig.resolveProject(relativePath),
  getSettingsDir: () => pathConfig.getSettingsDir(),
  getConfigPath: () => pathConfig.getConfigPath(),
  getUiLocalesDir: () => pathConfig.getUiLocalesDir(),
  getReportsDir: (subDir) => pathConfig.getReportsDir(subDir),
  getDefaultLocalesDir: () => pathConfig.getDefaultLocalesDir(),
  resolveConfigPath: (configPath, defaultPath, isProjectRelative) => 
    pathConfig.resolveConfigPath(configPath, defaultPath, isProjectRelative)
};