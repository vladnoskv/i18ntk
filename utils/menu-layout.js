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
  null,
  [0, 'exit'],
];

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
      return `${String(number).padStart(2, ' ')}. ${t(`menu.options.${key}`)}`;
    }),
  ];
}

module.exports = {
  buildMainMenuLines,
};
