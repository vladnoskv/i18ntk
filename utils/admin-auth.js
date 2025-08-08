const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SecurityUtils = require('./security');
const configManager = require('./config-manager');

/**
 * Admin Authentication Module
 * Provides secure PIN-based authentication for administrative operations
 */
class AdminAuth {
  constructor() {
    this.configPath = path.join(process.cwd(), 'settings', '.i18n-admin-config.json');

    // Get settings from config manager
    const securitySettings = configManager.getConfig().security || {};
    this.sessionTimeout = (securitySettings.sessionTimeout || 30) * 60 * 1000; // Convert minutes to milliseconds
    this.maxAttempts = securitySettings.maxFailedAttempts || 3;
    this.lockoutDuration = (securitySettings.lockoutDuration || 15) * 60 * 1000; // Convert minutes to milliseconds
    this.keepAuthenticatedUntilExit = securitySettings.keepAuthenticatedUntilExit !== false;
    
    this.activeSessions = new Map();
    this.failedAttempts = new Map();
    this.lockouts = new Map();
    this.currentSession = null;
    this.sessionStartTime = null;
    
    // Clean up expired sessions every 5 minutes
    this.cleanupInterval = setInterval(this.cleanupExpiredSessions.bind(this), 5 * 60 * 1000);
    
    // Handle process exit to ensure session cleanup
    this.setupProcessHandlers();
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
     * Cleanup resources and stop intervals
     */
    async cleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
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
      // Validate PIN format (4-6 digits)
      if (!/^\d{4,6}$/.test(pin)) {
        throw new Error('PIN must be 4-6 digits');
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
      if (!/^\d{4,6}$/.test(pin)) {
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
   * Check if admin PIN is configured
   */
  async isPinConfigured() {
    const config = await this.loadConfig();
    return config && config.enabled && config.pinHash;
  }

  /**
   * Check if authentication is required
   */
  async isAuthRequired() {
    // Check if admin PIN is enabled in settings
    if (!(configManager.getConfig().security?.adminPinEnabled)) {
      return false;
    }
    
    const config = await this.loadConfig();
    return config && config.enabled;
  }

  /**
   * Check if authentication is required for a specific script
   */
  async isAuthRequiredForScript(scriptName) {
    // Check if admin PIN is enabled globally
    if (!(configManager.getConfig().security?.adminPinEnabled)) {
      return false;
    }

    // Check if admin PIN is actually configured
    const config = await this.loadConfig();
    if (!config || !config.enabled || !config.pinHash) {
      return false; // Don't require PIN if admin PIN is not configured
    }

    // Check if PIN protection is enabled
    const pinProtection = configManager.getConfig().security?.pinProtection;
    if (!pinProtection || !pinProtection.enabled) {
      return false; // Don't require PIN if protection is disabled
    }

    // Check if this specific script requires protection
    const protectedScripts = pinProtection.protectedScripts || {};
    return protectedScripts[scriptName] !== false; // Default to true if not explicitly set
  }

  /**
   * Setup process handlers for session cleanup
   */
  setupProcessHandlers() {
    const cleanup = () => {
      this.clearCurrentSession();
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
    };

    // Handle various exit scenarios
    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(0);
    });
    process.on('uncaughtException', (error) => {
      SecurityUtils.logSecurityEvent('uncaught_exception', 'error', error.message);
      cleanup();
      process.exit(1);
    });
  }

  /**
   * Create a new authenticated session
   */
  async createSession(sessionId = null) {
    if (!sessionId) {
      sessionId = this.generateSessionId();
    }
    
    const session = {
      id: sessionId,
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      expires: new Date(Date.now() + this.sessionTimeout).toISOString()
    };
    
    this.activeSessions.set(sessionId, session);
    this.currentSession = session;
    this.sessionStartTime = new Date();
    
    SecurityUtils.logSecurityEvent('session_created', 'info', `Session ${sessionId} created`);
    return sessionId;
  }

  /**
   * Validate current session
   */
  async validateSession(sessionId) {
    if (!sessionId || !this.currentSession) {
      return false;
    }
    
    if (sessionId !== this.currentSession.id) {
      return false;
    }
    
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.clearCurrentSession();
      return false;
    }
    
    const now = new Date();
    const expires = new Date(session.expires);
    
    if (now > expires) {
      this.activeSessions.delete(sessionId);
      this.clearCurrentSession();
      SecurityUtils.logSecurityEvent('session_expired', 'info', `Session ${sessionId} expired`);
      return false;
    }
    
    // Update last activity
    session.lastActivity = now.toISOString();
    session.expires = new Date(now.getTime() + this.sessionTimeout).toISOString();
    this.activeSessions.set(sessionId, session);
    
    return true;
  }

  /**
   * Clear current session
   */
  clearCurrentSession() {
    if (this.currentSession) {
      this.activeSessions.delete(this.currentSession.id);
      SecurityUtils.logSecurityEvent('session_cleared', 'info', `Session ${this.currentSession.id} cleared`);
    }
    this.currentSession = null;
    this.sessionStartTime = null;
  }

  /**
   * Check if currently authenticated
   */
  isCurrentlyAuthenticated() {
    return this.currentSession !== null;
  }

  /**
   * Get current session info
   */
  getCurrentSessionInfo() {
    if (!this.currentSession) {
      return null;
    }
    
    return {
      sessionId: this.currentSession.id,
      started: this.sessionStartTime,
      expires: new Date(this.currentSession.expires),
      duration: Date.now() - this.sessionStartTime.getTime()
    };
  }

  /**
   * Generate secure session ID
   */
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Disable admin authentication (completely removes PIN)
   */
  async disableAuth() {
    try {
      const config = await this.loadConfig();
      if (config) {
        config.enabled = false;
        config.pinHash = null;
        config.salt = null;
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
   * Disable PIN protection (keeps PIN for future re-enable)
   */
  async disablePinProtection() {
    try {
      const config = await this.loadConfig();
      if (config) {
        config.enabled = false;
        config.lastModified = new Date().toISOString();
        const success = await this.saveConfig(config);
        if (success) {
          SecurityUtils.logSecurityEvent('pin_protection_disabled', 'info', 'PIN protection disabled (PIN retained)');
        }
        return success;
      }
      return true;
    } catch (error) {
      SecurityUtils.logSecurityEvent('pin_protection_disable_error', 'error', `Failed to disable PIN protection: ${error.message}`);
      return false;
    }
  }

  /**
   * Enable PIN protection (requires PIN to be already set)
   */
  async enablePinProtection() {
    try {
      const config = await this.loadConfig();
      if (config && config.pinHash) {
        config.enabled = true;
        config.lastModified = new Date().toISOString();
        const success = await this.saveConfig(config);
        if (success) {
          SecurityUtils.logSecurityEvent('pin_protection_enabled', 'info', 'PIN protection enabled');
        }
        return success;
      }
      return false;
    } catch (error) {
      SecurityUtils.logSecurityEvent('pin_protection_enable_error', 'error', `Failed to enable PIN protection: ${error.message}`);
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
    
    this.activeSessions.set(sessionId, {
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
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    const now = Date.now();
    if (now > session.expiresAt) {
      this.activeSessions.delete(sessionId);
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
    const deleted = this.activeSessions.delete(sessionId);
    if (deleted) {
      SecurityUtils.logSecurityEvent('admin_session_destroyed', 'info', 'Admin session destroyed');
    }
    return deleted;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now > session.expiresAt) {
        this.activeSessions.delete(sessionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      SecurityUtils.logSecurityEvent('admin_sessions_cleaned', 'info', `Cleaned up ${cleaned} expired sessions`);
    }
  }

  /**
   * Clean up expired sessions (alias for backward compatibility)
   */
  cleanupSessions() {
    return this.cleanupExpiredSessions();
  }
}

module.exports = AdminAuth;