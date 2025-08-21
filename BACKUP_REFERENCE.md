# i18ntk-backup Reference Guide

## Overview

i18ntk-backup is a secure, standalone backup utility for i18ntk translation files. It provides comprehensive backup and restore functionality with security-first design, interactive prompts, and automatic cleanup.

## Security Features

- **Path Traversal Protection**: All file paths are validated against directory traversal attacks
- **Safe File Operations**: Uses SecurityUtils for all file read/write operations
- **Input Validation**: All user inputs are sanitized and validated
- **Directory Validation**: Ensures operations stay within allowed directories

## Commands

### `create [directory]`

Create a new backup of translation files.

**Usage:**
```bash
# Create backup from default directory (locales)
i18ntk-backup create

# Create backup from specific directory
i18ntk-backup create ui-locales

# Create backup with custom output directory
i18ntk-backup create --output ./my-backups
```

**Features:**
- Creates timestamped JSON backups
- Automatically cleans up old backups
- Validates all file paths for security
- Supports custom backup directories

### `list`

List all available backups in the configured backup directory.

**Usage:**
```bash
i18ntk-backup list
```

**Features:**
- Shows backup size, creation date, and file path
- Interactive prompts for directory creation if none exists
- Configurable default backup directory
- Automatic configuration persistence

### `restore <backup-file>`

Restore translation files from a backup.

**Usage:**
```bash
# Restore from latest backup
i18ntk-backup restore backup-20241215-143022.json

# Restore to specific directory
i18ntk-backup restore backup-20241215-143022.json --output ./restored-locales
```

**Features:**
- Validates backup file integrity
- Restores all translation files
- Supports custom restore directories
- Maintains original file structure

### `verify <backup-file>`

Verify the integrity of a backup file.

**Usage:**
```bash
i18ntk-backup verify backup-20241215-143022.json
```

**Features:**
- Validates JSON structure
- Checks for corrupted files
- Reports any issues found

### `cleanup`

Remove old backups based on retention policy.

**Usage:**
```bash
# Cleanup with default retention (10 backups)
i18ntk-backup cleanup

# Cleanup keeping only 5 backups
i18ntk-backup cleanup --keep 5
```

## Interactive Features

### Directory Creation Prompts

When no backup directory exists, the tool provides interactive prompts:

```
No backup directory found at: ./i18ntk-backup
Would you like to create a backup directory? (Y/n): Y

Choose backup directory location:
1) Use default (./i18ntk-backup)
2) Enter custom path
3) Cancel

Selection: 1
Backup directory created: ./i18ntk-backup
Would you like to save this as your default backup directory? (Y/n): Y
Configuration updated with new backup directory.
```

### Confirmation Prompts

The tool provides confirmation prompts for:
- Creating new directories
- Overwriting existing files
- Updating configuration settings
- Deleting old backups

## Configuration

### Default Configuration

The backup tool uses the following defaults:

```json
{
  "backup": {
    "directory": "./i18ntk-backup",
    "maxBackups": 10
  }
}
```

### Configuration Persistence

Configuration changes are automatically saved to your project settings:
- **Location**: `.i18ntk/settings.json`
- **Updates**: Changes to backup directory are persisted
- **Migration**: Legacy configurations are automatically migrated

### Environment Variables

Override configuration with environment variables:

```bash
# Set custom backup directory
export I18N_BACKUP_DIR="./custom-backups"

# Set maximum backups to keep
export I18N_MAX_BACKUPS=20
```

## File Structure

### Backup File Format

Backups are stored as JSON files with the following structure:

```json
{
  "metadata": {
    "created": "2024-12-15T14:30:22.123Z",
    "version": "1.10.0",
    "sourceDir": "ui-locales",
    "fileCount": 5
  },
  "translations": {
    "en.json": {
      "welcome": "Welcome",
      "logout": "Logout"
    },
    "es.json": {
      "welcome": "Bienvenido",
      "logout": "Cerrar sesión"
    }
  }
}
```

### Directory Structure

```
project/
├── locales/              # Default source directory
├── ui-locales/           # Alternative source directory
├── i18ntk-backup/        # Default backup directory
│   ├── backup-20241215-143022.json
│   ├── backup-20241216-090015.json
│   └── backup-20241217-154530.json
└── .i18ntk/
    └── settings.json     # Configuration file
```

## Security Best Practices

### Path Validation

All file paths are validated to prevent:
- Directory traversal attacks (`../../../etc/passwd`)
- Writing outside allowed directories
- Reading from sensitive system locations

### Safe Operations

- **File Reading**: Uses SecurityUtils.safeReadFile
- **File Writing**: Uses SecurityUtils.safeWriteFile
- **Path Validation**: All paths validated against base directory
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Examples

### Basic Backup Workflow

```bash
# 1. List existing backups
i18ntk-backup list

# 2. Create new backup from ui-locales
i18ntk-backup create ui-locales

# 3. Verify backup integrity
i18ntk-backup verify backup-20241215-143022.json

# 4. Cleanup old backups
i18ntk-backup cleanup --keep 5
```

### CI/CD Integration

```bash
# Create backup in CI/CD pipeline
i18ntk-backup create --output ./artifacts/backups --no-prompt

# Verify backup before deployment
i18ntk-backup verify ./artifacts/backups/backup-*.json
```

### Custom Configuration

```bash
# Set custom backup directory
mkdir -p ./my-project/backups
i18ntk-backup create --output ./my-project/backups

# Save as default
# (interactive prompt will ask to save configuration)
```

## Troubleshooting

### Common Issues

**"No JSON files found"**
- Ensure the source directory contains .json files
- Check that the directory path is correct
- Verify file permissions

**"Permission denied"**
- Check directory write permissions
- Ensure the backup directory is writable
- Verify SecurityUtils path validation

**"Invalid backup file"**
- Verify backup file exists and is readable
- Check file extension (.json)
- Ensure file is not corrupted

### Debug Mode

Enable debug mode for detailed logging:

```bash
export DEBUG=true
i18ntk-backup list
```

### Log Location

Logs are stored in:
- **Linux/macOS**: `~/.i18ntk/logs/`
- **Windows**: `%USERPROFILE%\.i18ntk\logs\`

## Version History

### v1.10.0 (Latest)
- Added security-first path validation
- Interactive directory creation prompts
- Configuration persistence
- Automatic cleanup of old backups
- Enhanced error handling

### v1.9.0
- Initial backup functionality
- Basic create/restore operations
- Simple listing functionality