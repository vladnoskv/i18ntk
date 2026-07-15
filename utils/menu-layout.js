const DEFAULT_OPTIONS = [
  [1, 'init'],
  [2, 'analyze'],
  [3, 'validate'],
  [4, 'usage'],
  [5, 'complete'],
  null,
  [6, 'sizing'],
  [7, 'fix'],
  [8, 'status'],
  [9, 'delete'],
  null,
  [10, 'settings'],
  [11, 'help'],
  [12, 'language'],
  [13, 'scanner'],
  [14, 'translate'],
  [15, 'skills'],
  null,
  [0, 'exit'],
];

const OPTION_FALLBACKS = {
  skills: 'Install i18ntk skill for LLM agents',
};

function buildMainMenuLines(translate, options = {}) {
  const t = typeof translate === 'function' ? translate : key => key;
  const includeTranslate = options.includeTranslate !== false;
  const menuOptions = DEFAULT_OPTIONS.filter(option => includeTranslate || !option || option[1] !== 'translate');

  return [
    '',
    t('menu.title'),
    t('menu.separator'),
    ...menuOptions.map(option => {
      if (!option) return '';
      const [number, key] = option;
      const translationKey = `menu.options.${key}`;
      const translated = t(translationKey);
      const label = !translated || translated === translationKey || translated.includes(translationKey)
        ? (OPTION_FALLBACKS[key] || translationKey)
        : translated;
      return `${String(number).padStart(2, ' ')}. ${label}`;
    }),
  ];
}

module.exports = {
  buildMainMenuLines,
};
