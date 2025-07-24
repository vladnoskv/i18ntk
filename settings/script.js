/**
 * Settings Page Main Script
 * Handles form interactions, validation, and settings management
 */

class SettingsPage {
    constructor() {
        this.form = document.getElementById('settings-form');
        this.currentSettings = {};
        this.originalSettings = {};
        this.isDirty = false;
        this.autoSaveTimeout = null;
        this.validationErrors = new Map();
        
        this.init();
    }

    /**
     * Initialize the settings page
     */
    async init() {
        try {
            await this.loadSettings();
            this.setupEventListeners();
            this.setupAutoSave();
            this.updateConnectionStatus();
            
            toastManager.success('Settings loaded successfully');
        } catch (error) {
            console.error('Failed to initialize settings page:', error);
            toastManager.error('Failed to load settings: ' + error.message);
        }
    }

    /**
     * Load settings from the server
     */
    async loadSettings() {
        await loadingManager.withLoading(async () => {
            this.currentSettings = await settingsAPI.getSettings();
            this.originalSettings = JSON.parse(JSON.stringify(this.currentSettings));
            this.populateForm(this.currentSettings);
            this.updateSaveStatus('Loaded');
        }, 'Loading settings...');
    }

    /**
     * Populate form with settings data
     * @param {object} settings - Settings to populate
     */
    populateForm(settings) {
        // Basic settings
        this.setFormValue('language', settings.language);
        this.setFormValue('theme', settings.theme);
        this.setFormValue('sourceDir', settings.sourceDir);
        this.setFormValue('outputDir', settings.outputDir);
        this.setFormValue('sourceLanguage', settings.sourceLanguage);
        this.setFormValue('sizeLimit', settings.sizeLimit);
        this.setFormValue('autoSave', settings.autoSave);
        this.setFormValue('notifications', settings.notifications);
        
        // Advanced settings
        if (settings.advanced) {
            this.setFormValue('batchSize', settings.advanced.batchSize);
            this.setFormValue('maxConcurrentFiles', settings.advanced.maxConcurrentFiles);
            this.setFormValue('sizingThreshold', settings.advanced.sizingThreshold);
            this.setFormValue('strictMode', settings.advanced.strictMode);
            this.setFormValue('enableAuditLog', settings.advanced.enableAuditLog);
            this.setFormValue('backupBeforeChanges', settings.advanced.backupBeforeChanges);
        }
        
        // Update UI language selector in header
        const uiLanguageSelect = document.getElementById('ui-language');
        if (uiLanguageSelect) {
            uiLanguageSelect.value = settings.language;
        }
        
        // Apply theme
        if (settings.theme) {
            themeManager.applyTheme(settings.theme);
        }
    }

    /**
     * Set form field value
     * @param {string} name - Field name
     * @param {any} value - Field value
     */
    setFormValue(name, value) {
        const field = this.form.querySelector(`[name="${name}"]`);
        if (!field) return;
        
        if (field.type === 'checkbox') {
            field.checked = Boolean(value);
        } else {
            field.value = value || '';
        }
    }

    /**
     * Get form data as settings object
     * @returns {object} Form data
     */
    getFormData() {
        const formData = new FormData(this.form);
        const settings = {
            language: formData.get('language'),
            theme: formData.get('theme'),
            sourceDir: formData.get('sourceDir'),
            outputDir: formData.get('outputDir'),
            sourceLanguage: formData.get('sourceLanguage'),
            sizeLimit: formData.get('sizeLimit') ? parseInt(formData.get('sizeLimit')) : null,
            autoSave: formData.has('autoSave'),
            notifications: formData.has('notifications'),
            defaultLanguages: this.currentSettings.defaultLanguages || ['de', 'es', 'fr', 'ru'],
            reportLanguage: this.currentSettings.reportLanguage || 'auto',
            advanced: {
                batchSize: parseInt(formData.get('advanced.batchSize')) || 100,
                maxConcurrentFiles: parseInt(formData.get('advanced.maxConcurrentFiles')) || 10,
                sizingThreshold: parseInt(formData.get('advanced.sizingThreshold')) || 50,
                enableProgressBars: this.currentSettings.advanced?.enableProgressBars ?? true,
                enableColorOutput: this.currentSettings.advanced?.enableColorOutput ?? true,
                strictMode: formData.has('advanced.strictMode'),
                enableAuditLog: formData.has('advanced.enableAuditLog'),
                backupBeforeChanges: formData.has('advanced.backupBeforeChanges'),
                validateOnSave: this.currentSettings.advanced?.validateOnSave ?? true,
                sizingFormat: this.currentSettings.advanced?.sizingFormat || 'table'
            }
        };
        
        return settings;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
        
        // Form changes
        this.form.addEventListener('input', () => {
            this.markDirty();
            this.validateForm();
        });
        
        this.form.addEventListener('change', () => {
            this.markDirty();
            this.validateForm();
        });
        
        // Reset button
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetSettings();
        });
        
        // Preview button
        document.getElementById('preview-btn').addEventListener('click', () => {
            this.showPreview();
        });
        
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            const newTheme = themeManager.toggle();
            this.setFormValue('theme', newTheme);
            this.markDirty();
        });
        
        // UI language change
        document.getElementById('ui-language').addEventListener('change', (e) => {
            this.setFormValue('language', e.target.value);
            this.markDirty();
        });
        
        // Preview modal
        document.getElementById('close-preview').addEventListener('click', () => {
            this.hidePreview();
        });
        
        document.getElementById('apply-preview').addEventListener('click', () => {
            this.hidePreview();
            this.saveSettings();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
                    e.preventDefault();
                    this.saveSettings();
                } else if (e.key === 'r') {
                    e.preventDefault();
                    this.resetSettings();
                }
            }
        });
        
        // Before unload warning
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        this.form.addEventListener('input', () => {
            if (this.currentSettings.autoSave) {
                this.scheduleAutoSave();
            }
        });
    }

    /**
     * Schedule auto-save
     */
    scheduleAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            if (this.isDirty && this.currentSettings.autoSave) {
                this.saveSettings(true);
            }
        }, 2000); // Auto-save after 2 seconds of inactivity
    }

    /**
     * Mark form as dirty (has unsaved changes)
     */
    markDirty() {
        this.isDirty = true;
        this.updateSaveStatus('Unsaved changes');
    }

    /**
     * Mark form as clean (no unsaved changes)
     */
    markClean() {
        this.isDirty = false;
        this.updateSaveStatus('Saved');
    }

    /**
     * Validate form
     * @returns {boolean} Validation result
     */
    validateForm() {
        this.validationErrors.clear();
        
        const formData = this.getFormData();
        
        // Validate required fields
        if (!formData.sourceDir.trim()) {
            this.addValidationError('sourceDir', 'Source directory is required');
        }
        
        if (!formData.outputDir.trim()) {
            this.addValidationError('outputDir', 'Output directory is required');
        }
        
        // Validate numeric fields
        if (formData.sizeLimit !== null && formData.sizeLimit < 0) {
            this.addValidationError('sizeLimit', 'Size limit must be positive');
        }
        
        if (formData.advanced.batchSize < 1 || formData.advanced.batchSize > 1000) {
            this.addValidationError('batchSize', 'Batch size must be between 1 and 1000');
        }
        
        if (formData.advanced.maxConcurrentFiles < 1 || formData.advanced.maxConcurrentFiles > 50) {
            this.addValidationError('maxConcurrentFiles', 'Max concurrent files must be between 1 and 50');
        }
        
        if (formData.advanced.sizingThreshold < 0 || formData.advanced.sizingThreshold > 200) {
            this.addValidationError('sizingThreshold', 'Sizing threshold must be between 0 and 200');
        }
        
        this.displayValidationErrors();
        
        return this.validationErrors.size === 0;
    }

    /**
     * Add validation error
     * @param {string} field - Field name
     * @param {string} message - Error message
     */
    addValidationError(field, message) {
        this.validationErrors.set(field, message);
    }

    /**
     * Display validation errors
     */
    displayValidationErrors() {
        // Clear existing errors
        this.form.querySelectorAll('.error-message').forEach(el => el.remove());
        this.form.querySelectorAll('.form-control.error').forEach(el => {
            el.classList.remove('error');
        });
        
        // Display new errors
        this.validationErrors.forEach((message, field) => {
            const fieldElement = this.form.querySelector(`[name="${field}"]`);
            if (fieldElement) {
                fieldElement.classList.add('error');
                
                const errorElement = document.createElement('div');
                errorElement.className = 'error-message';
                errorElement.style.cssText = 'color: var(--error-color); font-size: 0.75rem; margin-top: 0.25rem;';
                errorElement.textContent = message;
                
                fieldElement.parentNode.appendChild(errorElement);
            }
        });
    }

    /**
     * Save settings
     * @param {boolean} isAutoSave - Whether this is an auto-save
     */
    async saveSettings(isAutoSave = false) {
        if (!this.validateForm()) {
            if (!isAutoSave) {
                toastManager.error('Please fix validation errors before saving');
            }
            return;
        }
        
        try {
            const settings = this.getFormData();
            
            await loadingManager.withLoading(async () => {
                const result = await settingsAPI.saveSettings(settings);
                this.currentSettings = result.data;
                this.originalSettings = JSON.parse(JSON.stringify(this.currentSettings));
                this.markClean();
            }, 'Saving settings...');
            
            if (isAutoSave) {
                toastManager.info('Settings auto-saved', 2000);
            } else {
                toastManager.success('Settings saved successfully');
            }
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            toastManager.error('Failed to save settings: ' + error.message);
        }
    }

    /**
     * Reset settings to defaults
     */
    async resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
            return;
        }
        
        try {
            await loadingManager.withLoading(async () => {
                const result = await settingsAPI.resetSettings();
                this.currentSettings = result.data;
                this.originalSettings = JSON.parse(JSON.stringify(this.currentSettings));
                this.populateForm(this.currentSettings);
                this.markClean();
            }, 'Resetting settings...');
            
            toastManager.success('Settings reset to defaults');
            
        } catch (error) {
            console.error('Failed to reset settings:', error);
            toastManager.error('Failed to reset settings: ' + error.message);
        }
    }

    /**
     * Show settings preview
     */
    showPreview() {
        const settings = this.getFormData();
        const previewContent = document.getElementById('preview-content');
        const previewModal = document.getElementById('preview-modal');
        
        previewContent.textContent = JSON.stringify(settings, null, 2);
        previewModal.classList.remove('hidden');
    }

    /**
     * Hide settings preview
     */
    hidePreview() {
        const previewModal = document.getElementById('preview-modal');
        previewModal.classList.add('hidden');
    }

    /**
     * Update save status
     * @param {string} status - Status message
     */
    updateSaveStatus(status) {
        const saveStatus = document.getElementById('save-status');
        if (saveStatus) {
            saveStatus.textContent = status;
        }
    }

    /**
     * Update connection status
     */
    async updateConnectionStatus() {
        const serverStatus = document.getElementById('server-status');
        if (!serverStatus) return;
        
        try {
            const isConnected = await settingsAPI.testConnection();
            serverStatus.textContent = isConnected ? 'Connected' : 'Disconnected';
            serverStatus.style.color = isConnected ? 'var(--success-color)' : 'var(--error-color)';
        } catch (error) {
            serverStatus.textContent = 'Error';
            serverStatus.style.color = 'var(--error-color)';
        }
    }

    /**
     * Get current settings
     * @returns {object} Current settings
     */
    getCurrentSettings() {
        return { ...this.currentSettings };
    }

    /**
     * Check if form has unsaved changes
     * @returns {boolean} Has unsaved changes
     */
    hasUnsavedChanges() {
        return this.isDirty;
    }
}

/**
 * Utility functions
 */
const utils = {
    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Deep clone object
     * @param {object} obj - Object to clone
     * @returns {object} Cloned object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Format file size
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// Initialize the settings page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.settingsPage = new SettingsPage();
    
    // Update connection status periodically
    setInterval(() => {
        if (window.settingsPage) {
            window.settingsPage.updateConnectionStatus();
        }
    }, 30000); // Every 30 seconds
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SettingsPage,
        utils
    };
}