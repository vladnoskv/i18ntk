#!/usr/bin/env node

/**
 * Update Checker Script
 * 
 * Checks for available updates and notifies users
 * 
 * Usage:
 *   node scripts/update-checker.js
 *   node scripts/update-checker.js --silent
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class UpdateChecker {
  constructor() {
    this.packagePath = path.join(__dirname, '..', 'package.json');
    this.registryUrl = 'https://registry.npmjs.org/i18ntk';
    this.cacheFile = path.join(__dirname, '..', 'settings', '.update-cache.json');
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Get current version from package.json
   */
  getCurrentVersion() {
    try {
      const packageData = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
      return packageData.version;
    } catch (error) {
      console.error('Error reading package.json:', error.message);
      return null;
    }
  }

  /**
   * Check if cache is valid
   */
  isCacheValid() {
    try {
      if (!fs.existsSync(this.cacheFile)) {
        return false;
      }
      
      const cacheData = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      const now = Date.now();
      return (now - cacheData.timestamp) < this.cacheTTL;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cached version info
   */
  getCachedVersion() {
    try {
      const cacheData = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      return cacheData;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save version info to cache
   */
  saveToCache(versionInfo) {
    try {
      const cacheDir = path.dirname(this.cacheFile);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      
      const cacheData = {
        ...versionInfo,
        timestamp: Date.now()
      };
      
      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      // Silently fail on cache write errors
    }
  }

  /**
   * Fetch latest version from npm registry
   */
  async fetchLatestVersion() {
    return new Promise((resolve) => {
      https.get(this.registryUrl, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const packageData = JSON.parse(data);
            const latestVersion = packageData['dist-tags'].latest;
            
            resolve({
              latest: latestVersion,
              current: this.getCurrentVersion(),
              hasUpdate: this.hasUpdate(this.getCurrentVersion(), latestVersion),
              updateCommand: `npm install -g i18ntk@${latestVersion}`
            });
          } catch (error) {
            resolve(null);
          }
        });
      }).on('error', () => {
        resolve(null);
      });
    });
  }

  /**
   * Check if there's an update available
   */
  hasUpdate(current, latest) {
    if (!current || !latest) return false;
    
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;
      
      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }
    
    return false;
  }

  /**
   * Format version for display
   */
  formatVersion(version) {
    return `v${version}`;
  }

  /**
   * Check for updates
   */
  async checkForUpdates(options = {}) {
    const { silent = false } = options;
    
    const currentVersion = this.getCurrentVersion();
    if (!currentVersion) {
      if (!silent) console.error('❌ Unable to determine current version');
      return null;
    }

    // Check cache first
    if (this.isCacheValid()) {
      const cached = this.getCachedVersion();
      if (cached && cached.hasUpdate) {
        if (!silent) {
          console.log(`🚀 Update available! ${this.formatVersion(currentVersion)} → ${this.formatVersion(cached.latest)}`);
          console.log(`   Run: ${cached.updateCommand}`);
        }
        return cached;
      }
      return null;
    }

    // Fetch from registry
    const versionInfo = await this.fetchLatestVersion();
    if (versionInfo) {
      this.saveToCache(versionInfo);
      
      if (versionInfo.hasUpdate) {
        if (!silent) {
          console.log(`🚀 Update available! ${this.formatVersion(currentVersion)} → ${this.formatVersion(versionInfo.latest)}`);
          console.log(`   Run: ${versionInfo.updateCommand}`);
        }
        return versionInfo;
      } else if (!silent) {
        console.log(`✅ You're up to date! ${this.formatVersion(currentVersion)}`);
      }
    } else if (!silent) {
      console.log('⚠️  Unable to check for updates (network issue)');
    }
    
    return null;
  }

  /**
   * Get update notice for integration
   */
  async getUpdateNotice() {
    const update = await this.checkForUpdates({ silent: true });
    if (update && update.hasUpdate) {
      return {
        hasUpdate: true,
        current: update.current,
        latest: update.latest,
        command: update.updateCommand,
        message: `🚀 i18ntk update available: ${update.current} → ${update.latest}`
      };
    }
    return null;
  }
}

// CLI Handler
async function main() {
  const checker = new UpdateChecker();
  const args = process.argv.slice(2);
  const silent = args.includes('--silent');
  
  await checker.checkForUpdates({ silent });
}

if (require.main === module) {
  main();
}

module.exports = UpdateChecker;