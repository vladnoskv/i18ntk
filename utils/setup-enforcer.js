#!/usr/bin/env node

/**
 * setup-enforcer.js - Setup Completion Enforcement
 * 
 * Ensures that setup is complete before allowing any script to run.
 * Provides interactive setup prompting for a better user experience.
 */

const fs = require('fs');
const path = require('path');
const { blue, yellow, gray, cyan, green, red } = require('./colors-new');
const configManager = require('./config-manager');
const SecurityUtils = require('./security');

class SetupEnforcer {
    static _setupCheckInProgress = false;
    static _setupCheckPromise = null;

    static checkSetupComplete() {
        try {
            const config = configManager.getConfig();
            
            // Check if config has required fields
            if (!config.version || !config.sourceDir || !config.detectedFramework) {
                this.handleIncompleteSetup();
                return;
            }

            return true;
        } catch (error) {
            this.handleMissingSetup();
            return;
        }
    }

    static async handleMissingSetup() {
        console.log(blue('🔧 Setup Required'));
        console.log(yellow('Welcome to i18n Toolkit! This appears to be your first time running the toolkit.'));
        console.log(gray('Setup is required to configure your project for internationalization management.'));
        console.log('');
        
        // Use readline for interactive prompt
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve, reject) => {
            rl.question(cyan('Would you like to run setup now? (Y/n): '), async (answer) => {
                rl.close();
                
                if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
                    console.log(gray('Setup cancelled. Run "npm run i18ntk-setup" when you\'re ready.'));
                    process.exit(0);
                }
                
                console.log(green('🚀 Running setup...'));
                
                try {
                    await this.runSetup();
                    resolve(true);
                } catch (error) {
                    console.error(red('❌ Setup failed:'), error.message);
                    console.error(cyan('   Please try running setup manually:'));
                    console.error(cyan('   npm run i18ntk-setup'));
                    process.exit(1);
                }
            });
        });
    }

    static async handleIncompleteSetup() {
        console.log(blue('🔧 Incomplete Setup'));
        console.log(yellow('Your setup appears to be incomplete or outdated.'));
        console.log(gray('This might happen after updating to a new version.'));
        console.log('');
        
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve, reject) => {
            rl.question(cyan('Would you like to re-run setup? (Y/n): '), async (answer) => {
                rl.close();
                
                if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
                    console.log(gray('Operation cancelled.'));
                    process.exit(0);
                }
                
                console.log(green('🚀 Running setup...'));
                
                try {
                    await this.runSetup();
                    resolve(true);
                } catch (error) {
                    console.error(red('❌ Setup failed:'), error.message);
                    console.error(cyan('   Please try running setup manually:'));
                    console.error(cyan('   npm run i18ntk-setup'));
                    process.exit(1);
                }
            });
        });
    }

    static async handleInvalidConfig() {
        console.log(blue('🔧 Invalid Configuration'));
        console.log(yellow('Your configuration file appears to be corrupted or invalid.'));
        console.log(gray('This might happen due to file corruption or manual editing.'));
        console.log('');
        
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve, reject) => {
            rl.question(cyan('Would you like to re-run setup to fix this? (Y/n): '), async (answer) => {
                rl.close();
                
                if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
                    console.log(gray('Operation cancelled.'));
                    process.exit(0);
                }
                
                console.log(green('🚀 Running setup...'));
                
                try {
                    await this.runSetup();
                    resolve(true);
                } catch (error) {
                    console.error(red('❌ Setup failed:'), error.message);
                    process.exit(1);
                }
            });
        });
    }

    static async runSetup() {
        const setupPath = path.join(__dirname, '..', 'main', 'i18ntk-setup.js');
        if (!SecurityUtils.safeExistsSync(setupPath)) {
            throw new Error('Setup script not found');
        }

        const setup = require(setupPath);
        
        // Handle different export patterns
        if (typeof setup === 'function' && setup.name === 'I18nSetupManager') {
            const setupManager = new setup();
            await setupManager.setup();
        } else if (typeof setup === 'function') {
            await setup();
        } else if (setup && typeof setup.run === 'function') {
            await setup.run();
        } else if (setup && typeof setup.prototype.setup === 'function') {
            const setupManager = new setup();
            await setupManager.setup();
        } else {
            throw new Error('Invalid setup export pattern');
        }
        
        console.log(green('✅ Setup completed successfully!'));
    }

    static async checkSetupCompleteAsync() {
        // Return existing promise if already in progress
        if (SetupEnforcer._setupCheckInProgress && SetupEnforcer._setupCheckPromise) {
            return SetupEnforcer._setupCheckPromise;
        }

        // Create new promise and store it
        SetupEnforcer._setupCheckInProgress = true;
        SetupEnforcer._setupCheckPromise = new Promise(async (resolve, reject) => {
            try {
                try {
                    const config = configManager.getConfig();
                    
                    // Check if config has required fields
                    if (!config.version || !config.sourceDir) {
                        await SetupEnforcer.handleIncompleteSetup();
                        // After setup is done, re-check the config
                        const newConfig = configManager.getConfig();
                        if (newConfig.version && newConfig.sourceDir && newConfig.detectedFramework) {
                            resolve(true);
                        } else {
                            process.exit(0);
                        }
                        return;
                    }

                    resolve(true);
                } catch (error) {
                    await SetupEnforcer.handleMissingSetup();
                    // After setup is done, re-check the config
                    try {
                        const newConfig = configManager.getConfig();
                        if (newConfig.version && newConfig.sourceDir && newConfig.detectedFramework) {
                            resolve(true);
                        } else {
                            process.exit(0);
                        }
                    } catch (e) {
                        process.exit(0);
                    }
                }
            } catch (error) {
                reject(error);
            } finally {
                SetupEnforcer._setupCheckInProgress = false;
                SetupEnforcer._setupCheckPromise = null;
            }
        });

        return SetupEnforcer._setupCheckPromise;
    }
}

module.exports = SetupEnforcer;