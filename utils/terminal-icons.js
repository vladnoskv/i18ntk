/**
 * Terminal Icons Utility
 *
 * Provides Unicode emoji support with fallbacks for terminals that don't support them.
 * Automatically detects terminal capabilities and provides appropriate symbols.
 */

const os = require('os');
const { envManager } = require('./env-manager');


// Detect if terminal supports Unicode/emoji
function supportsUnicode() {
    // Check if we're on Windows
    if (os.platform() !== 'win32') {
        return true; // Assume Unix-like systems support Unicode
    }

    // Check if we're in a TTY
    if (!process.stdout.isTTY) {
        return false;
    }

    try {
        // Try to detect Windows Terminal, VS Code terminal, or other modern terminals
        const terminal = envManager.get('TERM_PROGRAM') || envManager.get('WT_SESSION') || '';

        // Modern terminals that support Unicode
        const unicodeTerminals = [
            'vscode',           // VS Code integrated terminal
            'hyper',            // Hyper terminal
            'tabby',            // Tabby terminal
            'fluent-terminal',  // Fluent Terminal
            'windows-terminal', // Windows Terminal
            'wt'                // Windows Terminal (WT_SESSION)
        ];

        if (unicodeTerminals.some(term => terminal.toLowerCase().includes(term))) {
            return true;
        }

        // Check for Windows Terminal environment variable
        if (envManager.get('WT_SESSION')) {
            return true;
        }

        // Check for modern PowerShell or pwsh
        if (envManager.get('PSModulePath') || envManager.get('POWERSHELL_EDITION')) {
            return true;
        }

        // Default to false for older Windows terminals
        return false;

    } catch (error) {
        // If detection fails, default to safe option
        return false;
    }
}

// Icon definitions with fallbacks
const ICONS = {
    // Setup and configuration
    wrench: { emoji: '🔧', fallback: '[SETUP]' },
    gear: { emoji: '⚙️', fallback: '[CONFIG]' },
    checkmark: { emoji: '✅', fallback: '[OK]' },
    cross: { emoji: '❌', fallback: '[ERROR]' },
    warning: { emoji: '⚠️', fallback: '[WARN]' },
    info: { emoji: 'ℹ️', fallback: '[INFO]' },

    // Actions
    rocket: { emoji: '🚀', fallback: '[START]' },
    search: { emoji: '🔍', fallback: '[SEARCH]' },
    analyze: { emoji: '📊', fallback: '[ANALYZE]' },
    fix: { emoji: '🔧', fallback: '[FIX]' },
    complete: { emoji: '🎉', fallback: '[DONE]' },
    clean: { emoji: '🧹', fallback: '[CLEAN]' },

    // Status
    success: { emoji: '✅', fallback: '[SUCCESS]' },
    error: { emoji: '❌', fallback: '[ERROR]' },
    pending: { emoji: '⏳', fallback: '[PENDING]' },
    processing: { emoji: '⚙️', fallback: '[WORKING]' },

    // Files and directories
    file: { emoji: '📄', fallback: '[FILE]' },
    folder: { emoji: '📁', fallback: '[DIR]' },
    report: { emoji: '📊', fallback: '[REPORT]' },
    backup: { emoji: '💾', fallback: '[BACKUP]' },

    // Languages and frameworks
    javascript: { emoji: '🟨', fallback: '[JS]' },
    python: { emoji: '🐍', fallback: '[PY]' },
    java: { emoji: '☕', fallback: '[JAVA]' },
    php: { emoji: '🐘', fallback: '[PHP]' },
    go: { emoji: '🐹', fallback: '[GO]' },
    react: { emoji: '⚛️', fallback: '[REACT]' },
    vue: { emoji: '💚', fallback: '[VUE]' },
    angular: { emoji: '🅰️', fallback: '[ANGULAR]' },

    // UI elements
    bullet: { emoji: '•', fallback: '-' },
    arrow: { emoji: '→', fallback: '->' },
    separator: { emoji: '═', fallback: '=' },
    corner: { emoji: '╔', fallback: '+' },
    line: { emoji: '║', fallback: '|' },
    end: { emoji: '╚', fallback: '+' }
};

// Cache the Unicode support detection
const _supportsUnicode = supportsUnicode();

/**
 * Get the appropriate icon for the current terminal
 * @param {string} iconName - Name of the icon from ICONS
 * @returns {string} - The icon or fallback text
 */
function getIcon(iconName) {
    const icon = ICONS[iconName];
    if (!icon) {
        return `[${iconName.toUpperCase()}]`;
    }

    return _supportsUnicode ? icon.emoji : icon.fallback;
}

/**
 * Get all available icon names
 * @returns {string[]} - Array of icon names
 */
function getAvailableIcons() {
    return Object.keys(ICONS);
}

/**
 * Check if terminal supports Unicode
 * @returns {boolean} - True if Unicode is supported
 */
function isUnicodeSupported() {
    return _supportsUnicode;
}

/**
 * Force enable/disable Unicode support (for testing)
 * @param {boolean} enabled - Whether to enable Unicode
 */
function setUnicodeSupport(enabled) {
    // This is mainly for testing purposes
    // In production, detection should be automatic
    if (typeof enabled === 'boolean') {
        // Note: This won't actually change terminal capabilities,
        // just the detection result for this module
        console.warn('Warning: setUnicodeSupport() only affects this module\'s detection, not actual terminal capabilities');
    }
}

// Export functions
module.exports = {
    getIcon,
    getAvailableIcons,
    isUnicodeSupported,
    setUnicodeSupport,
    ICONS
};
