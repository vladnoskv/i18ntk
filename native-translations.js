#!/usr/bin/env node

/**
 * Native Translation Replacer
 * 
 * This script replaces [NOT TRANSLATED] placeholders with proper native translations
 * in all language files to achieve full native translation support.
 * 
 * Usage:
 *   node native-translations.js [options]
 * 
 * Options:
 *   --dry-run            Show what would be changed without making changes
 *   --backup             Create backup files (default: true)
 *   --languages=<list>   Specific languages to process (default: all)
 *   --verbose            Show detailed progress
 */

const fs = require('fs');
const path = require('path');

class NativeTranslator {
    constructor() {
        this.uiLocalesDir = path.join(__dirname, 'ui-locales');
        this.backupDir = path.join(__dirname, 'backups', 'ui-locales');
        this.supportedLanguages = ['de', 'es', 'fr', 'ja', 'ru', 'zh'];
        this.dryRun = process.argv.includes('--dry-run');
        this.createBackup = !process.argv.includes('--no-backup');
        this.verbose = process.argv.includes('--verbose');
        
        // Parse specific languages if provided
        const langArg = process.argv.find(arg => arg.startsWith('--languages='));
        if (langArg) {
            this.supportedLanguages = langArg.split('=')[1].split(',').map(l => l.trim());
        }
        
        // Native translations mapping
        this.translations = {
            de: {
                // Menu options
                'menu.options.sizing': '📏 Größenanalyse',
                'menu.options.debugger': '🔧 Debug-Tools',
                'menu.options.settings': '⚙️ Einstellungen',
                
                // Operations
                'operations.init.title': '🚀 I18N INITIALISIERUNG',
                'operations.init.separator': '============================================================',
                'operations.analyze.title': '🔍 ÜBERSETZUNGEN ANALYSIEREN',
                'operations.analyze.separator': '============================================================',
                'operations.validate.title': '✅ ÜBERSETZUNGEN VALIDIEREN',
                'operations.validate.separator': '============================================================',
                'operations.usage.title': '📊 SCHLÜSSELVERWENDUNG ANALYSIEREN',
                'operations.usage.separator': '============================================================',
                'operations.complete.title': '🎯 ÜBERSETZUNGEN VERVOLLSTÄNDIGEN',
                'operations.complete.separator': '============================================================',
                'operations.sizing.title': '📏 ÜBERSETZUNGSGRÖSSEN ANALYSIEREN',
                'operations.sizing.separator': '============================================================',
                'operations.workflow.title': '🔄 UMFASSENDEN I18N-WORKFLOW AUSFÜHREN',
                'operations.workflow.separator': '============================================================',
                
                // Error messages
                'errors.invalidChoice': '❌ Ungültige Auswahl. Bitte versuchen Sie es erneut.',
                'errors.operationFailed': '❌ Vorgang fehlgeschlagen: {error}',
                'errors.fileNotFound': '❌ Datei nicht gefunden: {file}',
                'errors.directoryNotFound': '❌ Verzeichnis nicht gefunden: {directory}',
                
                // Debugger
                'debugger.title': '🔧 DEBUG-TOOLS',
                'debugger.separator': '============================================================'
            },
            
            es: {
                // Menu options
                'menu.options.sizing': '📏 Análisis de tamaño',
                'menu.options.debugger': '🔧 Herramientas de depuración',
                'menu.options.settings': '⚙️ Configuración',
                
                // Operations
                'operations.init.title': '🚀 INICIALIZANDO I18N',
                'operations.init.separator': '============================================================',
                'operations.analyze.title': '🔍 ANALIZANDO TRADUCCIONES',
                'operations.analyze.separator': '============================================================',
                'operations.validate.title': '✅ VALIDANDO TRADUCCIONES',
                'operations.validate.separator': '============================================================',
                'operations.usage.title': '📊 ANALIZANDO USO DE CLAVES',
                'operations.usage.separator': '============================================================',
                'operations.complete.title': '🎯 COMPLETANDO TRADUCCIONES',
                'operations.complete.separator': '============================================================',
                'operations.sizing.title': '📏 ANALIZANDO TAMAÑOS DE TRADUCCIÓN',
                'operations.sizing.separator': '============================================================',
                'operations.workflow.title': '🔄 EJECUTANDO FLUJO DE TRABAJO COMPLETO DE I18N',
                'operations.workflow.separator': '============================================================',
                
                // Error messages
                'errors.invalidChoice': '❌ Opción inválida. Por favor, inténtelo de nuevo.',
                'errors.operationFailed': '❌ Operación fallida: {error}',
                'errors.fileNotFound': '❌ Archivo no encontrado: {file}',
                'errors.directoryNotFound': '❌ Directorio no encontrado: {directory}',
                
                // Debugger
                'debugger.title': '🔧 HERRAMIENTAS DE DEPURACIÓN',
                'debugger.separator': '============================================================'
            },
            
            fr: {
                // Menu options
                'menu.options.sizing': '📏 Analyse de taille',
                'menu.options.debugger': '🔧 Outils de débogage',
                'menu.options.settings': '⚙️ Paramètres',
                
                // Operations
                'operations.init.title': '🚀 INITIALISATION I18N',
                'operations.init.separator': '============================================================',
                'operations.analyze.title': '🔍 ANALYSE DES TRADUCTIONS',
                'operations.analyze.separator': '============================================================',
                'operations.validate.title': '✅ VALIDATION DES TRADUCTIONS',
                'operations.validate.separator': '============================================================',
                'operations.usage.title': '📊 ANALYSE DE L\'UTILISATION DES CLÉS',
                'operations.usage.separator': '============================================================',
                'operations.complete.title': '🎯 COMPLÉTION DES TRADUCTIONS',
                'operations.complete.separator': '============================================================',
                'operations.sizing.title': '📏 ANALYSE DES TAILLES DE TRADUCTION',
                'operations.sizing.separator': '============================================================',
                'operations.workflow.title': '🔄 EXÉCUTION DU FLUX DE TRAVAIL I18N COMPLET',
                'operations.workflow.separator': '============================================================',
                
                // Error messages
                'errors.invalidChoice': '❌ Choix invalide. Veuillez réessayer.',
                'errors.operationFailed': '❌ Opération échouée : {error}',
                'errors.fileNotFound': '❌ Fichier non trouvé : {file}',
                'errors.directoryNotFound': '❌ Répertoire non trouvé : {directory}',
                
                // Debugger
                'debugger.title': '🔧 OUTILS DE DÉBOGAGE',
                'debugger.separator': '============================================================'
            },
            
            ja: {
                // Menu options
                'menu.options.sizing': '📏 サイズ分析',
                'menu.options.debugger': '🔧 デバッグツール',
                'menu.options.settings': '⚙️ 設定',
                
                // Operations
                'operations.init.title': '🚀 I18N初期化',
                'operations.init.separator': '============================================================',
                'operations.analyze.title': '🔍 翻訳の分析',
                'operations.analyze.separator': '============================================================',
                'operations.validate.title': '✅ 翻訳の検証',
                'operations.validate.separator': '============================================================',
                'operations.usage.title': '📊 キー使用状況の分析',
                'operations.usage.separator': '============================================================',
                'operations.complete.title': '🎯 翻訳の完了',
                'operations.complete.separator': '============================================================',
                'operations.sizing.title': '📏 翻訳サイズの分析',
                'operations.sizing.separator': '============================================================',
                'operations.workflow.title': '🔄 完全なI18Nワークフローの実行',
                'operations.workflow.separator': '============================================================',
                
                // Error messages
                'errors.invalidChoice': '❌ 無効な選択です。もう一度お試しください。',
                'errors.operationFailed': '❌ 操作が失敗しました：{error}',
                'errors.fileNotFound': '❌ ファイルが見つかりません：{file}',
                'errors.directoryNotFound': '❌ ディレクトリが見つかりません：{directory}',
                
                // Debugger
                'debugger.title': '🔧 デバッグツール',
                'debugger.separator': '============================================================'
            },
            
            ru: {
                // Menu options
                'menu.options.sizing': '📏 Анализ размера',
                'menu.options.debugger': '🔧 Инструменты отладки',
                'menu.options.settings': '⚙️ Настройки',
                
                // Operations
                'operations.init.title': '🚀 ИНИЦИАЛИЗАЦИЯ I18N',
                'operations.init.separator': '============================================================',
                'operations.analyze.title': '🔍 АНАЛИЗ ПЕРЕВОДОВ',
                'operations.analyze.separator': '============================================================',
                'operations.validate.title': '✅ ПРОВЕРКА ПЕРЕВОДОВ',
                'operations.validate.separator': '============================================================',
                'operations.usage.title': '📊 АНАЛИЗ ИСПОЛЬЗОВАНИЯ КЛЮЧЕЙ',
                'operations.usage.separator': '============================================================',
                'operations.complete.title': '🎯 ЗАВЕРШЕНИЕ ПЕРЕВОДОВ',
                'operations.complete.separator': '============================================================',
                'operations.sizing.title': '📏 АНАЛИЗ РАЗМЕРОВ ПЕРЕВОДОВ',
                'operations.sizing.separator': '============================================================',
                'operations.workflow.title': '🔄 ВЫПОЛНЕНИЕ ПОЛНОГО РАБОЧЕГО ПРОЦЕССА I18N',
                'operations.workflow.separator': '============================================================',
                
                // Error messages
                'errors.invalidChoice': '❌ Неверный выбор. Пожалуйста, попробуйте снова.',
                'errors.operationFailed': '❌ Операция не удалась: {error}',
                'errors.fileNotFound': '❌ Файл не найден: {file}',
                'errors.directoryNotFound': '❌ Директория не найдена: {directory}',
                
                // Debugger
                'debugger.title': '🔧 ИНСТРУМЕНТЫ ОТЛАДКИ',
                'debugger.separator': '============================================================'
            },
            
            zh: {
                // Menu options
                'menu.options.sizing': '📏 大小分析',
                'menu.options.debugger': '🔧 调试工具',
                'menu.options.settings': '⚙️ 设置',
                
                // Operations
                'operations.init.title': '🚀 I18N初始化',
                'operations.init.separator': '============================================================',
                'operations.analyze.title': '🔍 分析翻译',
                'operations.analyze.separator': '============================================================',
                'operations.validate.title': '✅ 验证翻译',
                'operations.validate.separator': '============================================================',
                'operations.usage.title': '📊 分析键使用情况',
                'operations.usage.separator': '============================================================',
                'operations.complete.title': '🎯 完成翻译',
                'operations.complete.separator': '============================================================',
                'operations.sizing.title': '📏 分析翻译大小',
                'operations.sizing.separator': '============================================================',
                'operations.workflow.title': '🔄 执行完整的I18N工作流程',
                'operations.workflow.separator': '============================================================',
                
                // Error messages
                'errors.invalidChoice': '❌ 无效选择。请重试。',
                'errors.operationFailed': '❌ 操作失败：{error}',
                'errors.fileNotFound': '❌ 文件未找到：{file}',
                'errors.directoryNotFound': '❌ 目录未找到：{directory}',
                
                // Debugger
                'debugger.title': '🔧 调试工具',
                'debugger.separator': '============================================================'
            }
        };
    }
    
    async processLanguageFiles() {
        const languageFiles = this.supportedLanguages.map(code => ({
            code,
            file: path.join(this.uiLocalesDir, `${code}.json`)
        }));
        
        let totalReplacements = 0;
        
        console.log(`🔄 Processing ${languageFiles.length} language files...\n`);
        
        for (const { code, file } of languageFiles) {
            if (!fs.existsSync(file)) {
                console.log(`⚠️ File not found: ${file}`);
                continue;
            }
            
            console.log(`🌍 Processing ${code.toUpperCase()} translations...`);
            
            // Create backup if enabled and not in dry run mode
            if (this.createBackup && !this.dryRun) {
                const backupFile = file.replace('.json', '.backup.json');
                fs.copyFileSync(file, backupFile);
                console.log(`📋 Backup created: ${path.basename(backupFile)}`);
            }
            
            // Load current translations
            const currentTranslations = JSON.parse(fs.readFileSync(file, 'utf8'));
            const nativeTranslations = this.translations[code] || {};
            
            let replacements = 0;
            
            // Replace [NOT TRANSLATED] placeholders with native translations
            const replaceInObject = (obj, nativeObj, keyPath = '') => {
                for (const key in obj) {
                    const currentKeyPath = keyPath ? `${keyPath}.${key}` : key;
                    
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                        replaceInObject(obj[key], nativeObj, currentKeyPath);
                    } else if (typeof obj[key] === 'string') {
                        if (obj[key].startsWith('[NOT TRANSLATED]') && nativeObj[currentKeyPath]) {
                            obj[key] = nativeObj[currentKeyPath];
                            replacements++;
                            if (this.verbose) {
                                console.log(`  ✅ ${currentKeyPath}: ${nativeObj[currentKeyPath]}`);
                            }
                        }
                    }
                }
            };
            
            replaceInObject(currentTranslations, nativeTranslations);
            
            // Save updated translations if not in dry run mode
            if (!this.dryRun && replacements > 0) {
                fs.writeFileSync(file, JSON.stringify(currentTranslations, null, 2), 'utf8');
            }
            
            console.log(`📊 ${code.toUpperCase()}: ${replacements} translations replaced`);
            totalReplacements += replacements;
        }
        
        console.log(`\n✅ Translation replacement complete!`);
        console.log(`📊 Total replacements: ${totalReplacements}`);
        
        if (this.dryRun) {
            console.log(`\n⚠️ DRY RUN MODE - No files were modified`);
        }
    }
    
    async run() {
        console.log('🌍 Native Translation Replacer v1.0');
        console.log('=====================================\n');
        
        if (this.dryRun) {
            console.log('⚠️ Running in DRY RUN mode - no files will be modified\n');
        }
        
        try {
            await this.processLanguageFiles();
        } catch (error) {
            console.error('❌ Error during translation replacement:', error);
            process.exit(1);
        }
    }
}

// Run the script if called directly
if (require.main === module) {
    const translator = new NativeTranslator();
    translator.run();
}

module.exports = NativeTranslator;