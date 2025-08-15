#!/usr/bin/env node

/**
 * setup-enforcer.js - Setup Completion Enforcement
 * 
 * Ensures that setup is complete before allowing any script to run.
 * Provides interactive setup prompting for a better user experience.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class SetupEnforcer {
    static _setupCheckInProgress = false;
    static _setupCheckPromise = null;

    static checkSetupComplete() {
        const configPath = path.join(process.cwd(), 'settings', 'i18ntk-config.json');
        
        if (!fs.existsSync(configPath)) {
            this.handleMissingSetup();
            return;
        }

        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            // Check if config has required fields
            if (!config.version || !config.sourceDir || !config.detectedFramework) {
                this.handleIncompleteSetup();
                return;
            }

            return true;
        } catch (error) {
            this.handleInvalidConfig();
            return;
        }
    }

    static handleMissingSetup() {
        console.log(chalk.blue('🔧 Setup Required'));
        console.log(chalk.yellow('Welcome to i18n Toolkit! This appears to be your first time running the toolkit.'));
        console.log(chalk.gray('Setup is required to configure your project for internationalization management.'));
        console.log('');
        
        // Use readline for interactive prompt
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve, reject) => {
            rl.question(chalk.cyan('Would you like to run setup now? (Y/n): '), async (answer) => {
                rl.close();
                
                if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
                    console.log(chalk.gray('Setup cancelled. Run "npm run i18ntk-setup" when you\'re ready.'));
                    process.exit(0);
                }
                
                console.log(chalk.green('🚀 Running setup...'));
                
                try {
                    // Import and run setup dynamically
                    const setupPath = path.join(__dirname, '..', 'main', 'i18ntk-setup.js');
                    if (fs.existsSync(setupPath)) {
                        const { spawn } = require('child_process');
                        const setupProcess = spawn('node', [setupPath], {
                            stdio: 'inherit',
                            cwd: process.cwd()
                        });
                        
                        setupProcess.on('close', (code) => {
                            if (code === 0) {
                                console.log(chalk.green('✅ Setup completed successfully!'));
                                console.log(chalk.gray('You can now run your original command.'));
                                resolve(true);
                            } else {
                                console.error(chalk.red('❌ Setup failed. Please try running setup manually:'));
                                console.error(chalk.cyan('   npm run i18ntk-setup'));
                                process.exit(1);
                            }
                        });
                    } else {
                        console.error(chalk.red('❌ Setup script not found. Please run:'));
                        console.error(chalk.cyan('   npm run i18ntk-setup'));
                        process.exit(1);
                    }
                } catch (error) {
                    console.error(chalk.red('❌ Error running setup:'), error.message);
                    console.error(chalk.cyan('   npm run i18ntk-setup'));
                    process.exit(1);
                }
            });
        });
    }

    static handleIncompleteSetup() {
        console.log(chalk.blue('🔧 Incomplete Setup'));
        console.log(chalk.yellow('Your setup appears to be incomplete or outdated.'));
        console.log(chalk.gray('This might happen after updating to a new version.'));
        console.log('');
        
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve, reject) => {
            rl.question(chalk.cyan('Would you like to re-run setup? (Y/n): '), async (answer) => {
                rl.close();
                
                if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
                    console.log(chalk.gray('Operation cancelled.'));
                    process.exit(0);
                }
                
                console.log(chalk.green('🚀 Running setup...'));
                
                try {
                    const setupPath = path.join(__dirname, '..', 'main', 'i18ntk-setup.js');
                    if (fs.existsSync(setupPath)) {
                        const { spawn } = require('child_process');
                        const setupProcess = spawn('node', [setupPath], {
                            stdio: 'inherit',
                            cwd: process.cwd()
                        });
                        
                        setupProcess.on('close', (code) => {
                            if (code === 0) {
                                console.log(chalk.green('✅ Setup completed successfully!'));
                                resolve(true);
                            } else {
                                console.error(chalk.red('❌ Setup failed. Please try running setup manually:'));
                                console.error(chalk.cyan('   npm run i18ntk-setup'));
                                process.exit(1);
                            }
                        });
                    } else {
                        console.error(chalk.red('❌ Setup script not found. Please run:'));
                        console.error(chalk.cyan('   npm run i18ntk-setup'));
                        process.exit(1);
                    }
                } catch (error) {
                    console.error(chalk.red('❌ Error running setup:'), error.message);
                    process.exit(1);
                }
            });
        });
    }

    static handleInvalidConfig() {
        console.log(chalk.blue('🔧 Invalid Configuration'));
        console.log(chalk.yellow('Your configuration file appears to be corrupted or invalid.'));
        console.log(chalk.gray('This might happen due to file corruption or manual editing.'));
        console.log('');
        
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve, reject) => {
            rl.question(chalk.cyan('Would you like to re-run setup to fix this? (Y/n): '), async (answer) => {
                rl.close();
                
                if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
                    console.log(chalk.gray('Operation cancelled.'));
                    process.exit(0);
                }
                
                console.log(chalk.green('🚀 Running setup...'));
                
                try {
                    const setupPath = path.join(__dirname, '..', 'main', 'i18ntk-setup.js');
                    if (fs.existsSync(setupPath)) {
                        const { spawn } = require('child_process');
                        const setupProcess = spawn('node', [setupPath], {
                            stdio: 'inherit',
                            cwd: process.cwd()
                        });
                        
                        setupProcess.on('close', (code) => {
                            if (code === 0) {
                                console.log(chalk.green('✅ Setup completed successfully!'));
                                resolve(true);
                            } else {
                                console.error(chalk.red('❌ Setup failed. Please try running setup manually:'));
                                console.error(chalk.cyan('   npm run i18ntk-setup'));
                                process.exit(1);
                            }
                        });
                    } else {
                        console.error(chalk.red('❌ Setup script not found. Please run:'));
                        console.error(chalk.cyan('   npm run i18ntk-setup'));
                        process.exit(1);
                    }
                } catch (error) {
                    console.error(chalk.red('❌ Error running setup:'), error.message);
                    process.exit(1);
                }
            });
        });
    }

    static checkSetupCompleteAsync() {
        // Return existing promise if already in progress
        if (SetupEnforcer._setupCheckInProgress && SetupEnforcer._setupCheckPromise) {
            return SetupEnforcer._setupCheckPromise;
        }

        // Create new promise and store it
        SetupEnforcer._setupCheckInProgress = true;
        SetupEnforcer._setupCheckPromise = new Promise(async (resolve, reject) => {
            try {
                const configPath = path.join(process.cwd(), 'settings', 'i18ntk-config.json');
                
                if (!fs.existsSync(configPath)) {
                    await this.handleMissingSetup();
                    // After setup is done, re-check the config
                    if (fs.existsSync(configPath)) {
                        resolve(true);
                    } else {
                        process.exit(0);
                    }
                    return;
                }

                try {
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    
                    // Check if config has required fields
                    if (!config.version || !config.sourceDir || !config.detectedFramework) {
                        await this.handleIncompleteSetup();
                        // After setup is done, re-check the config
                        const newConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                        if (newConfig.version && newConfig.sourceDir && newConfig.detectedFramework) {
                            resolve(true);
                        } else {
                            process.exit(0);
                        }
                        return;
                    }

                    resolve(true);
                } catch (error) {
                    await this.handleInvalidConfig();
                    // After setup is done, re-check the config
                    try {
                        const newConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
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
            }
        });

        return SetupEnforcer._setupCheckPromise;
    }
}

module.exports = SetupEnforcer;