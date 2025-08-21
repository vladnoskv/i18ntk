/**
 * Settings Migration Script
 * Migrates settings from settings/ to .i18ntk-settings/
 */

const fs = require('fs');
const path = require('path');
const SettingsManagerV2 = require('../utils/settings-manager-v2');

function migrateSettings() {
  const projectPath = process.cwd();
  const oldSettingsDir = path.join(projectPath, 'settings');
  const newSettingsDir = SettingsManagerV2.ensureSettingsDir(projectPath);
  
  console.log('🔧 Migrating settings to new location...');
  
  // Check if old settings exist
  if (!fs.existsSync(oldSettingsDir)) {
    console.log('✅ No legacy settings directory found, skipping migration');
    return;
  }
  
  // Copy all files from old settings directory
  const files = fs.readdirSync(oldSettingsDir);
  let migratedCount = 0;
  
  files.forEach(file => {
    const oldPath = path.join(oldSettingsDir, file);
    const newPath = path.join(newSettingsDir, file);
    
    if (fs.statSync(oldPath).isFile()) {
      fs.copyFileSync(oldPath, newPath);
      migratedCount++;
    }
  });
  
  console.log(`✅ Migrated ${migratedCount} settings files to ${newSettingsDir}`);
  
  // Optionally, remove old settings directory after successful migration
  // fs.rmSync(oldSettingsDir, { recursive: true, force: true });
  // console.log('🗑️  Removed legacy settings directory');
}

if (require.main === module) {
  migrateSettings();
}

module.exports = { migrateSettings };