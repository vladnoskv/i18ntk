const readline = require('readline');
const AdminAuth = require('./admin-auth');
const SecurityUtils = require('./security');

/**
 * CLI Helper for Admin Authentication
 */
class AdminCLI {
  constructor() {
    this.adminAuth = new AdminAuth();
    this.rl = null;
  }

  /**
   * Initialize readline interface
   */
  initReadline() {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
        historySize: 0
      });
    }
    return this.rl;
  }

  /**
   * Close readline interface
   */
  closeReadline() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  /**
   * Prompt for PIN input (hidden)
   */
  async promptPin(message = 'Enter admin PIN: ') {
    return new Promise((resolve) => {
      const rl = this.initReadline();
      
      // Check if stdin is a TTY (interactive terminal)
      const stdin = process.stdin;
      const isTTY = stdin.isTTY;
      
      if (isTTY) {
         // Hide input for PIN in interactive mode
         stdin.setRawMode(true);
         stdin.resume();
         stdin.setEncoding('utf8');
       }
       
       if (isTTY) {
         // Interactive mode with hidden input
         let pin = '';
         process.stdout.write(message);
        
        const onData = (char) => {
          switch (char) {
            case '\n':
            case '\r':
            case '\u0004': // Ctrl+D
              stdin.setRawMode(false);
              stdin.pause();
              stdin.removeListener('data', onData);
              process.stdout.write('\n');
              resolve(pin);
              break;
            case '\u0003': // Ctrl+C
              stdin.setRawMode(false);
              stdin.pause();
              stdin.removeListener('data', onData);
              process.stdout.write('\n');
              process.exit(1);
              break;
            case '\u007f': // Backspace
              if (pin.length > 0) {
                pin = pin.slice(0, -1);
                process.stdout.write('\b \b');
              }
              break;
            default:
              if (char >= '0' && char <= '9' && pin.length < 4) {
                pin += char;
                process.stdout.write('*');
              }
              break;
          }
        };
        
        stdin.on('data', onData);
      } else {
        // Non-interactive mode (piped input)
        rl.question(message, (answer) => {
          resolve(answer.trim());
        });
      }
    });
  }

  /**
   * Prompt for yes/no confirmation
   */
  async promptConfirm(message) {
    return new Promise((resolve) => {
      const rl = this.initReadline();
      rl.question(`${message} (y/N): `, (answer) => {
        resolve(answer.toLowerCase().startsWith('y'));
      });
    });
  }

  /**
   * Setup admin PIN
   */
  async setupAdminPin() {
    try {
      console.log('\n🔐 Setting up Admin PIN Protection');
      console.log('This will require a 4-digit PIN for administrative operations.');
      
      const confirm = await this.promptConfirm('Do you want to enable admin PIN protection?');
      if (!confirm) {
        console.log('Admin PIN protection setup cancelled.');
        this.closeReadline();
        return false;
      }

      let pin1, pin2;
      do {
        pin1 = await this.promptPin('Enter a 4-digit PIN: ');
        
        if (!/^\d{4}$/.test(pin1)) {
          console.log('❌ PIN must be exactly 4 digits. Please try again.');
          continue;
        }
        
        pin2 = await this.promptPin('Confirm PIN: ');
        
        if (pin1 !== pin2) {
          console.log('❌ PINs do not match. Please try again.');
        }
      } while (pin1 !== pin2 || !/^\d{4}$/.test(pin1));

      await this.adminAuth.initialize();
      const success = await this.adminAuth.setupPin(pin1);
      
      if (success) {
        console.log('✅ Admin PIN protection enabled successfully!');
        console.log('⚠️  Remember your PIN - it cannot be recovered if lost.');
        SecurityUtils.logSecurityEvent('admin_pin_setup_cli', 'info', 'Admin PIN setup completed via CLI');
      } else {
        console.log('❌ Failed to setup admin PIN protection.');
      }
      
      this.closeReadline();
      return success;
    } catch (error) {
      console.error('❌ Error setting up admin PIN:', error.message);
      this.closeReadline();
      return false;
    }
  }

  /**
   * Authenticate admin user
   */
  async authenticateAdmin(operation = 'administrative operation') {
    try {
      await this.adminAuth.initialize();
      
      const authRequired = await this.adminAuth.isAuthRequired();
      if (!authRequired) {
        return true; // No authentication required
      }

      console.log(`\n🔐 Admin authentication required for: ${operation}`);
      
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        const pin = await this.promptPin('Enter admin PIN: ');
        
        if (!/^\d{4}$/.test(pin)) {
          console.log('❌ Invalid PIN format. PIN must be 4 digits.');
          attempts++;
          continue;
        }
        
        const isValid = await this.adminAuth.verifyPin(pin);
        
        if (isValid) {
          console.log('✅ Authentication successful!');
          this.closeReadline();
          return true;
        } else {
          attempts++;
          const remaining = maxAttempts - attempts;
          if (remaining > 0) {
            console.log(`❌ Invalid PIN. ${remaining} attempts remaining.`);
          }
        }
      }
      
      console.log('❌ Authentication failed. Access denied.');
      SecurityUtils.logSecurityEvent('admin_auth_failed_cli', 'warning', `Admin authentication failed after ${maxAttempts} attempts`);
      this.closeReadline();
      return false;
    } catch (error) {
      console.error('❌ Authentication error:', error.message);
      this.closeReadline();
      return false;
    }
  }

  /**
   * Disable admin authentication
   */
  async disableAdminAuth() {
    try {
      await this.adminAuth.initialize();
      
      const authRequired = await this.adminAuth.isAuthRequired();
      if (!authRequired) {
        console.log('Admin PIN protection is not currently enabled.');
        return true;
      }

      console.log('\n🔓 Disabling Admin PIN Protection');
      
      // Require authentication to disable
      const authenticated = await this.authenticateAdmin('disable admin protection');
      if (!authenticated) {
        return false;
      }
      
      const confirm = await this.promptConfirm('Are you sure you want to disable admin PIN protection?');
      if (!confirm) {
        console.log('Operation cancelled.');
        this.closeReadline();
        return false;
      }
      
      const success = await this.adminAuth.disableAuth();
      
      if (success) {
        console.log('✅ Admin PIN protection disabled.');
        SecurityUtils.logSecurityEvent('admin_auth_disabled_cli', 'info', 'Admin PIN protection disabled via CLI');
      } else {
        console.log('❌ Failed to disable admin PIN protection.');
      }
      
      this.closeReadline();
      return success;
    } catch (error) {
      console.error('❌ Error disabling admin protection:', error.message);
      this.closeReadline();
      return false;
    }
  }

  /**
   * Show admin status
   */
  async showAdminStatus() {
    try {
      await this.adminAuth.initialize();
      
      const authRequired = await this.adminAuth.isAuthRequired();
      
      console.log('\n🔐 Admin Protection Status');
      console.log('=' .repeat(30));
      
      if (authRequired) {
        console.log('Status: ✅ ENABLED');
        console.log('Protection: 4-digit PIN required for admin operations');
        console.log('Lockout: 3 failed attempts = 15 minute lockout');
      } else {
        console.log('Status: ❌ DISABLED');
        console.log('Protection: No authentication required');
        console.log('Risk: Administrative operations are unprotected');
      }
      
      return authRequired;
    } catch (error) {
      console.error('❌ Error checking admin status:', error.message);
      return false;
    }
  }

  /**
   * Check if operation requires admin authentication
   */
  static requiresAdminAuth(operation) {
    const adminOperations = [
      'complete',
      'manage',
      'init',
      'bulk-update',
      'delete-language',
      'reset-translations',
      'delete',
      'workflow'
    ];
    
    return adminOperations.includes(operation);
  }

  /**
   * Static method to check if operation requires auth (alias)
   */
  static requiresAuth(operation) {
    return AdminCLI.requiresAdminAuth(operation);
  }

  /**
   * Static method to authenticate
   */
  static async authenticate(operation = 'administrative operation') {
    const cli = new AdminCLI();
    return await cli.authenticateAdmin(operation);
  }

  /**
   * Static method to setup admin
   */
  static async setupAdmin() {
    const cli = new AdminCLI();
    return await cli.setupAdminPin();
  }

  /**
   * Static method to disable admin
   */
  static async disableAdmin() {
    const cli = new AdminCLI();
    return await cli.disableAdminAuth();
  }

  /**
   * Static method to show status
   */
  static async showStatus() {
    const cli = new AdminCLI();
    return await cli.showAdminStatus();
  }
}

module.exports = AdminCLI;