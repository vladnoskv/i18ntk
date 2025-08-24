#!/usr/bin/env node

/**
 * setup-enforcer.js - Setup Completion Enforcement
 * 
 * Ensures that setup is complete before allowing any script to run.
 * Provides interactive setup prompting for a better user experience.
 */

const { getIcon } = require('./terminal-icons');
const fs = require('fs');
const path = require('path');
const { blue, yellow, gray, cyan, green, red } = require('./colors-new');
const SecurityUtils = require('./security');

class SetupEnforcer {
    static _setupCheckInProgress = false;
    static _setupCheckPromise = null;

    static checkSetupComplete() {
        const configManager = require('./config-manager');
        const configPath = configManager.CONFIG_PATH;
        
        if (!SecurityUtils.safeExistsSync(configPath)) {
            this.handleMissingSetup();
            return;
        }

        try {
            const config = JSON.parse(SecurityUtils.safeReadFileSync(configPath, 'utf8'));
            
            // Check if setup has been explicitly marked as completed
            if (config.setup && config.setup.completed === true) {
                return true;
            }
            
            // Fallback: check if config has required fields (for backward compatibility)
            if (!config.version || !config.sourceDir || (!config.detectedFramework && !(config.framework && config.framework.detected !== false))) {
                this.handleIncompleteSetup();
                return;
            }

            return true;
        } catch (error) {
            this.handleInvalidConfig();
            return;
        }
    }

    static async handleMissingSetup() {
        console.log(blue(`${getIcon('wrench')} Setup Required`));
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
                
                console.log(green(`${getIcon('rocket')} Running setup...`));
                
                try {
                    // Import and run setup directly
                    const setupPath = path.join(__dirname, '..', 'main', 'i18ntk-setup.js');
                    if (SecurityUtils.safeExistsSync(setupPath)) {
                        try {
                            const setup = require(setupPath);
                            // Use the run function which properly instantiates the class
                            if (setup && typeof setup.run === 'function') {
                                await setup.run();
                            } else {
                                // Fallback: instantiate the class directly
                                const I18nSetupManager = require(setupPath);
                                const setupManager = new I18nSetupManager();
                                await setupManager.setup();
                            }
                            console.log(gray('You can now run your original command.'));
                            resolve(true);
                        } catch (error) {
                            console.error(red(`${getIcon('cross')} Setup failed:`), error.message);
                            console.error(cyan('   Please try running setup manually:'));
                            console.error(cyan('   npm run i18ntk-setup'));
                            process.exit(1);
                        }
                    } else {
                        console.error(red(`${getIcon('cross')} Setup script not found. Please run:`));
                        console.error(cyan('   npm run i18ntk-setup'));
                        process.exit(1);
                    }
                } catch (error) {
                    console.error(red(`${getIcon('cross')} Error running setup:`), error.message);
                    console.error(cyan('   npm run i18ntk-setup'));
                    process.exit(1);
                }
            });
        });
    }

static async handleIncompleteSetup() {
        console.log(blue(`${getIcon('wrench')} Incomplete Setup`));
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
                
                console.log(green(`${getIcon('rocket')} Running setup...`));
                
                try {
                    const setupPath = path.join(__dirname, '..', 'main', 'i18ntk-setup.js');
                    if (SecurityUtils.safeExistsSync(setupPath)) {
                        try {
                            const setup = require(setupPath);
                            // Use the run function which properly instantiates the class
                            if (setup && typeof setup.run === 'function') {
                                await setup.run();
                            } else {
                                // Fallback: instantiate the class directly
                                const I18nSetupManager = require(setupPath);
                                const setupManager = new I18nSetupManager();
                                await setupManager.setup();
                            }
                            resolve(true);
                        } catch (error) {
                            console.error(red(`${getIcon('cross')} Setup failed:`), error.message);
                            console.error(cyan('   Please try running setup manually:'));
                            console.error(cyan('   npm run i18ntk-setup'));
                            process.exit(1);
                        }
                    } else {
                        console.error(red(`${getIcon('cross')} Setup script not found. Please run:`));
                        console.error(cyan('   npm run i18ntk-setup'));
                        process.exit(1);
                    }
                } catch (error) {
                    console.error(red(`${getIcon('cross')} Error running setup:`), error.message);
                    process.exit(1);
                }
            });
        });
    }

static async handleInvalidConfig() {
        console.log(blue(`${getIcon('wrench')} Invalid Configuration`));
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
                
                console.log(green(`${getIcon('rocket')} Running setup...`));
                
                try {
                    const setupPath = path.join(__dirname, '..', 'main', 'i18ntk-setup.js');
                    if (SecurityUtils.safeExistsSync(setupPath)) {
                        try {
                            const setup = require(setupPath);
                            // Use the run function which properly instantiates the class
                            if (setup && typeof setup.run === 'function') {
                                await setup.run();
                            } else {
                                // Fallback: instantiate the class directly
                                const I18nSetupManager = require(setupPath);
                                const setupManager = new I18nSetupManager();
                                await setupManager.setup();
                            }
                            resolve(true);
                        } catch (error) {
                            console.error(red(`${getIcon('cross')} Setup failed:`), error.message);
                            console.error(cyan('   Please try running setup manually:'));
                            console.error(cyan('   npm run i18ntk-setup'));
                            process.exit(1);
                        }
                    } else {
                        console.error(red(`${getIcon('cross')} Setup script not found. Please run:`));
                        console.error(cyan('   npm run i18ntk-setup'));
                        process.exit(1);
                    }
                } catch (error) {
                    console.error(red(`${getIcon('cross')} Error running setup:`), error.message);
                    process.exit(1);
                }
            });
        });
    }

    static checkSetupCompleteAsync() {
        // Return existing promise if already in progress
        // Add debugging for setup check
        if (SetupEnforcer._setupCheckInProgress && SetupEnforcer._setupCheckPromise) {
            return SetupEnforcer._setupCheckPromise;
        }

        // Create new promise and store it
        SetupEnforcer._setupCheckInProgress = true;
        SetupEnforcer._setupCheckPromise = new Promise(async (resolve, reject) => {
            try {
                const configManager = require('./config-manager');
                const configPath = configManager.CONFIG_PATH;
                
                if (!SecurityUtils.safeExistsSync(configPath)) {
                    await SetupEnforcer.handleMissingSetup();
                    // After setup is done, re-check the config
                    if (SecurityUtils.safeExistsSync(configPath)) {
                        resolve(true);
                    } else {
                        process.exit(0);
                    }
                    return;
                }

                try {
                    const config = JSON.parse(SecurityUtils.safeReadFileSync(configPath, 'utf8'));
                    
                    // Check if setup has been explicitly marked as completed
                    if (config.setup && config.setup.completed === true) {
                        resolve(true);
                        return;
                    }
                    
                    // Fallback: check if config has required fields (for backward compatibility)
                    if (!config.version || !config.sourceDir || (!config.detectedFramework && !(config.framework && config.framework.detected !== false))) {
                        await SetupEnforcer.handleIncompleteSetup();
                        // After setup is done, re-check the config
                        const newConfig = JSON.parse(SecurityUtils.safeReadFileSync(configPath, 'utf8'));
                        if (newConfig.setup && newConfig.setup.completed === true) {
                            resolve(true);
                        } else if (newConfig.version && newConfig.sourceDir && (newConfig.detectedFramework || (newConfig.framework && newConfig.framework.detected !== false))) {
                            resolve(true);
                        } else {
                            process.exit(0);
                        }
                        return;
                    }

                    resolve(true);
                } catch (error) {
                    await SetupEnforcer.handleInvalidConfig();
                    // After setup is done, re-check the config
                    try {
                        const newConfig = JSON.parse(SecurityUtils.safeReadFileSync(configPath, 'utf8'));
                        if (newConfig.setup && newConfig.setup.completed === true) {
                            resolve(true);
                        } else if (newConfig.version && newConfig.sourceDir && (newConfig.detectedFramework || (newConfig.framework && newConfig.framework.detected !== false))) {
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
            }
        });

        return SetupEnforcer._setupCheckPromise;
    }
}

module.exports = SetupEnforcer;