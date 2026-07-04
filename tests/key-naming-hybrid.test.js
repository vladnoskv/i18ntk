const assert = require('node:assert/strict');
const test = require('node:test');

const I18nValidator = require('../main/i18ntk-validate');

test('validateKeyNaming accepts dot paths with snake_case segments', () => {
  const validator = new I18nValidator({ keyStyle: 'dot.notation' });
  const source = {
    home: { header: { nav: { my_duels: 'My duels' } } },
    markets: { detail: { prediction_summary: { sign_in_prompt: 'Sign in' } } },
    coming_soon: { form: { full_name_placeholder: 'Full name' } }
  };

  const result = validator.validateKeyNaming(source);

  assert.equal(result.violationCount, 0);
});

test('validateKeyNaming rejects malformed hybrid keys', () => {
  const validator = new I18nValidator({ keyStyle: 'dot.notation' });
  const source = {
    '.home': 'bad',
    home: {
      Header: { Nav: 'bad' },
      'trailing.': 'bad'
    }
  };

  const result = validator.validateKeyNaming(source);

  assert.deepEqual(result.violations.map((violation) => violation.key).sort(), [
    '.home',
    'home.Header.Nav',
    'home.trailing.'
  ]);
});
