#!/usr/bin/env node

/**
 * setup-enforcer.js - Setup Completion Enforcement
 * 
 * Ensures that setup is complete before allowing any script to run.
 * Provides a simple check that can be used by all main scripts.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class SetupEnforcer {
    static checkSetupComplete() {
        const configPath = path.join(process.cwd(), 'i18ntk-config.json');
        
        if (!fs.existsSync(configPath)) {
            console.error(chalk.red('❌ Setup Required'));
            console.error(chalk.yellow('The i18n toolkit has not been set up yet.'));
            console.error(chalk.yellow('Please run the setup command first:'));
            console.error(chalk.cyan('   node main/i18ntk-setup.js'));
            console.error('');
            console.error(chalk.gray('This is a one-time setup that configures your project for i18n management.'));
            process.exit(1);
        }

        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            // Check if config has required fields
            if (!config.version || !config.sourceDir || !config.detectedFramework) {
                console.error(chalk.red('❌ Incomplete Setup'));
                console.error(chalk.yellow('Your setup appears to be incomplete.'));
                console.error(chalk.yellow('Please re-run the setup command:'));
                console.error(chalk.cyan('   node main/i18ntk-setup.js'));
                process.exit(1);
            }

            return true;
        } catch (error) {
            console.error(chalk.red('❌ Invalid Configuration'));
            console.error(chalk.yellow('Your configuration file is corrupted or invalid.'));
            console.error(chalk.yellow('Please re-run the setup command:'));
            console.error(chalk.cyan('   node main/i18ntk-setup.js'));
            process.exit(1);
        }
    }

    static checkSetupCompleteAsync() {
        return new Promise((resolve, reject) => {
            try {
                const isComplete = this.checkSetupComplete();
                resolve(isComplete);
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = SetupEnforcer;