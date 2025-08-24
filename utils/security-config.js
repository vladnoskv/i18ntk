/**
 * Security Configuration Utility
 * Provides secure configuration management for the i18n Management Toolkit
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecurityConfig {
    constructor() {
        this.configDir = path.resolve(__dirname, '..');
        this.configPath = path.join(this.configDir, 'security-config.json');
        this.securityDefaults = {
            pin: {
                minLength: 4,
                maxLength: 32,
                requireStrongPin: true,
                maxAttempts: 3,
                lockDuration: 300000, // 5 minutes
                algorithm: 'scrypt'
            },
            encryption: {
                algorithm: 'aes-256-gcm',
                keyLength: 32,
                ivLength: 12,
                authTagLength: 16
            },
            audit: {
                enabled: true,
                logLevel: 'info',
                retentionDays: 30
            }
        };
    }

    /**
     * Generate secure configuration with settings-based configuration
     */
    generateSecureConfig(settings = {}) {
        const config = {
            ...this.securityDefaults,
            secrets: {
                adminPin: settings.adminPin || null,
                encryptionKey: settings.encryptionKey || this.generateSecureKey(),
                jwtSecret: settings.jwtSecret || this.generateSecureKey()
            },
            security: {
                ...this.securityDefaults,
                environment: 'production',
                disableWeakPinWarning: settings.disableWeakPinWarning === true
            }
        };

        return config;
    }

    /**
     * Generate cryptographically secure random key
     */
    generateSecureKey(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Validate security configuration
     */
    validateSecurityConfig(config) {
        const errors = [];

        // PIN validation
        if (config.secrets?.adminPin) {
            if (config.secrets.adminPin.length < config.security.pin.minLength) {
                errors.push(`PIN must be at least ${config.security.pin.minLength} characters`);
            }
            if (this.isWeakPin(config.secrets.adminPin)) {
                errors.push('PIN appears to be weak - consider using a stronger PIN');
            }
        }

        // Encryption key validation
        if (config.secrets?.encryptionKey) {
            if (config.secrets.encryptionKey.length < 64) { // 32 bytes hex encoded
                errors.push('Encryption key must be at least 32 bytes (64 hex chars)');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if PIN is weak
     */
    isWeakPin(pin) {
        const weakPatterns = [
            /^\d{1,4}$/,           // Only 1-4 digits
            /^(.)\1+$/,           // All same characters
            '1234', '0000', '1111', '2222', '3333', '4444',
            '5555', '6666', '7777', '8888', '9999', 'password',
            'admin', 'root', '123456', '654321', 'qwerty'
        ];

        return weakPatterns.some(pattern => {
            if (typeof pattern === 'string') {
                return pin.toLowerCase().includes(pattern);
            }
            return pattern.test(pin);
        });
    }

    /**
     * Create secure configuration file
     */
    createSecureConfig() {
        const config = this.generateSecureConfig();
        const validation = this.validateSecurityConfig(config);

        if (!validation.valid) {
            throw new Error(`Invalid security configuration: ${validation.errors.join(', ')}`);
        }

        // Ensure config directory exists
        const configDir = path.dirname(this.configPath);
        if (!SecurityUtils.safeExistsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        // Remove actual secrets from config file (use env vars)
        const safeConfig = {
            ...config,
            secrets: {
                adminPin: config.secrets.adminPin ? '***' : null,
                encryptionKey: '***',
                jwtSecret: '***'
            }
        };

        SecurityUtils.safeWriteFileSync(this.configPath, JSON.stringify(safeConfig, null, 2));
        
        return {
            configPath: this.configPath,
            validation
        };
    }

    /**
     * Load and validate existing configuration
     */
    loadSecurityConfig() {
        if (!SecurityUtils.safeExistsSync(this.configPath)) {
            return this.createSecureConfig();
        }

        try {
            const config = JSON.parse(SecurityUtils.safeReadFileSync(this.configPath, 'utf8'));
            const validation = this.validateSecurityConfig(config);
            
            return {
                config,
                validation,
                configPath: this.configPath
            };
        } catch (error) {
            throw new Error(`Failed to load security configuration: ${error.message}`);
        }
    }

    /**
     * Rotate encryption keys (advanced operation)
     */
    rotateEncryptionKeys() {
        console.warn('⚠️  Key rotation is an advanced operation. Ensure you have backups.');
        
        const newKey = this.generateSecureKey();
        const timestamp = new Date().toISOString();
        
        // Create backup of old config
        if (SecurityUtils.safeExistsSync(this.configPath)) {
            fs.copyFileSync(this.configPath, `${this.configPath}.backup.${timestamp}`);
        }

        // Update configuration with new keys
        const config = this.generateSecureConfig();
        config.secrets.encryptionKey = newKey;
        config.secrets.jwtSecret = this.generateSecureKey();
        config.lastKeyRotation = timestamp;

        this.createSecureConfig();
        
        return {
            oldKeyBackup: `${this.configPath}.backup.${timestamp}`,
            newKeysGenerated: true,
            timestamp
        };
    }
}

// Export for benchmark usage
async function validateConfiguration(config) {
  const validator = new SecurityConfig();
  
  // Simulate validation processing
  const start = Date.now();
  
  // Basic validation for benchmark purposes
  const errors = [];
  
  if (!config.languages || !Array.isArray(config.languages) || config.languages.length === 0) {
    errors.push('languages must be a non-empty array');
  }
  
  if (!config.sourceDir || typeof config.sourceDir !== 'string') {
    errors.push('sourceDir must be a string');
  }
  
  if (config.adminPin && typeof config.adminPin !== 'string') {
    errors.push('adminPin must be a string');
  }
  
  // Simulate processing delay based on config complexity
  const complexity = (config.languages?.length || 0) * 2;
  await new Promise(resolve => setTimeout(resolve, complexity));
  
  const end = Date.now();
  
  return {
    valid: errors.length === 0,
    errors,
    validationTime: end - start
  };
}

module.exports = {
  SecurityConfig,
  validateConfiguration
};