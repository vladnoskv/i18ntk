const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SecurityUtils = require('./security');
const SettingsManager = require('../settings-manager');

/**
 * Admin Authentication Module
 * Provides secure PIN-based authentication for administrative operations
 */
class AdminAuth {
  constructor() {
    this.configPath = path.join(process.cwd(), '.i18n-admin-config.json');
    this.settingsManager = new SettingsManager();
    
    // Get settings from SettingsManager
    const securitySettings = this.settingsManager.getSecurity();
    this.sessionTimeout = (securitySettings.sessionTimeout || 30) * 60 * 1000; // Convert minutes to milliseconds
    this.maxAttempts = securitySettings.maxFailedAttempts || 3;
    this.lockoutDuration = (securitySettings.lockoutDuration || 15) * 60 * 1000; // Convert minutes to milliseconds
    this.keepAuthenticatedUntilExit = securitySettings.keepAuthenticatedUntilExit !== false;
    
    this.activeSessions = new Map();
    this.failedAttempts = new Map();
    this.lockouts = new Map();
    
    // Clean up expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * Initialize admin authentication system
   */
  async initialize() {
    try {
      if (!fs.existsSync(this.configPath)) {
        // Create default config if it doesn't exist
        const defaultConfig = {
          enabled: false,
          pinHash: null,
          salt: null,
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        };
        await this.saveConfig(defaultConfig);
      }
      
      SecurityUtils.logSecurityEvent('admin_auth_initialized', 'info', 'Admin authentication system initialized');
      return true;
    } catch (error) {
      SecurityUtils.logSecurityEvent('admin_auth_init_error', 'error', `Failed to initialize admin auth: ${error.message}`);
      return false;
    }
  }

  /**
   * Load admin configuration
   */
  async loadConfig() {
    try {
      if (!fs.existsSync(this.configPath)) {
        return null;
      }
      
      const content = await fs.promises.readFile(this.configPath, 'utf8');
      return SecurityUtils.safeParseJSON(content);
    } catch (error) {
      SecurityUtils.logSecurityEvent('admin_config_load_error', 'error', `Failed to load admin config: ${error.message}`);
      return null;
    }
  }

  /**
   * Save admin configuration
   */
  async saveConfig(config) {
    try {
      const content = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(this.configPath, content, { mode: 0o600 }); // Restrict permissions
      SecurityUtils.logSecurityEvent('admin_config_saved', 'info', 'Admin configuration saved');
      return true;
    } catch (error) {
      SecurityUtils.logSecurityEvent('admin_config_save_error', 'error', `Failed to save admin config: ${error.message}`);
      return false;
    }
  }

  /**
   * Set up admin PIN
   */
  async setupPin(pin) {
    try {
      // Validate PIN format (4 digits)
      if (!/^\d{4}$/.test(pin)) {
        throw new Error('PIN must be exactly 4 digits');
      }

      // Generate salt and hash
      const salt = crypto.randomBytes(32).toString('hex');
      const pinHash = this.hashPin(pin, salt);

      const config = {
        enabled: true,
        pinHash,
        salt,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      const success = await this.saveConfig(config);
      if (success) {
        SecurityUtils.logSecurityEvent('admin_pin_setup', 'info', 'Admin PIN configured successfully');
      }
      return success;
    } catch (error) {
      SecurityUtils.logSecurityEvent('admin_pin_setup_error', 'error', `Failed to setup PIN: ${error.message}`);
      return false;
    }
  }

  /**
   * Hash PIN with salt
   */
  hashPin(pin, salt) {
    return crypto.pbkdf2Sync(pin, salt, 100000, 64, 'sha512').toString('hex');
  }

  /**
   * Verify PIN
   */
  async verifyPin(pin) {
    try {
      const config = await this.loadConfig();
      if (!config || !config.enabled) {
        return true; // No authentication required if not enabled
      }

      // Check for lockout
      const clientId = 'local'; // In a real app, this would be client IP or session ID
      if (this.isLockedOut(clientId)) {
        SecurityUtils.logSecurityEvent('admin_auth_lockout', 'warning', 'Authentication attempt during lockout period');
        return false;
      }

      // Validate PIN format
      if (!/^\d{4}$/.test(pin)) {
        this.recordFailedAttempt(clientId);
        SecurityUtils.logSecurityEvent('admin_auth_invalid_format', 'warning', 'Invalid PIN format attempted');
        return false;
      }

      // Verify PIN
      const pinHash = this.hashPin(pin, config.salt);
      const isValid = pinHash === config.pinHash;

      if (isValid) {
        this.clearFailedAttempts(clientId);
        SecurityUtils.logSecurityEvent('admin_auth_success', 'info', 'Admin authentication successful');
        return true;
      } else {
        this.recordFailedAttempt(clientId);
        SecurityUtils.logSecurityEvent('admin_auth_failure', 'warning', 'Admin authentication failed');
        return false;
      }
    } catch (error) {
      SecurityUtils.logSecurityEvent('admin_auth_error', 'error', `Authentication error: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if authentication is required
   */
  async isAuthRequired() {
    // Check if admin PIN is enabled in settings
    if (!this.settingsManager.isAdminPinEnabled()) {
      return false;
    }
    
    const config = await this.loadConfig();
    return config && config.enabled;
  }

  /**
   * Disable admin authentication
   */
  async disableAuth() {
    try {
      const config = await this.loadConfig();
      if (config) {
        config.enabled = false;
        config.lastModified = new Date().toISOString();
        const success = await this.saveConfig(config);
        if (success) {
          SecurityUtils.logSecurityEvent('admin_auth_disabled', 'info', 'Admin authentication disabled');
        }
        return success;
      }
      return true;
    } catch (error) {
      SecurityUtils.logSecurityEvent('admin_auth_disable_error', 'error', `Failed to disable auth: ${error.message}`);
      return false;
    }
  }

  /**
   * Record failed authentication attempt
   */
  recordFailedAttempt(clientId) {
    const now = Date.now();
    const attempts = this.failedAttempts.get(clientId) || [];
    
    // Remove old attempts (older than lockout duration)
    const recentAttempts = attempts.filter(time => now - time < this.lockoutDuration);
    recentAttempts.push(now);
    
    this.failedAttempts.set(clientId, recentAttempts);
  }

  /**
   * Clear failed attempts for client
   */
  clearFailedAttempts(clientId) {
    this.failedAttempts.delete(clientId);
  }

  /**
   * Check if client is locked out
   */
  isLockedOut(clientId) {
    const attempts = this.failedAttempts.get(clientId) || [];
    const now = Date.now();
    
    // Remove old attempts
    const recentAttempts = attempts.filter(time => now - time < this.lockoutDuration);
    this.failedAttempts.set(clientId, recentAttempts);
    
    return recentAttempts.length >= this.maxAttempts;
  }

  /**
   * Create authenticated session
   */
  createSession() {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.sessionTimeout;
    
    this.sessions.set(sessionId, {
      createdAt: Date.now(),
      expiresAt,
      lastActivity: Date.now()
    });
    
    SecurityUtils.logSecurityEvent('admin_session_created', 'info', 'Admin session created');
    return sessionId;
  }

  /**
   * Validate session
   */
  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    const now = Date.now();
    if (now > session.expiresAt) {
      this.sessions.delete(sessionId);
      SecurityUtils.logSecurityEvent('admin_session_expired', 'info', 'Admin session expired');
      return false;
    }
    
    // Update last activity
    session.lastActivity = now;
    return true;
  }

  /**
   * Destroy session
   */
  destroySession(sessionId) {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      SecurityUtils.logSecurityEvent('admin_session_destroyed', 'info', 'Admin session destroyed');
    }
    return deleted;
  }

  /**
   * Clean up expired sessions
   */
  cleanupSessions() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      SecurityUtils.logSecurityEvent('admin_sessions_cleaned', 'info', `Cleaned up ${cleaned} expired sessions`);
    }
  }
}

module.exports = AdminAuth;