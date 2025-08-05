/**
 * Admin PIN Management System
 * Handles secure PIN creation, validation, and storage
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const i18n = require('./i18n-helper');

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
        const rl = externalRl || readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        try {
            console.log('\n' + i18n.t('adminPin.setup_title'));
            console.log(i18n.t('adminPin.setup_separator'));
            console.log(i18n.t('adminPin.setup_description'));
            console.log(i18n.t('adminPin.required_for_title'));
            console.log(i18n.t('adminPin.required_for_1'));
            console.log(i18n.t('adminPin.required_for_2'));
            console.log(i18n.t('adminPin.required_for_3'));
            console.log(i18n.t('adminPin.required_for_4'));
            console.log('\n' + i18n.t('adminPin.setup_note'));
            console.log(i18n.t('adminPin.setup_digits_only'));
            
            const pin = await this.promptPin(rl, i18n.t('adminPin.enter_new_pin'), false);
            
            if (!this.validatePin(pin)) {
                console.log(i18n.t('adminPin.invalid_pin_length'));
                console.log(i18n.t('adminPin.invalid_pin_example'));
                if (!externalRl) rl.close();
                return false;
            }

            if (this.isWeakPin(pin)) {
                console.log(i18n.t('adminPin.weak_pin_warning'));
                console.log(i18n.t('adminPin.weak_pin_suggestion'));
                const proceed = await new Promise(resolve => {
                    rl.question(i18n.t('adminPin.use_anyway_prompt'), resolve);
                });
                if (proceed.toLowerCase() !== 'yes') {
                    if (!externalRl) rl.close();
                    return false;
                }
            }
            
            const confirmPin = await this.promptPin(rl, i18n.t('adminPin.confirm_pin'), false);
            
            if (pin !== confirmPin) {
                console.log(i18n.t('adminPin.pins_do_not_match'));
                if (!externalRl) rl.close();
                return false;
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
            if (!fs.existsSync(settingsDir)) {
                fs.mkdirSync(settingsDir, { recursive: true });
            }
            
            fs.writeFileSync(this.pinFile, JSON.stringify(pinData, null, 2));
            
            console.log(i18n.t('adminPin.setup_success'));
            console.log(i18n.t('adminPin.setup_warning'));
            
            if (!externalRl) rl.close();
            return true;
            
        } catch (error) {
            console.error(i18n.t('adminPin.setup_error'), error.message);
            if (!externalRl) rl.close();
            return false;
        }
    }

    /**
     * Prompt for PIN with configurable display mode
     */
    promptPin(rl, message, hideInput = true) {
        return new Promise((resolve) => {
            process.stdout.write(message);
            
            let pin = '';
            
            const onData = (char) => {
                const charStr = char.toString();
                
                if (charStr === '\r' || charStr === '\n') {
                    if (hideInput) {
                        process.stdin.setRawMode(false);
                    }
                    process.stdin.removeListener('data', onData);
                    process.stdout.write('\n');
                    resolve(pin);
                } else if (charStr === '\u0008' || charStr === '\u007f') {
                    // Backspace
                    if (pin.length > 0) {
                        pin = pin.slice(0, -1);
                        if (hideInput) {
                            process.stdout.write('\b \b');
                        } else {
                            process.stdout.write('\b \b');
                        }
                    }
                } else if (/^[0-9]$/.test(charStr) && pin.length < 6) {
                    // Only allow digits 0-9, max 6 digits
                    pin += charStr;
                    if (hideInput) {
                        process.stdout.write('*');
                    } else {
                        process.stdout.write(charStr);
                    }
                }
                // Ignore all other characters
            };
            
            if (hideInput) {
                process.stdin.setRawMode(true);
            }
            process.stdin.on('data', onData);
        });
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
        return fs.existsSync(this.pinFile);
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
                console.log(i18n.t('adminPin.no_pin_set_setting_up'));
                return await this.setupPin(externalRl);
            } else {
                console.log(i18n.t('adminPin.no_pin_configured_access_denied'));
                console.log(i18n.t('adminPin.use_admin_settings_to_set_pin'));
                return false;
            }
        }

        const rl = externalRl || readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        try {
            const pinData = JSON.parse(fs.readFileSync(this.pinFile, 'utf8'));
            
            if (pinData.locked) {
                console.log(i18n.t('adminPin.locked_out'));
                console.log(i18n.t('adminPin.wait_before_retry'));
                if (!externalRl) rl.close();
                return false;
            }
            
            const enteredPin = await this.promptPin(rl, i18n.t('adminCli.enterPin'));
            
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
                fs.writeFileSync(this.pinFile, JSON.stringify(pinData, null, 2));
                
                console.log(i18n.t('adminPin.access_granted'));
                if (!externalRl) rl.close();
                return true;
            } else {
                pinData.attempts = (pinData.attempts || 0) + 1;
                
                if (pinData.attempts >= 3) {
                    pinData.locked = true;
                    setTimeout(() => {
                        pinData.locked = false;
                        pinData.attempts = 0;
                        fs.writeFileSync(this.pinFile, JSON.stringify(pinData, null, 2));
                    }, 5 * 60 * 1000); // 5 minutes
                }
                
                fs.writeFileSync(this.pinFile, JSON.stringify(pinData, null, 2));
                
                console.log(i18n.t('adminPin.incorrect_pin', { attempts: 3 - pinData.attempts }));
                if (!externalRl) rl.close();
                return false;
            }
            
        } catch (error) {
            console.error(i18n.t('adminPin.verify_pin_error'), error.message);
            if (!externalRl) rl.close();
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

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        try {
            console.log(i18n.t('adminPin.optional_setup_title'));
            console.log(i18n.t('adminPin.setup_separator'));
            console.log(i18n.t('adminPin.optional_setup_description'));
            console.log(i18n.t('adminPin.required_for_1'));
            console.log(i18n.t('adminPin.required_for_2'));
            console.log(i18n.t('adminPin.required_for_3'));
            console.log(i18n.t('adminPin.required_for_4'));
            console.log('');
            
            const response = await new Promise(resolve => {
                rl.question(i18n.t('adminPin.setup_prompt'), resolve);
            });
            
            rl.close();
            
            if (response.toLowerCase() === 'y' || response.toLowerCase() === 'yes') {
                return await this.setupPin();
            } else {
                console.log(i18n.t('adminPin.skipping_setup'));
                return false;
            }
        } catch (error) {
            rl.close();
            console.error(i18n.t('adminPin.setup_prompt_error'), error.message);
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
            const pinData = JSON.parse(fs.readFileSync(this.pinFile, 'utf8'));
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
        if (fs.existsSync(this.pinFile)) {
            fs.unlinkSync(this.pinFile);
        }
        return await this.setupPin();
    }
}

module.exports = AdminPinManager;