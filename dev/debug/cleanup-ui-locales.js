#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * UI Locales Cleanup for v1.6.0
 * Removes extra keys and ensures exact structure matching with English
 */
class UILocalesCleanup {
    constructor() {
        this.uiLocalesDir = path.join(__dirname, '..', '..', 'ui-locales');
        this.languages = ['de', 'es', 'fr', 'ja', 'ru', 'zh'];
        this.sourceLanguage = 'en';
        this.backupDir = path.join(__dirname, '..', '..', 'backups', 'pre-cleanup-' + new Date().toISOString().split('T')[0]);
    }

    /**
     * Create backup directory
     */
    createBackupDir() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    /**
     * Backup file before cleanup
     */
    backupFile(language) {
        const sourceFile = path.join(this.uiLocalesDir, `${language}.json`);
        const backupFile = path.join(this.backupDir, `${language}.json`);
        
        if (fs.existsSync(sourceFile)) {
            fs.copyFileSync(sourceFile, backupFile);
            console.log(`📋 Backup created: ${language}.json`);
        }
    }

    /**
     * Load JSON file safely
     */
    loadJSON(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error(`❌ Error loading ${filePath}: ${error.message}`);
            return null;
        }
    }

    /**
     * Get all keys from nested object with dot notation
     */
    getAllKeys(obj, prefix = '') {
        const keys = [];
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            keys.push(fullKey);
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                keys.push(...this.getAllKeys(value, fullKey));
            }
        }
        return keys;
    }

    /**
     * Create a new object with only the keys from the source structure
     */
    filterToSourceStructure(source, target) {
        const result = {};
        
        for (const [key, sourceValue] of Object.entries(source)) {
            if (target.hasOwnProperty(key)) {
                const targetValue = target[key];
                
                if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
                    if (typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
                        result[key] = this.filterToSourceStructure(sourceValue, targetValue);
                    } else {
                        result[key] = sourceValue;
                    }
                } else {
                    result[key] = targetValue;
                }
            } else {
                result[key] = sourceValue;
            }
        }
        
        return result;
    }

    /**
     * Cleanup a single language file
     */
    cleanupLanguage(language) {
        const sourcePath = path.join(this.uiLocalesDir, `${this.sourceLanguage}.json`);
        const targetPath = path.join(this.uiLocalesDir, `${language}.json`);
        
        const sourceData = this.loadJSON(sourcePath);
        const targetData = this.loadJSON(targetPath);

        if (!sourceData || !targetData) {
            return false;
        }

        // Backup before cleanup
        this.backupFile(language);

        // Filter to source structure
        const cleanedData = this.filterToSourceStructure(sourceData, targetData);

        // Write cleaned file
        fs.writeFileSync(targetPath, JSON.stringify(cleanedData, null, 2) + '\n');
        
        // Verify cleanup
        const cleanedKeys = this.getAllKeys(cleanedData);
        const sourceKeys = this.getAllKeys(sourceData);
        
        console.log(`✅ ${language}: Cleaned from ${this.getAllKeys(targetData).length} to ${cleanedKeys.length} keys`);
        
        return cleanedKeys.length === sourceKeys.length;
    }

    /**
     * Run cleanup for all languages
     */
    async cleanupAll() {
        console.log('🧹 UI Locales Cleanup for v1.6.0');
        console.log('==================================');
        console.log();

        this.createBackupDir();

        // Validate source
        const sourcePath = path.join(this.uiLocalesDir, `${this.sourceLanguage}.json`);
        const sourceData = this.loadJSON(sourcePath);
        if (!sourceData) {
            console.error('❌ Cannot load source file');
            return false;
        }

        const sourceKeys = this.getAllKeys(sourceData);
        console.log(`📊 Source (${this.sourceLanguage}): ${sourceKeys.length} keys`);

        let success = true;
        
        // Cleanup each language
        for (const language of this.languages) {
            console.log(`🧹 Cleaning ${language}...`);
            const result = this.cleanupLanguage(language);
            if (!result) {
                success = false;
            }
        }

        console.log();
        console.log('✅ Cleanup completed!');
        console.log(`📁 Backups saved to: ${this.backupDir}`);
        
        return success;
    }

    /**
     * Verify final state
     */
    verifyFinalState() {
        console.log();
        console.log('🔍 Final verification...');
        
        const sourcePath = path.join(this.uiLocalesDir, `${this.sourceLanguage}.json`);
        const sourceData = this.loadJSON(sourcePath);
        const sourceKeys = this.getAllKeys(sourceData);

        let allMatch = true;
        
        for (const language of this.languages) {
            const targetPath = path.join(this.uiLocalesDir, `${language}.json`);
            const targetData = this.loadJSON(targetPath);
            const targetKeys = this.getAllKeys(targetData);
            
            const matches = targetKeys.length === sourceKeys.length;
            console.log(`${matches ? '✅' : '❌'} ${language}: ${targetKeys.length} keys (should be ${sourceKeys.length})`);
            
            if (!matches) {
                allMatch = false;
            }
        }

        return allMatch;
    }
}

// Run cleanup
if (require.main === module) {
    const cleanup = new UILocalesCleanup();
    cleanup.cleanupAll().then(() => {
        const verified = cleanup.verifyFinalState();
        if (verified) {
            console.log('🎉 All files cleaned and validated successfully!');
            console.log('✅ Ready for v1.6.0 release');
        } else {
            console.log('❌ Verification failed');
        }
        process.exit(verified ? 0 : 1);
    });
}

module.exports = UILocalesCleanup;