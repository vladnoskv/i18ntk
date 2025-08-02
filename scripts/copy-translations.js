// This script copies English translation files to other language directories,
// prefixing the keys with the country code and using the English value as a fallback.

const fs = require('fs');
const path = require('path');

const uiLocalesPath = path.join(__dirname, '..', 'ui-locales');
const englishLocalesPath = path.join(uiLocalesPath, 'en');

function copyTranslations() {
    console.log('Starting translation copy process...');

    // Read all English JSON files
    const englishFiles = fs.readdirSync(englishLocalesPath).filter(file => file.endsWith('.json'));

    // Get all language directories except 'en'
    const languageDirs = fs.readdirSync(uiLocalesPath)
        .filter(dir => fs.statSync(path.join(uiLocalesPath, dir)).isDirectory() && dir !== 'en');

    for (const lang of languageDirs) {
        console.log(`Processing language: ${lang}`);
        const langPath = path.join(uiLocalesPath, lang);

        for (const file of englishFiles) {
            const englishFilePath = path.join(englishLocalesPath, file);
            const langFilePath = path.join(langPath, file);

            try {
                const englishContent = JSON.parse(fs.readFileSync(englishFilePath, 'utf8'));
                let langContent = {};

                if (fs.existsSync(langFilePath)) {
                    langContent = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));
                }

                let changesMade = false;

                // Function to recursively synchronize keys
                function synchronizeKeys(source, target, currentPath = '') {
                    let currentChanges = false;

                    // Add missing keys from source to target
                    for (const key in source) {
                        if (Object.hasOwnProperty.call(source, key)) {
                            const fullPath = currentPath ? `${currentPath}.${key}` : key;
                            if (typeof source[key] === 'object' && source[key] !== null) {
                                if (!Object.hasOwnProperty.call(target, key) || typeof target[key] !== 'object' || target[key] === null) {
                                    target[key] = {};
                                    currentChanges = true;
                                }
                                if (synchronizeKeys(source[key], target[key], fullPath)) {
                                    currentChanges = true;
                                }
                            } else {
                                if (!Object.hasOwnProperty.call(target, key)) {
                                    target[key] = `[${lang.toUpperCase()}] ${source[key]}`;
                                    currentChanges = true;
                                }
                            }
                        }
                    }

                    // Remove extra keys from target that are not in source
                    for (const key in target) {
                        if (Object.hasOwnProperty.call(target, key)) {
                            if (!Object.hasOwnProperty.call(source, key)) {
                                delete target[key];
                                currentChanges = true;
                            }
                        }
                    }
                    return currentChanges;
                }

                if (synchronizeKeys(englishContent, langContent)) {
                    fs.writeFileSync(langFilePath, JSON.stringify(langContent, null, 2), 'utf8');
                    console.log(`  Updated ${file} for ${lang}`);
                } else {
                    console.log(`  No changes needed for ${file} in ${lang}`);
                }

            } catch (error) {
                console.error(`Error processing ${file} for ${lang}: ${error.message}`);
            }
        }
    }
    console.log('Translation copy process completed.');
}

copyTranslations();