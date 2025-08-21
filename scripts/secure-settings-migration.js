#!/usr/bin/env node
/**
 * Secure Settings Migration Script
 * Migrates existing settings to use encrypted file paths
 */

const fs = require('fs');
const path = require('path');
const { pathEncryption } = require('../utils/path-encryption');

// Paths
const settingsDir = path.join(process.cwd(), 'settings');
const settingsFile = path.join(settingsDir, 'initialization.json');
const backupFile = path.join(settingsDir, 'initialization.json.backup.pre-encryption');

function migrateSettings() {
  console.log('🔐 Starting secure settings migration...');

  if (!fs.existsSync(settingsFile)) {
    console.log('✅ No settings file found, nothing to migrate');
    return true;
  }

  try {
    // Read current settings
    const rawData = fs.readFileSync(settingsFile, 'utf8');
    const settings = JSON.parse(rawData);

    console.log('📋 Current settings:', {
      initialized: settings.initialized,
      version: settings.version,
      sourceDir: settings.sourceDir,
      hasEncryptedPaths: checkForEncryptedPaths(settings)
    });

    // Create backup
    fs.copyFileSync(settingsFile, backupFile);
    console.log('💾 Backup created:', backupFile);

    // Encrypt sensitive paths
    const encryptedSettings = { ...settings };
    let changesMade = false;

    // Encrypt sourceDir if it's a plain path
    if (settings.sourceDir && !pathEncryption.isEncryptedPath(settings.sourceDir)) {
      console.log('🔒 Encrypting sourceDir...');
      encryptedSettings.sourceDir = pathEncryption.encryptPath(settings.sourceDir);
      changesMade = true;
      console.log('✅ sourceDir encrypted');
    }

    // Encrypt any other absolute paths
    const pathFields = ['backupDir', 'configDir', 'logDir', 'cacheDir'];
    for (const field of pathFields) {
      if (settings[field] && !pathEncryption.isEncryptedPath(settings[field])) {
        console.log(`🔒 Encrypting ${field}...`);
        encryptedSettings[field] = pathEncryption.encryptPath(settings[field]);
        changesMade = true;
        console.log(`✅ ${field} encrypted`);
      }
    }

    if (!changesMade) {
      console.log('✅ Settings already encrypted, no changes needed');
      fs.unlinkSync(backupFile); // Remove unnecessary backup
      return true;
    }

    // Update timestamp
    encryptedSettings.timestamp = new Date().toISOString();
    encryptedSettings.encryptionVersion = 1;

    // Save encrypted settings
    const settingsData = JSON.stringify(encryptedSettings, null, 2);
    fs.writeFileSync(settingsFile, settingsData, { mode: 0o600 });
    
    console.log('✅ Settings successfully migrated to encrypted format');
    console.log('📄 Settings file updated:', settingsFile);
    console.log('🔑 Encryption key stored in:', path.join(process.cwd(), '.path-encryption-key'));

    return true;

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Restore backup if available
    if (fs.existsSync(backupFile)) {
      try {
        fs.copyFileSync(backupFile, settingsFile);
        console.log('🔄 Settings restored from backup');
      } catch (restoreError) {
        console.error('❌ Failed to restore backup:', restoreError.message);
      }
    }
    
    return false;
  }
}

function checkForEncryptedPaths(settings) {
  const fields = ['sourceDir', 'backupDir', 'configDir', 'logDir', 'cacheDir'];
  const encrypted = [];
  
  for (const field of fields) {
    if (settings[field] && pathEncryption.isEncryptedPath(settings[field])) {
      encrypted.push(field);
    }
  }
  
  return encrypted;
}

function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  if (!fs.existsSync(settingsFile)) {
    console.error('❌ Settings file not found');
    return false;
  }

  try {
    const rawData = fs.readFileSync(settingsFile, 'utf8');
    const settings = JSON.parse(rawData);

    const encryptedFields = checkForEncryptedPaths(settings);
    console.log('📊 Encrypted fields:', encryptedFields);

    // Verify we can decrypt the paths
    for (const field of encryptedFields) {
      try {
        const decrypted = pathEncryption.decryptPath(settings[field]);
        console.log(`✅ ${field}: Successfully decrypted`);
      } catch (error) {
        console.error(`❌ ${field}: Decryption failed -`, error.message);
        return false;
      }
    }

    console.log('✅ Migration verification completed successfully');
    return true;

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

function cleanup() {
  console.log('\n🧹 Cleaning up...');
  
  if (fs.existsSync(backupFile)) {
    try {
      fs.unlinkSync(backupFile);
      console.log('🗑️  Backup file removed');
    } catch (error) {
      console.warn('⚠️  Could not remove backup file:', error.message);
    }
  }
}

// Main execution
if (require.main === module) {
  console.log('🔐 i18nTK Secure Settings Migration Tool');
  console.log('========================================\n');

  const success = migrateSettings();
  
  if (success) {
    const verified = verifyMigration();
    if (verified) {
      cleanup();
      console.log('\n🎉 Migration completed successfully!');
      console.log('🔒 Your settings are now securely encrypted');
    } else {
      console.log('\n⚠️  Migration completed with warnings');
    }
  } else {
    console.log('\n❌ Migration failed - settings restored from backup');
    process.exit(1);
  }
}

module.exports = {
  migrateSettings,
  verifyMigration,
  checkForEncryptedPaths
};