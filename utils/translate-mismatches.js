#!/usr/bin/env node

/**
 * Translation Helper Tool
 * 
 * This script helps translate English content in foreign language files
 * by providing translation suggestions and batch processing capabilities.
 */

const fs = require('fs');
const path = require('path');

class TranslationHelper {
    constructor() {
        this.localesDir = path.join(__dirname, 'ui-locales');
        this.translationMappings = {
            de: {
                // Common UI terms
                'Debug Tools': 'Debug-Tools',
                'Settings': 'Einstellungen',
                'Configuration': 'Konfiguration',
                'Options': 'Optionen',
                'Menu': 'Menü',
                'Back': 'Zurück',
                'Main Menu': 'Hauptmenü',
                'Back to Main Menu': 'Zurück zum Hauptmenü',
                'Invalid choice': 'Ungültige Auswahl',
                'Please select': 'Bitte wählen Sie',
                'Error': 'Fehler',
                'Warning': 'Warnung',
                'Success': 'Erfolg',
                'Failed': 'Fehlgeschlagen',
                'Loading': 'Laden',
                'Saving': 'Speichern',
                'Delete': 'Löschen',
                'Create': 'Erstellen',
                'Update': 'Aktualisieren',
                'Add': 'Hinzufügen',
                'Remove': 'Entfernen',
                'Edit': 'Bearbeiten',
                'View': 'Anzeigen',
                'Show': 'Zeigen',
                'Hide': 'Verstecken',
                'Open': 'Öffnen',
                'Close': 'Schließen',
                'Start': 'Starten',
                'Stop': 'Stoppen',
                'Run': 'Ausführen',
                'Execute': 'Ausführen',
                'Process': 'Verarbeiten',
                'Generate': 'Generieren',
                'Analysis': 'Analyse',
                'Report': 'Bericht',
                'Summary': 'Zusammenfassung',
                'Details': 'Details',
                'Tools': 'Werkzeuge',
                'Debug': 'Debug',
                'Test': 'Test',
                'Validate': 'Validieren',
                'Check': 'Prüfen',
                'Verify': 'Überprüfen',
                'Confirm': 'Bestätigen',
                'Cancel': 'Abbrechen',
                'Continue': 'Fortfahren',
                'Finish': 'Beenden',
                'Complete': 'Vollständig',
                'File': 'Datei',
                'Files': 'Dateien',
                'Found': 'Gefunden',
                'Not found': 'Nicht gefunden',
                'Available': 'Verfügbar',
                'Not available': 'Nicht verfügbar',
                'Issues found': 'Probleme gefunden',
                'No issues found': 'Keine Probleme gefunden',
                'Warnings found': 'Warnungen gefunden',
                
                // Debug-specific terms
                'Full System Debug': 'Vollständiges System-Debug',
                'Configuration Debug': 'Konfigurations-Debug',
                'Translation Debug': 'Übersetzungs-Debug',
                'Performance Debug': 'Leistungs-Debug',
                
                // Operations
                'INITIALIZING I18N': 'I18N INITIALISIEREN',
                'ANALYZING TRANSLATIONS': 'ÜBERSETZUNGEN ANALYSIEREN',
                'VALIDATING TRANSLATIONS': 'ÜBERSETZUNGEN VALIDIEREN',
                'ANALYZING KEY USAGE': 'SCHLÜSSEL-VERWENDUNG ANALYSIEREN',
                'COMPLETING TRANSLATIONS': 'ÜBERSETZUNGEN VERVOLLSTÄNDIGEN',
                'ANALYZING TRANSLATION SIZES': 'ÜBERSETZUNGSGRÖSSEN ANALYSIEREN',
                'RUNNING COMPREHENSIVE I18N WORKFLOW': 'UMFASSENDEN I18N-WORKFLOW AUSFÜHREN',
                
                // Admin terms
                'Admin PIN Setup': 'Admin-PIN-Einrichtung',
                'Enter Admin PIN': 'Admin-PIN eingeben',
                'Confirm Admin PIN': 'Admin-PIN bestätigen',
                'PINs do not match': 'PINs stimmen nicht überein',
                'Authentication failed': 'Authentifizierung fehlgeschlagen',
                'Access denied': 'Zugriff verweigert',
                'Session authenticated': 'Sitzung authentifiziert',
                'Security log': 'Sicherheitsprotokoll',
                
                // Common phrases
                'Please try again': 'Bitte versuchen Sie es erneut',
                'Would you like': 'Möchten Sie',
                'Select option': 'Option auswählen',
                'try again': 'erneut versuchen',
                'choice': 'Auswahl',
                'option': 'Option',
                'issue(s)': 'Problem(e)',
                'warning(s)': 'Warnung(en)',
                'found': 'gefunden',
                'not': 'nicht'
            },
            
            fr: {
                // Common UI terms
                'Debug Tools': 'Outils de débogage',
                'Settings': 'Paramètres',
                'Configuration': 'Configuration',
                'Options': 'Options',
                'Menu': 'Menu',
                'Back': 'Retour',
                'Main Menu': 'Menu principal',
                'Back to Main Menu': 'Retour au menu principal',
                'Invalid choice': 'Choix invalide',
                'Please select': 'Veuillez sélectionner',
                'Error': 'Erreur',
                'Warning': 'Avertissement',
                'Success': 'Succès',
                'Failed': 'Échec',
                'Loading': 'Chargement',
                'Saving': 'Sauvegarde',
                'Delete': 'Supprimer',
                'Create': 'Créer',
                'Update': 'Mettre à jour',
                'Add': 'Ajouter',
                'Remove': 'Supprimer',
                'Edit': 'Modifier',
                'View': 'Voir',
                'Show': 'Afficher',
                'Hide': 'Masquer',
                'Open': 'Ouvrir',
                'Close': 'Fermer',
                'Start': 'Démarrer',
                'Stop': 'Arrêter',
                'Run': 'Exécuter',
                'Execute': 'Exécuter',
                'Process': 'Traiter',
                'Generate': 'Générer',
                'Analysis': 'Analyse',
                'Report': 'Rapport',
                'Summary': 'Résumé',
                'Details': 'Détails',
                'Tools': 'Outils',
                'Debug': 'Débogage',
                'Test': 'Test',
                'Validate': 'Valider',
                'Check': 'Vérifier',
                'Verify': 'Vérifier',
                'Confirm': 'Confirmer',
                'Cancel': 'Annuler',
                'Continue': 'Continuer',
                'Finish': 'Terminer',
                'Complete': 'Complet',
                'File': 'Fichier',
                'Files': 'Fichiers',
                'Found': 'Trouvé',
                'Not found': 'Non trouvé',
                'Available': 'Disponible',
                'Not available': 'Non disponible',
                'Issues found': 'Problèmes trouvés',
                'No issues found': 'Aucun problème trouvé',
                'Warnings found': 'Avertissements trouvés',
                
                // Debug-specific terms
                'Full System Debug': 'Débogage système complet',
                'Configuration Debug': 'Débogage de configuration',
                'Translation Debug': 'Débogage de traduction',
                'Performance Debug': 'Débogage de performance',
                
                // Operations
                'INITIALIZING I18N': 'INITIALISATION I18N',
                'ANALYZING TRANSLATIONS': 'ANALYSE DES TRADUCTIONS',
                'VALIDATING TRANSLATIONS': 'VALIDATION DES TRADUCTIONS',
                'ANALYZING KEY USAGE': 'ANALYSE DE L\'UTILISATION DES CLÉS',
                'COMPLETING TRANSLATIONS': 'FINALISATION DES TRADUCTIONS',
                'ANALYZING TRANSLATION SIZES': 'ANALYSE DES TAILLES DE TRADUCTION',
                'RUNNING COMPREHENSIVE I18N WORKFLOW': 'EXÉCUTION DU WORKFLOW I18N COMPLET',
                
                // Admin terms
                'Admin PIN Setup': 'Configuration du PIN administrateur',
                'Enter Admin PIN': 'Entrer le PIN administrateur',
                'Confirm Admin PIN': 'Confirmer le PIN administrateur',
                'PINs do not match': 'Les PINs ne correspondent pas',
                'Authentication failed': 'Échec de l\'authentification',
                'Access denied': 'Accès refusé',
                'Session authenticated': 'Session authentifiée',
                'Security log': 'Journal de sécurité',
                
                // Common phrases
                'Please try again': 'Veuillez réessayer',
                'Would you like': 'Souhaitez-vous',
                'Select option': 'Sélectionner une option',
                'try again': 'réessayer',
                'choice': 'choix',
                'option': 'option',
                'issue(s)': 'problème(s)',
                'warning(s)': 'avertissement(s)',
                'found': 'trouvé',
                'not': 'ne pas'
            },
            
            es: {
                // Common UI terms
                'Debug Tools': 'Herramientas de depuración',
                'Settings': 'Configuración',
                'Configuration': 'Configuración',
                'Options': 'Opciones',
                'Menu': 'Menú',
                'Back': 'Atrás',
                'Main Menu': 'Menú principal',
                'Back to Main Menu': 'Volver al menú principal',
                'Invalid choice': 'Opción inválida',
                'Please select': 'Por favor seleccione',
                'Error': 'Error',
                'Warning': 'Advertencia',
                'Success': 'Éxito',
                'Failed': 'Falló',
                'Loading': 'Cargando',
                'Saving': 'Guardando',
                'Delete': 'Eliminar',
                'Create': 'Crear',
                'Update': 'Actualizar',
                'Add': 'Agregar',
                'Remove': 'Quitar',
                'Edit': 'Editar',
                'View': 'Ver',
                'Show': 'Mostrar',
                'Hide': 'Ocultar',
                'Open': 'Abrir',
                'Close': 'Cerrar',
                'Start': 'Iniciar',
                'Stop': 'Detener',
                'Run': 'Ejecutar',
                'Execute': 'Ejecutar',
                'Process': 'Procesar',
                'Generate': 'Generar',
                'Analysis': 'Análisis',
                'Report': 'Informe',
                'Summary': 'Resumen',
                'Details': 'Detalles',
                'Tools': 'Herramientas',
                'Debug': 'Depurar',
                'Test': 'Prueba',
                'Validate': 'Validar',
                'Check': 'Verificar',
                'Verify': 'Verificar',
                'Confirm': 'Confirmar',
                'Cancel': 'Cancelar',
                'Continue': 'Continuar',
                'Finish': 'Finalizar',
                'Complete': 'Completo',
                'File': 'Archivo',
                'Files': 'Archivos',
                'Found': 'Encontrado',
                'Not found': 'No encontrado',
                'Available': 'Disponible',
                'Not available': 'No disponible',
                'Issues found': 'Problemas encontrados',
                'No issues found': 'No se encontraron problemas',
                'Warnings found': 'Advertencias encontradas',
                
                // Debug-specific terms
                'Full System Debug': 'Depuración completa del sistema',
                'Configuration Debug': 'Depuración de configuración',
                'Translation Debug': 'Depuración de traducción',
                'Performance Debug': 'Depuración de rendimiento',
                
                // Operations
                'INITIALIZING I18N': 'INICIALIZANDO I18N',
                'ANALYZING TRANSLATIONS': 'ANALIZANDO TRADUCCIONES',
                'VALIDATING TRANSLATIONS': 'VALIDANDO TRADUCCIONES',
                'ANALYZING KEY USAGE': 'ANALIZANDO USO DE CLAVES',
                'COMPLETING TRANSLATIONS': 'COMPLETANDO TRADUCCIONES',
                'ANALYZING TRANSLATION SIZES': 'ANALIZANDO TAMAÑOS DE TRADUCCIÓN',
                'RUNNING COMPREHENSIVE I18N WORKFLOW': 'EJECUTANDO FLUJO DE TRABAJO I18N INTEGRAL',
                
                // Admin terms
                'Admin PIN Setup': 'Configuración de PIN de administrador',
                'Enter Admin PIN': 'Ingrese PIN de administrador',
                'Confirm Admin PIN': 'Confirme PIN de administrador',
                'PINs do not match': 'Los PINs no coinciden',
                'Authentication failed': 'Falló la autenticación',
                'Access denied': 'Acceso denegado',
                'Session authenticated': 'Sesión autenticada',
                'Security log': 'Registro de seguridad',
                
                // Common phrases
                'Please try again': 'Por favor intente de nuevo',
                'Would you like': '¿Le gustaría',
                'Select option': 'Seleccionar opción',
                'try again': 'intentar de nuevo',
                'choice': 'opción',
                'option': 'opción',
                'issue(s)': 'problema(s)',
                'warning(s)': 'advertencia(s)',
                'found': 'encontrado',
                'not': 'no'
            }
        };
    }

    /**
     * Translate English content in all locale files
     */
    async translateAll(dryRun = true) {
        console.log(`🌐 Translation Helper ${dryRun ? '(DRY RUN)' : '(LIVE)'}`);
        console.log('=====================================\n');
        
        const localeFiles = this.getLocaleFiles();
        let totalTranslations = 0;
        
        for (const file of localeFiles) {
            if (file.language === 'en') {
                continue; // Skip source language
            }
            
            console.log(`📄 Processing ${file.language}.json...`);
            const translations = await this.translateFile(file, dryRun);
            totalTranslations += translations;
        }
        
        console.log(`\n📊 Translation Summary:`);
        console.log(`   Total translations applied: ${totalTranslations}`);
        
        if (dryRun && totalTranslations > 0) {
            console.log('\n💡 Run with --apply to apply these translations\n');
        }
    }

    /**
     * Get all locale files
     */
    getLocaleFiles() {
        return fs.readdirSync(this.localesDir)
            .filter(file => file.endsWith('.json'))
            .map(file => ({
                filename: file,
                language: path.basename(file, '.json'),
                path: path.join(this.localesDir, file)
            }));
    }

    /**
     * Translate a single file
     */
    async translateFile(file, dryRun = true) {
        try {
            const content = fs.readFileSync(file.path, 'utf8');
            let translations = JSON.parse(content);
            let translationCount = 0;
            
            const mappings = this.translationMappings[file.language];
            if (!mappings) {
                console.log(`   ⚠️  No translation mappings available for ${file.language}`);
                return 0;
            }
            
            // Apply translations
            this.translateObject(translations, '', mappings, (key, oldValue, newValue) => {
                if (!dryRun) {
                    console.log(`   ✅ ${key}: "${oldValue}" → "${newValue}"`);
                }
                translationCount++;
            });
            
            if (translationCount > 0 && !dryRun) {
                fs.writeFileSync(file.path, JSON.stringify(translations, null, 2));
                console.log(`   💾 Saved ${translationCount} translations to ${file.filename}`);
            } else if (translationCount > 0) {
                console.log(`   🔍 Found ${translationCount} translatable items`);
            } else {
                console.log(`   ✨ No automatic translations available`);
            }
            
            return translationCount;
            
        } catch (error) {
            console.error(`   ❌ Error processing ${file.filename}: ${error.message}`);
            return 0;
        }
    }

    /**
     * Recursively translate object properties
     */
    translateObject(obj, keyPath, mappings, callback) {
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = keyPath ? `${keyPath}.${key}` : key;
            
            if (typeof value === 'string') {
                const translated = this.translateString(value, mappings);
                if (translated !== value) {
                    obj[key] = translated;
                    callback(currentPath, value, translated);
                }
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                this.translateObject(value, currentPath, mappings, callback);
            } else if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (typeof item === 'string') {
                        const translated = this.translateString(item, mappings);
                        if (translated !== item) {
                            value[index] = translated;
                            callback(`${currentPath}[${index}]`, item, translated);
                        }
                    }
                });
            }
        }
    }

    /**
     * Translate a single string
     */
    translateString(text, mappings) {
        let translated = text;
        
        // Remove [NOT TRANSLATED] markers
        translated = translated.replace(/\[NOT TRANSLATED\]\s*/g, '');
        
        // Apply direct mappings
        for (const [english, foreign] of Object.entries(mappings)) {
            // Case-insensitive replacement
            const regex = new RegExp(english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            translated = translated.replace(regex, foreign);
        }
        
        return translated;
    }

    /**
     * Generate translation report
     */
    async generateReport() {
        console.log('📊 Translation Coverage Report');
        console.log('===============================\n');
        
        const localeFiles = this.getLocaleFiles();
        
        for (const file of localeFiles) {
            if (file.language === 'en') continue;
            
            console.log(`📄 ${file.filename}:`);
            
            const content = fs.readFileSync(file.path, 'utf8');
            const translations = JSON.parse(content);
            
            const stats = {
                total: 0,
                translated: 0,
                untranslated: 0,
                hasEnglish: 0
            };
            
            this.analyzeTranslations(translations, stats);
            
            const coverage = ((stats.translated / stats.total) * 100).toFixed(1);
            
            console.log(`   Total keys: ${stats.total}`);
            console.log(`   Translated: ${stats.translated}`);
            console.log(`   Untranslated markers: ${stats.untranslated}`);
            console.log(`   Contains English: ${stats.hasEnglish}`);
            console.log(`   Coverage: ${coverage}%\n`);
        }
    }

    /**
     * Analyze translation statistics
     */
    analyzeTranslations(obj, stats) {
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                stats.total++;
                
                if (value.includes('[TRANSLATE]') || value.includes('[NOT TRANSLATED]')) {
                    stats.untranslated++;
                } else if (this.containsEnglish(value)) {
                    stats.hasEnglish++;
                } else {
                    stats.translated++;
                }
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                this.analyzeTranslations(value, stats);
            } else if (Array.isArray(value)) {
                value.forEach(item => {
                    if (typeof item === 'string') {
                        stats.total++;
                        
                        if (item.includes('[TRANSLATE]') || item.includes('[NOT TRANSLATED]')) {
                            stats.untranslated++;
                        } else if (this.containsEnglish(item)) {
                            stats.hasEnglish++;
                        } else {
                            stats.translated++;
                        }
                    }
                });
            }
        }
    }

    /**
     * Check if text contains English
     */
    containsEnglish(text) {
        const englishWords = [
            'error', 'warning', 'success', 'failed', 'loading', 'saving',
            'debug', 'tools', 'settings', 'configuration', 'options',
            'menu', 'back', 'main', 'invalid', 'choice', 'select',
            'please', 'try', 'again', 'found', 'not', 'available'
        ];
        
        const lowerText = text.toLowerCase();
        return englishWords.some(word => lowerText.includes(word));
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const helper = new TranslationHelper();
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Translation Helper Tool

Usage:
  node translate-mismatches.js [options]

Options:
  --translate          Show translation preview (dry run)
  --apply              Apply translations (live mode)
  --report             Generate translation coverage report
  --help, -h           Show this help message

Examples:
  node translate-mismatches.js --report              # Show coverage report
  node translate-mismatches.js --translate           # Preview translations
  node translate-mismatches.js --apply               # Apply translations
`);
        process.exit(0);
    }
    
    if (args.includes('--report')) {
        helper.generateReport().catch(error => {
            console.error('❌ Error:', error.message);
            process.exit(1);
        });
    } else if (args.includes('--translate') || args.includes('--apply')) {
        const dryRun = !args.includes('--apply');
        helper.translateAll(dryRun).catch(error => {
            console.error('❌ Error:', error.message);
            process.exit(1);
        });
    } else {
        console.log('Use --help for usage information');
    }
}

module.exports = TranslationHelper;