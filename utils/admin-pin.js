/**
 * Admin PIN Management System
 * Handles secure PIN creation, validation, and storage
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getGlobalReadline, ask } = require('./cli');
const { promptPin: rawPromptPin, promptPinConfirm } = require('./promptPin');

// Lazy load i18n to prevent initialization race conditions
let i18n;
function getI18n() {
  if (!i18n) {
    try {
      i18n = require('./i18n-helper');
    } catch (error) {
      // Fallback to simple identity function if i18n fails to load
      console.warn('i18n-helper not available, using fallback messages');
      return { t: (key, params = {}) => key };
    }
  }
  return i18n;
}

// Use environment variables for configuration
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const MEMORY_COST = 2 ** 16; // 64MB
const TIME_COST = 3;
const PARALLELISM = 1;
const ALGORITHM = 'argon2id';

class AdminPinManager {
    constructor() {
        this.pinFile = path.join(__dirname, '..', 'settings', 'admin-pin.json');
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 16;
        this.tagLength = 16;
        
        // Session management
        this.isAuthenticated = false;
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
        this.sessionTimer = null;
        this.lastActivity = null;
    }

    /**
     * Generate a random key for encryption (AES-256-GCM)
     * Returns a 32-byte (256-bit) key for AES-256-GCM
     */
    generateKey() {
        return crypto.randomBytes(32);
    }

    /**
     * Generate secure random IV for AES-256-GCM
     * GCM requires 96-bit (12-byte) IV for optimal security
     */
    generateIV() {
        return crypto.randomBytes(12);
    }

    /**
     * Encrypt the PIN using AES-256-GCM with proper authentication
     */
    encryptPin(pin, key) {
        const iv = this.generateIV();
        const cipher = crypto.createCipherGCM('aes-256-gcm', key);
        cipher.setAAD(Buffer.from('admin-pin-v1')); // Additional authenticated data
        
        let encrypted = cipher.update(pin, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    /**
     * Decrypt the PIN using AES-256-GCM with authentication verification
     */
    decryptPin(encryptedData, key) {
        try {
            const iv = Buffer.from(encryptedData.iv, 'hex');
            const authTag = Buffer.from(encryptedData.authTag || encryptedData.tag, 'hex');
            
            const decipher = crypto.createDecipherGCM('aes-256-gcm', key);
            decipher.setAuthTag(authTag);
            decipher.setAAD(Buffer.from('admin-pin-v1'));
            
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            return null;
        }
    }

    /**
     * Hash PIN using secure password hashing
     * Uses crypto.scrypt as a secure alternative to argon2
     */
    async hashPin(pin, salt = null) {
        if (!salt) {
            salt = crypto.randomBytes(32);
        } else if (typeof salt === 'string') {
            salt = Buffer.from(salt, 'hex');
        }

        try {
            // Use scrypt (Node.js built-in, more secure than pbkdf2)
            const hash = crypto.scryptSync(pin, salt, 32, {
                N: 16384, // CPU/memory cost parameter
                r: 8,     // block size parameter
                p: 1      // parallelization parameter
            });
            return {
                hash: hash.toString('hex'),
                salt: salt.toString('hex'),
                algorithm: 'scrypt'
            };
        } catch (error) {
            // Fallback to pbkdf2
            const hash = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256');
            return {
                hash: hash.toString('hex'),
                salt: salt.toString('hex'),
                algorithm: 'pbkdf2'
            };
        }
    }

    /**
     * Check if PIN is weak/common
     */
    isWeakPin(pin) {
        const weakPins = [
            '1234', '0000', '1111', '2222', '3333', '4444', '5555',
            '6666', '7777', '8888', '9999', '123456', '654321',
            '000000', '111111', '121212', '112233', '12345',
        ];
        
        return weakPins.includes(pin) || 
               /^(.)\1+$/.test(pin);     // All same characters
    }

    /**
     * Set up a new admin PIN with security checks
     */
    async setupPin(externalRl = null) {
        // Use shared readline interface
        const hadGlobal = !!global.activeReadlineInterface;
        const rl = externalRl || getGlobalReadline();
        const shouldCloseRL = !externalRl && !hadGlobal;

        try {
            const i18nHelper = getI18n();
            console.log('\n' + i18nHelper.t('adminPin.setup_title'));
            console.log(i18nHelper.t('adminPin.setup_separator'));
            console.log(i18nHelper.t('adminPin.setup_description'));
            console.log(i18nHelper.t('adminPin.required_for_title'));
            console.log(i18nHelper.t('adminPin.required_for_1'));
            console.log(i18nHelper.t('adminPin.required_for_2'));
            console.log(i18nHelper.t('adminPin.required_for_3'));
            console.log(i18nHelper.t('adminPin.required_for_4'));
            console.log('\n' + i18nHelper.t('adminPin.setup_note'));
            console.log(i18nHelper.t('adminPin.setup_digits_only'));
            
            const pin = await promptPinConfirm(rl, i18nHelper.t('adminPin.enter_new_pin'), i18n.t('adminPin.confirm_pin'));

            if (!this.validatePin(pin)) {
                console.log(i18nHelper.t('adminPin.invalid_pin_length'));
                console.log(i18nHelper.t('adminPin.invalid_pin_example'));
                if (shouldCloseRL) rl.close();
                return false;
            }

            if (this.isWeakPin(pin)) {
                console.log(i18nHelper.t('adminPin.weak_pin_warning'));
                console.log(i18nHelper.t('adminPin.weak_pin_suggestion'));
                const proceed = await new Promise(resolve => {
                    rl.question(i18nHelper.t('adminPin.use_anyway_prompt'), resolve);
                });
                if (proceed.toLowerCase() !== 'yes') {
                    if (shouldCloseRL) rl.close();
                    return false;
                }
            }
            
            // Generate encryption key and encrypt PIN
            const key = this.generateKey();
            const encryptedPin = this.encryptPin(pin, key);
            const hashedPin = await this.hashPin(pin);
            
            // Store encrypted data
            const pinData = {
                hash: hashedPin.hash,
                salt: hashedPin.salt,
                algorithm: hashedPin.algorithm,
                encrypted: encryptedPin,
                key: key.toString('hex'),
                created: new Date().toISOString(),
                lastChanged: new Date().toISOString(),
                attempts: 0,
                locked: false
            };
            
            // Ensure settings directory exists
            const settingsDir = path.dirname(this.pinFile);
            if (!SecurityUtils.safeExistsSync(settingsDir)) {
                fs.mkdirSync(settingsDir, { recursive: true });
            }
            
            SecurityUtils.safeWriteFileSync(this.pinFile, JSON.stringify(pinData, null, 2));
            
            const i18n = getI18n();
                console.log(i18n.t('adminPin.setup_success'));
                console.log(i18n.t('adminPin.setup_warning'));
                
                if (shouldCloseRL) rl.close();
                return true;
                
            } catch (error) {
                const i18n = getI18n();
                console.error(i18n.t('adminPin.setup_error'), error.message);
            if (shouldCloseRL) rl.close();
            return false;
        }
    }

    /**
     * Prompt for PIN with configurable display mode
     */
    promptPin(rl, message, hideInput = false) {
        return hideInput ? rawPromptPin({ rl, label: message }) : ask(message);
    }

    /**
     * Validate PIN format
     */
    validatePin(pin) {
        return /^\d{4,6}$/.test(pin);
    }

    /**
     * Check if PIN is set
     */
    isPinSet() {
        return SecurityUtils.safeExistsSync(this.pinFile);
    }

    /**
     * Start authentication session
     */
    startSession() {
        this.isAuthenticated = true;
        this.lastActivity = Date.now();
        
        // Clear existing timer
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        
        // Set new timeout
        this.sessionTimer = setTimeout(() => {
            this.endSession();
            console.log(i18n.t('adminPin.session_expired'));
        }, this.sessionTimeout);
    }
    
    /**
     * End authentication session
     */
    endSession() {
        this.isAuthenticated = false;
        this.lastActivity = null;
        
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }
    
    /**
     * Check if currently authenticated
     */
    isCurrentlyAuthenticated() {
        if (!this.isAuthenticated) {
            return false;
        }
        
        // Check if session has expired
        if (this.lastActivity && (Date.now() - this.lastActivity) > this.sessionTimeout) {
            this.endSession();
            return false;
        }
        
        // Update last activity
        this.lastActivity = Date.now();
        return true;
    }
    
    /**
     * Require authentication (with session support)
     */
    async requireAuth(forceSetup = false) {
        // Check if already authenticated in current session
        if (this.isCurrentlyAuthenticated()) {
            return true;
        }
        
        // Need to authenticate
        const authenticated = await this.verifyPin(forceSetup);
        if (authenticated) {
            this.startSession();
        }
        
        return authenticated;
    }

    /**
     * Constant-time comparison for PIN verification
     * Prevents timing attacks
     */
    constantTimeCompare(a, b) {
        if (typeof a !== 'string' || typeof b !== 'string') {
            return false;
        }
        if (a.length !== b.length) {
            return false;
        }
        
        try {
            return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
        } catch (error) {
            // Fallback to manual constant-time comparison
            let result = 0;
            for (let i = 0; i < a.length; i++) {
                result |= a.charCodeAt(i) ^ b.charCodeAt(i);
            }
            return result === 0;
        }
    }

    /**
     * Verify admin PIN with secure hashing and constant-time comparison
     */
    async verifyPin(forceSetup = false, externalRl = null) {
        if (!this.isPinSet()) {
            if (forceSetup) {
                const i18n = getI18n();
                console.log(i18n.t('adminPin.no_pin_set_setting_up'));
                return await this.setupPin(externalRl);
            } else {
                const i18n = getI18n();
                console.log(i18n.t('adminPin.no_pin_configured_access_denied'));
                console.log(i18n.t('adminPin.use_admin_settings_to_set_pin'));
                return false;
            }
        }

        // Use shared readline interface if available
        const hadGlobal = !!global.activeReadlineInterface;
        const rl = externalRl || getGlobalReadline();
        const shouldCloseRL = !externalRl && !hadGlobal;

        try {
            const pinData = JSON.parse(SecurityUtils.safeReadFileSync(this.pinFile, 'utf8'));
            
            if (pinData.locked) {
                const i18n = getI18n();
                console.log(i18n.t('adminPin.locked_out'));
                console.log(i18n.t('adminPin.wait_before_retry'));
                if (shouldCloseRL) rl.close();
                return false;
            }
            
            const enteredPin = await this.promptPin(rl, getI18n().t('adminCli.enterPin'), true);
            
            // Recompute hash with stored salt
            const salt = Buffer.from(pinData.salt, 'hex');
            let computedHash;
            
            if (pinData.algorithm === 'scrypt') {
                computedHash = crypto.scryptSync(enteredPin, salt, 32, {
                    N: 16384,
                    r: 8,
                    p: 1
                });
            } else {
                computedHash = crypto.pbkdf2Sync(enteredPin, salt, 100000, 32, 'sha256');
            }
            
            const computedHashHex = computedHash.toString('hex');
            
            // Use constant-time comparison
            if (this.constantTimeCompare(computedHashHex, pinData.hash)) {
                // Reset attempts on successful login
                pinData.attempts = 0;
                SecurityUtils.safeWriteFileSync(this.pinFile, JSON.stringify(pinData, null, 2));
                
                const i18n = getI18n();
                console.log(i18n.t('adminPin.access_granted'));
                if (shouldCloseRL) rl.close();
                return true;
            } else {
                pinData.attempts = (pinData.attempts || 0) + 1;
                
                if (pinData.attempts >= 3) {
                    pinData.locked = true;
                    setTimeout(() => {
                        pinData.locked = false;
                        pinData.attempts = 0;
                        SecurityUtils.safeWriteFileSync(this.pinFile, JSON.stringify(pinData, null, 2));
                    }, 5 * 60 * 1000); // 5 minutes
                }
                
                SecurityUtils.safeWriteFileSync(this.pinFile, JSON.stringify(pinData, null, 2));
                
                const i18n = getI18n();
                console.log(i18n.t('adminPin.incorrect_pin', { attempts: 3 - pinData.attempts }));
                if (shouldCloseRL) rl.close();
                return false;
            }
            
        } catch (error) {
            const i18n = getI18n();
            console.error(i18n.t('adminPin.verify_pin_error'), error.message);
            if (shouldCloseRL) rl.close();
            return false;
        }
    }

    /**
     * Prompt user for optional PIN setup
     */
    async promptOptionalSetup() {
        if (this.isPinSet()) {
            console.log(i18n.t('adminPin.already_configured'));
            return true;
        }

        // Use shared readline interface if available
        const hadGlobal = !!global.activeReadlineInterface;
        const rl = getGlobalReadline();
        const shouldCloseRL = !hadGlobal;

        try {
            const i18n = getI18n();
            console.log(i18n.t('adminPin.optional_setup_title'));
            console.log(i18n.t('adminPin.setup_separator'));
            console.log(i18n.t('adminPin.optional_setup_description'));
            console.log(i18n.t('adminPin.required_for_1'));
            console.log(i18n.t('adminPin.required_for_2'));
            console.log(i18n.t('adminPin.required_for_3'));
            console.log(i18n.t('adminPin.required_for_4'));
            console.log('');
            
            const response = await new Promise(resolve => {
                rl.question(getI18n().t('adminPin.setup_prompt'), resolve);
            });
            
            if (shouldCloseRL) rl.close();
            
            if (response.toLowerCase() === 'y' || response.toLowerCase() === 'yes') {
                return await this.setupPin();
            } else {
                console.log(getI18n().t('adminPin.skipping_setup'));
                return false;
            }
        } catch (error) {
            if (shouldCloseRL) rl.close();
            console.error(getI18n().t('adminPin.setup_prompt_error'), error.message);
            return false;
        }
    }

    /**
     * Get PIN display (masked)
     */
    getPinDisplay() {
        if (!this.isPinSet()) {
            return i18n.t('adminPin.not_set');
        }
        
        try {
            const pinData = JSON.parse(SecurityUtils.safeReadFileSync(this.pinFile, 'utf8'));
            const key = Buffer.from(pinData.key, 'hex');
            const decryptedPin = this.decryptPin(pinData.encrypted, key);
            
            if (decryptedPin) {
                return '*'.repeat(decryptedPin.length);
            }
        } catch (error) {
            // Ignore errors, return default
        }
        
        return i18n.t('adminPin.pin_display_mask');
    }

    /**
     * Reset PIN
     */
    async resetPin() {
        if (SecurityUtils.safeExistsSync(this.pinFile)) {
            fs.unlinkSync(this.pinFile);
        }
        return await this.setupPin();
    }
}

module.exports = AdminPinManager;