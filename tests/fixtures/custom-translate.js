module.exports = async function customTranslate(text, { targetLang }) {
  return `[${targetLang}] ${text}`;
};
