const fs = require('fs');
const path = require('path');
const UIi18n = require('../../main/i18ntk-ui');

class HardcodedConsoleReplacer {
    constructor() {
        this.ui = new UIi18n();
        this.projectRoot = path.join(__dirname, '..', '..');
        this.replacements = new Map();
        this.dryRun = process.argv.includes('--dry-run');
        this.verbose = process.argv.includes('--verbose');
        this.stats = {
            filesProcessed: 0,
            replacementsMade: 0,
            filesModified: 0
        };
        
        this.initializeReplacements();
    }

    initializeReplacements() {
        // Common console message patterns and their translation keys
        this.replacements.set(
            /console\.log\('⚠️\s*No package\.json found\. This toolkit works independently but is recommended to be used with i18n frameworks\.'/g,
            "console.log(t('init.warnings.noPackageJson'))"
        );
        
        this.replacements.set(
            /console\.log\('💡 No i18n framework detected\. Consider installing one of:'/g,
            "console.log(t('init.suggestions.noFramework'))"
        );
        
        this.replacements.set(
            /console\.log\('\s*- react-i18next \(for React\)'/g,
            "console.log(t('init.frameworks.react'))"
        );
        
        this.replacements.set(
            /console\.log\('\s*- vue-i18n \(for Vue\)'/g,
            "console.log(t('init.frameworks.vue'))"
        );
        
        this.replacements.set(
            /console\.log\('\s*- i18next \(universal\)'/g,
            "console.log(t('init.frameworks.i18next'))"
        );
        
        this.replacements.set(
            /console\.log\('\s*- @nuxtjs\/i18n \(for Nuxt\)'/g,
            "console.log(t('init.frameworks.nuxt'))"
        );
        
        this.replacements.set(
            /console\.log\('\s*- svelte-i18n \(for Svelte\)'/g,
            "console.log(t('init.frameworks.svelte'))"
        );
        
        this.replacements.set(
            /console\.log\('⚠️\s*Could not read package\.json'/g,
            "console.log(t('init.errors.packageJsonRead'))"
        );
        
        this.replacements.set(
            /console\.log\('🎛️\s*I18NTK Management Toolkit'/g,
            "console.log(t('menu.title'))"
        );
        
        this.replacements.set(
            /console\.log\('\\n📦 Please install an i18n framework and try again\.'/g,
            "console.log(t('init.errors.noFramework'))"
        );
        
        this.replacements.set(
            /console\.log\('💡 Recommended: npm install react-i18next \(or your preferred framework\)'/g,
            "console.log(t('init.suggestions.installFramework'))"
        );
        
        this.replacements.set(
            /console\.log\('\\n🚀 Starting automated workflow\.\.\.'\);/g,
            "console.log(t('workflow.starting'));"
        );
        
        this.replacements.set(
            /console\.log\('\\n✅ Workflow completed successfully!'\);/g,
            "console.log(t('workflow.completed'));"
        );
        
        this.replacements.set(
            /console\.log\('📋 Check the generated reports in the i18ntk-reports directory\.'\);/g,
            "console.log(t('workflow.checkReports'));"
        );
        
        this.replacements.set(
            /console\.log\('\\n📝 Returning to main menu\.\.\.'\);/g,
            "console.log(t('menu.returning'));"
        );
        
        this.replacements.set(
            /console\.log\('\\n📝 Workflow completed\. Exiting\.\.\.'\);/g,
            "console.log(t('workflow.exitingCompleted'));"
        );
        
        this.replacements.set(
            /console\.log\('\\n✅ Operation completed successfully!'\);/g,
            "console.log(t('operations.completed'));"
        );
        
        this.replacements.set(
            /console\.log\('\\n🔐 Admin authentication required'\);/g,
            "console.log(t('admin.authRequired'));"
        );
        
        this.replacements.set(
            /console\.log\('❌ Invalid PIN\. Access denied\.'\);/g,
            "console.log(t('admin.invalidPin'));"
        );
        
        this.replacements.set(
            /console\.log\('✅ Authentication successful\.'\);/g,
            "console.log(t('admin.authSuccess'));"
        );
        
        this.replacements.set(
            /console\.log\('\\n📊 Generating Status Summary\.\.\.'\);/g,
            "console.log(t('status.generating'));"
        );
        
        this.replacements.set(
            /console\.log\('✅ Status summary completed successfully!'\);/g,
            "console.log(t('status.completed'));"
        );
        
        this.replacements.set(
            /console\.log\('\\n📝 Status summary completed\. Exiting\.\.\.'\);/g,
            "console.log(t('status.exitingCompleted'));"
        );
        
        this.replacements.set(
            /console\.log\('\\n📝 Error occurred\. Exiting\.\.\.'\);/g,
            "console.log(t('common.errorExiting'));"
        );
        
        this.replacements.set(
            /console\.log\('❌ Invalid option\. Please try again\.'\);/g,
            "console.log(t('menu.invalidChoice'));"
        );
        
        this.replacements.set(
            /console\.log\('\\n🗑️\s*Deletion Options:'\);/g,
            "console.log(t('delete.options.title'));"
        );
        
        this.replacements.set(
            /console\.log\('\s*1\. Delete all reports'\);/g,
            "console.log(t('delete.options.all'));"
        );
        
        this.replacements.set(
            /console\.log\('\s*2\. Keep last 3 reports \(delete older ones\)'\);/g,
            "console.log(t('delete.options.keepLast3'));"
        );
        
        this.replacements.set(
            /console\.log\('\s*0\. Cancel'\);/g,
            "console.log(t('common.options.cancel'));"
        );
        
        this.replacements.set(
            /console\.log\('❌ Operation cancelled\.'\);/g,
            "console.log(t('operations.cancelled'));"
        );
        
        this.replacements.set(
            /console\.log\('❌ Invalid option\.'\);/g,
            "console.log(t('menu.invalidOption'));"
        );
        
        this.replacements.set(
            /console\.log\('✅ No files to delete\.'\);/g,
            "console.log(t('delete.noFiles'));"
        );
        
        this.replacements.set(
            /console\.log\('\\n🌍 CHANGE UI LANGUAGE'\);/g,
            "console.log(t('language.changeTitle'));"
        );
        
        this.replacements.set(
            /console\.log\('Available languages:'\);/g,
            "console.log(t('language.available'));"
        );
        
        this.replacements.set(
            /console\.log\('❌ Invalid selection\.'\);/g,
            "console.log(t('language.invalidSelection'));"
        );
    }

    async run() {
        console.log('🔧 HARDCODED CONSOLE REPLACER');
        console.log('============================================================');
        
        if (this.dryRun) {
            console.log('🧪 DRY RUN MODE - No files will be modified');
        }
        console.log('');
        
        try {
            const jsFiles = await this.findJavaScriptFiles();
            console.log(`🔍 Found ${jsFiles.length} JavaScript files to process`);
            console.log('');
            
            for (const filePath of jsFiles) {
                await this.processFile(filePath);
            }
            
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Error during console replacement:', error.message);
            process.exit(1);
        }
    }

    async findJavaScriptFiles() {
        const files = [];
        const excludeDirs = ['node_modules', '.git', 'reports', 'i18ntk-reports'];
        
        const scanDirectory = (dir) => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    if (!excludeDirs.includes(item)) {
                        scanDirectory(fullPath);
                    }
                } else if (item.endsWith('.js') && !item.includes('.min.')) {
                    files.push(fullPath);
                }
            }
        };
        
        scanDirectory(this.projectRoot);
        return files;
    }

    async processFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            let modifiedContent = content;
            let fileModified = false;
            let replacementsInFile = 0;
            
            // Apply all replacements
            for (const [pattern, replacement] of this.replacements) {
                const matches = modifiedContent.match(pattern);
                if (matches) {
                    modifiedContent = modifiedContent.replace(pattern, replacement);
                    replacementsInFile += matches.length;
                    fileModified = true;
                }
            }
            
            // Check if we need to add UIi18n import
            if (fileModified && !modifiedContent.includes('UIi18n')) {
                const relativePath = path.relative(path.dirname(filePath), path.join(this.projectRoot, 'i18ntk-ui.js'));
                const importStatement = `const UIi18n = require('${relativePath}');\n`;
const { loadTranslations, t } = require('../../utils/i18n-helper');
                
                // Add import after existing requires or at the top
                const requireRegex = /(const .* = require\(.*\);\n)+/;
                if (requireRegex.test(modifiedContent)) {
                    modifiedContent = modifiedContent.replace(requireRegex, (match) => match + importStatement);
                } else {
                    modifiedContent = importStatement + modifiedContent;
                }
                
                // Add UIi18n initialization in constructor or at the beginning of main functions
                if (modifiedContent.includes('class ') && modifiedContent.includes('constructor')) {
                    // Add to constructor
                    modifiedContent = modifiedContent.replace(
                        /(constructor\([^)]*\)\s*{)/,
                        '$1\n        this.ui = new UIi18n();'
                    );
                } else if (modifiedContent.includes('function ') || modifiedContent.includes('async function')) {
                    // Add at the beginning of main function
                    const functionMatch = modifiedContent.match(/((?:async )?function [^{]+{)/)
                    if (functionMatch) {
                        modifiedContent = modifiedContent.replace(
                            functionMatch[0],
                            functionMatch[0] + '\n    const ui = new UIi18n();'
                        );
                        // Update console.log calls to use ui instead of this.ui
                        modifiedContent = modifiedContent.replace(/this\.ui\.t\(/g, 't(');
                    }
                } else {
                    // Add at the top level
                    modifiedContent = modifiedContent.replace(
                        /(const UIi18n = require\(.*\);\n)/,
                        '$1const ui = new UIi18n();\n'
                    );
                    // Update console.log calls to use ui instead of this.ui
                    modifiedContent = modifiedContent.replace(/this\.ui\.t\(/g, 't(');
                }
            }
            
            if (fileModified) {
                this.stats.filesModified++;
                this.stats.replacementsMade += replacementsInFile;
                
                if (this.verbose) {
                    console.log(`📝 ${path.relative(this.projectRoot, filePath)}: ${replacementsInFile} replacements`);
                }
                
                if (!this.dryRun) {
                    fs.writeFileSync(filePath, modifiedContent, 'utf8');
                }
            }
            
            this.stats.filesProcessed++;
            
        } catch (error) {
            console.error(`❌ Error processing ${filePath}:`, error.message);
        }
    }

    generateReport() {
        console.log('');
        console.log('📊 REPLACEMENT SUMMARY');
        console.log('============================================================');
        console.log(`📁 Files processed: ${this.stats.filesProcessed}`);
        console.log(`📝 Files modified: ${this.stats.filesModified}`);
        console.log(`🔄 Total replacements: ${this.stats.replacementsMade}`);
        console.log('');
        
        if (this.stats.replacementsMade > 0) {
            if (this.dryRun) {
                console.log('💡 NEXT STEPS:');
                console.log('------------------------------------------------------------');
                console.log('🔧 Run without --dry-run to apply changes:');
                console.log('   node replace-hardcoded-console.js');
            } else {
                console.log('✅ All hardcoded console messages have been replaced with translation keys!');
                console.log('🌐 Your application now supports full internationalization.');
            }
        } else {
            console.log('🎉 No hardcoded console messages found! Your code is already internationalized.');
        }
        
        console.log('');
    }
}

// Show help
if (process.argv.includes('--help')) {
    console.log('Replace hardcoded console.log statements with translation keys\n');
    console.log('USAGE:');
    console.log('  node replace-hardcoded-console.js [options]\n');
    console.log('OPTIONS:');
    console.log('  --dry-run     Preview changes without modifying files');
    console.log('  --verbose     Show detailed progress');
    console.log('  --help        Show this help message\n');
    console.log('EXAMPLES:');
    console.log('  node replace-hardcoded-console.js --dry-run');
    console.log('  node replace-hardcoded-console.js --verbose');
    console.log('  node replace-hardcoded-console.js');
    process.exit(0);
}

// Run the replacer
if (require.main === module) {
    const replacer = new HardcodedConsoleReplacer();
    replacer.run().catch(console.error);
}

module.exports = { HardcodedConsoleReplacer };