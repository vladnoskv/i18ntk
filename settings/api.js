/**
 * API Client for Settings Management
 * Handles all communication with the settings server
 */

class SettingsAPI {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = `${this.baseURL}/api`;
        this.timeout = 10000; // 10 seconds
    }

    /**
     * Make an HTTP request with error handling and timeout
     * @param {string} url - Request URL
     * @param {object} options - Fetch options
     * @returns {Promise<object>} Response data
     */
    async request(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    error: `HTTP ${response.status}: ${response.statusText}`
                }));
                throw new Error(errorData.error || `Request failed with status ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - please check your connection');
            }
            
            throw error;
        }
    }

    /**
     * Get current settings
     * @returns {Promise<object>} Current settings
     */
    async getSettings() {
        const response = await this.request(`${this.apiURL}/settings`);
        return response.data;
    }

    /**
     * Save settings
     * @param {object} settings - Settings to save
     * @returns {Promise<object>} Save result
     */
    async saveSettings(settings) {
        const response = await this.request(`${this.apiURL}/settings`, {
            method: 'POST',
            body: JSON.stringify(settings)
        });
        return response;
    }

    /**
     * Update a specific setting
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     * @returns {Promise<object>} Update result
     */
    async updateSetting(key, value) {
        const response = await this.request(`${this.apiURL}/settings/${encodeURIComponent(key)}`, {
            method: 'PUT',
            body: JSON.stringify({ value })
        });
        return response;
    }

    /**
     * Reset settings to defaults
     * @returns {Promise<object>} Reset result
     */
    async resetSettings() {
        const response = await this.request(`${this.apiURL}/settings/reset`, {
            method: 'POST'
        });
        return response;
    }

    /**
     * Validate settings
     * @param {object} settings - Settings to validate
     * @returns {Promise<object>} Validation result
     */
    async validateSettings(settings) {
        const response = await this.request(`${this.apiURL}/settings/validate`, {
            method: 'POST',
            body: JSON.stringify(settings)
        });
        return response;
    }

    /**
     * Get settings schema
     * @returns {Promise<object>} Settings schema
     */
    async getSettingsSchema() {
        const response = await this.request(`${this.apiURL}/settings/schema`);
        return response.data;
    }

    /**
     * Get available languages
     * @returns {Promise<Array>} Available languages
     */
    async getAvailableLanguages() {
        const response = await this.request(`${this.apiURL}/languages`);
        return response.data;
    }

    /**
     * Check server health
     * @returns {Promise<object>} Health status
     */
    async checkHealth() {
        const response = await this.request(`${this.apiURL}/health`);
        return response;
    }

    /**
     * Test connection to the server
     * @returns {Promise<boolean>} Connection status
     */
    async testConnection() {
        try {
            await this.checkHealth();
            return true;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
}

/**
 * Toast notification system
 */
class ToastManager {
    constructor() {
        this.container = document.getElementById('toast-container');
        this.toasts = new Map();
        this.defaultDuration = 5000;
    }

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds
     * @returns {string} Toast ID
     */
    show(message, type = 'info', duration = this.defaultDuration) {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = id;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span>${this.getIcon(type)}</span>
                <span>${this.escapeHtml(message)}</span>
                <button onclick="toastManager.hide('${id}')" style="background: none; border: none; color: inherit; cursor: pointer; margin-left: auto; font-size: 1.2rem;">&times;</button>
            </div>
        `;
        
        this.container.appendChild(toast);
        this.toasts.set(id, toast);
        
        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => this.hide(id), duration);
        }
        
        return id;
    }

    /**
     * Hide a toast notification
     * @param {string} id - Toast ID
     */
    hide(id) {
        const toast = this.toasts.get(id);
        if (toast) {
            toast.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                this.toasts.delete(id);
            }, 300);
        }
    }

    /**
     * Clear all toasts
     */
    clear() {
        this.toasts.forEach((toast, id) => this.hide(id));
    }

    /**
     * Get icon for toast type
     * @param {string} type - Toast type
     * @returns {string} Icon
     */
    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show success toast
     * @param {string} message - Message
     * @param {number} duration - Duration
     */
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    /**
     * Show error toast
     * @param {string} message - Message
     * @param {number} duration - Duration
     */
    error(message, duration = 8000) {
        return this.show(message, 'error', duration);
    }

    /**
     * Show warning toast
     * @param {string} message - Message
     * @param {number} duration - Duration
     */
    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Show info toast
     * @param {string} message - Message
     * @param {number} duration - Duration
     */
    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

/**
 * Loading manager
 */
class LoadingManager {
    constructor() {
        this.overlay = document.getElementById('loading-overlay');
        this.isLoading = false;
    }

    /**
     * Show loading overlay
     * @param {string} message - Loading message
     */
    show(message = 'Loading...') {
        if (this.overlay) {
            const messageElement = this.overlay.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }
            this.overlay.classList.remove('hidden');
            this.isLoading = true;
        }
    }

    /**
     * Hide loading overlay
     */
    hide() {
        if (this.overlay) {
            this.overlay.classList.add('hidden');
            this.isLoading = false;
        }
    }

    /**
     * Execute a function with loading overlay
     * @param {Function} fn - Function to execute
     * @param {string} message - Loading message
     * @returns {Promise} Function result
     */
    async withLoading(fn, message = 'Loading...') {
        this.show(message);
        try {
            const result = await fn();
            return result;
        } finally {
            this.hide();
        }
    }
}

/**
 * Theme manager
 */
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || 'light';
        this.applyTheme(this.currentTheme);
    }

    /**
     * Get stored theme from localStorage
     * @returns {string|null} Stored theme
     */
    getStoredTheme() {
        return localStorage.getItem('theme');
    }

    /**
     * Store theme in localStorage
     * @param {string} theme - Theme to store
     */
    storeTheme(theme) {
        localStorage.setItem('theme', theme);
    }

    /**
     * Apply theme to document
     * @param {string} theme - Theme to apply
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        this.storeTheme(theme);
        this.updateThemeIcon(theme);
    }

    /**
     * Toggle between light and dark themes
     */
    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        return newTheme;
    }

    /**
     * Update theme toggle icon
     * @param {string} theme - Current theme
     */
    updateThemeIcon(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        }
    }

    /**
     * Get current theme
     * @returns {string} Current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Add slideOut animation to CSS if not present
if (!document.querySelector('style[data-toast-animations]')) {
    const style = document.createElement('style');
    style.setAttribute('data-toast-animations', 'true');
    style.textContent = `
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Global instances
window.settingsAPI = new SettingsAPI();
window.toastManager = new ToastManager();
window.loadingManager = new LoadingManager();
window.themeManager = new ThemeManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SettingsAPI,
        ToastManager,
        LoadingManager,
        ThemeManager
    };
}