const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const localesDir = path.resolve(__dirname, '..', 'locales');

test('bundled locale fixtures expose the same namespace files for every target language', () => {
  const sourceLanguage = 'en';
  const sourceDir = path.join(localesDir, sourceLanguage);
  const sourceNamespaces = new Set(
    fs.readdirSync(sourceDir).filter(file => file.endsWith('.json'))
  );

  const languageDirs = fs.readdirSync(localesDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== sourceLanguage)
    .map(entry => entry.name);

  for (const language of languageDirs) {
    const languageDir = path.join(localesDir, language);
    const namespaces = fs.readdirSync(languageDir).filter(file => file.endsWith('.json'));
    const dangling = namespaces.filter(namespace => !sourceNamespaces.has(namespace));

    assert.deepEqual(dangling, [], `${language} has namespaces missing from ${sourceLanguage}`);
  }
});
