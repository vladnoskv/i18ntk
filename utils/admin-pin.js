/**
 * Admin PIN Management System
 * Handles secure PIN creation, validation, and storage
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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
     * Generate a random key for encryption
     */
    generateKey() {
        return crypto.randomBytes(this.keyLength);
    }

    /**
     * Encrypt the PIN
     */
    encryptPin(pin, key) {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, key, iv);
        
        let encrypted = cipher.update(pin, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const tag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            tag: tag.toString('hex')
        };
    }

    /**
     * Decrypt the PIN
     */
    decryptPin(encryptedData, key) {
        try {
            const decipher = crypto.createDecipheriv(this.algorithm, key, Buffer.from(encryptedData.iv, 'hex'));
            decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
            
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            return null;
        }
    }

    /**
     * Hash PIN for verification
     */
    hashPin(pin) {
        return crypto.createHash('sha256').update(pin).digest('hex');
    }

    /**
     * Set up a new admin PIN
     */
    async setupPin() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        try {
            console.log('\n🔐 Admin PIN Setup');
            console.log('============================================================');
            console.log('Create a 4-6 digit PIN for admin access to sensitive settings.');
            console.log('This PIN will be required for:');
            console.log('  • Changing security settings');
            console.log('  • Modifying advanced configurations');
            console.log('  • Accessing debug tools');
            console.log('  • Resetting settings');
            
            const pin = await this.promptPin(rl, 'Enter new admin PIN (4-6 digits): ');
            
            if (!this.validatePin(pin)) {
                console.log('❌ Invalid PIN. Must be 4-6 digits.');
                rl.close();
                return false;
            }
            
            const confirmPin = await this.promptPin(rl, 'Confirm admin PIN: ');
            
            if (pin !== confirmPin) {
                console.log('❌ PINs do not match.');
                rl.close();
                return false;
            }
            
            // Generate encryption key and encrypt PIN
            const key = this.generateKey();
            const encryptedPin = this.encryptPin(pin, key);
            const hashedPin = this.hashPin(pin);
            
            // Store encrypted data
            const pinData = {
                hash: hashedPin,
                encrypted: encryptedPin,
                key: key.toString('hex'),
                created: new Date().toISOString(),
                attempts: 0,
                locked: false
            };
            
            // Ensure settings directory exists
            const settingsDir = path.dirname(this.pinFile);
            if (!fs.existsSync(settingsDir)) {
                fs.mkdirSync(settingsDir, { recursive: true });
            }
            
            fs.writeFileSync(this.pinFile, JSON.stringify(pinData, null, 2));
            
            console.log('✅ Admin PIN has been set successfully!');
            console.log('⚠️  Keep this PIN secure. It cannot be recovered if lost.');
            
            rl.close();
            return true;
            
        } catch (error) {
            console.error('❌ Error setting up PIN:', error.message);
            rl.close();
            return false;
        }
    }

    /**
     * Prompt for PIN with hidden input
     */
    promptPin(rl, message) {
        return new Promise((resolve) => {
            process.stdout.write(message);
            
            // Hide input
            process.stdin.setRawMode(true);
            let pin = '';
            
            const onData = (char) => {
                const charStr = char.toString();
                
                if (charStr === '\r' || charStr === '\n') {
                    process.stdin.setRawMode(false);
                    process.stdin.removeListener('data', onData);
                    process.stdout.write('\n');
                    resolve(pin);
                } else if (charStr === '\u0008' || charStr === '\u007f') {
                    // Backspace
                    if (pin.length > 0) {
                        pin = pin.slice(0, -1);
                        process.stdout.write('\b \b');
                    }
                } else if (charStr >= '0' && charStr <= '9') {
                    pin += charStr;
                    process.stdout.write('*');
                }
            };
            
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
            console.log('\n⏰ Admin session expired due to inactivity.');
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
     * Verify admin PIN
     */
    async verifyPin(forceSetup = false) {
        if (!this.isPinSet()) {
            if (forceSetup) {
                console.log('⚠️  No admin PIN set. Setting up PIN...');
                return await this.setupPin();
            } else {
                console.log('⚠️  No admin PIN configured. Access denied.');
                console.log('💡 Use the admin settings to set up a PIN first.');
                return false;
            }
        }

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        try {
            const pinData = JSON.parse(fs.readFileSync(this.pinFile, 'utf8'));
            
            if (pinData.locked) {
                console.log('🔒 Admin access is locked due to too many failed attempts.');
                console.log('Please wait 5 minutes before trying again.');
                rl.close();
                return false;
            }
            
            const enteredPin = await this.promptPin(rl, '🔐 Enter admin PIN: ');
            const hashedEnteredPin = this.hashPin(enteredPin);
            
            if (hashedEnteredPin === pinData.hash) {
                // Reset attempts on successful login
                pinData.attempts = 0;
                fs.writeFileSync(this.pinFile, JSON.stringify(pinData, null, 2));
                
                console.log('✅ Admin access granted.');
                rl.close();
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
                
                console.log(`❌ Incorrect PIN. ${3 - pinData.attempts} attempts remaining.`);
                rl.close();
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error verifying PIN:', error.message);
            rl.close();
            return false;
        }
    }

    /**
     * Prompt user for optional PIN setup
     */
    async promptOptionalSetup() {
        if (this.isPinSet()) {
            console.log('✅ Admin PIN is already configured.');
            return true;
        }

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        try {
            console.log('\n🔐 Admin PIN Setup (Optional)');
            console.log('============================================================');
            console.log('Admin PIN protection adds security for sensitive operations like:');
            console.log('  • Changing security settings');
            console.log('  • Modifying advanced configurations');
            console.log('  • Accessing debug tools');
            console.log('  • Resetting settings');
            console.log('');
            
            const response = await new Promise(resolve => {
                rl.question('Would you like to set up an admin PIN? (y/N): ', resolve);
            });
            
            rl.close();
            
            if (response.toLowerCase() === 'y' || response.toLowerCase() === 'yes') {
                return await this.setupPin();
            } else {
                console.log('⏭️  Skipping admin PIN setup. You can set it up later in settings.');
                return false;
            }
        } catch (error) {
            rl.close();
            console.error('❌ Error during PIN setup prompt:', error.message);
            return false;
        }
    }

    /**
     * Get PIN display (masked)
     */
    getPinDisplay() {
        if (!this.isPinSet()) {
            return 'Not Set';
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
        
        return '####';
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