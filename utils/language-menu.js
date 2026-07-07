/**
 * Helpers for language selection menus.
 */

function formatLanguagePrompt(prompt, maxOption) {
  const max = String(maxOption);
  const fallback = `Select a language (0-${max}):`;
  const text = typeof prompt === 'string' && prompt.trim() ? prompt : fallback;

  if (text.includes('{max}')) {
    return text.replace(/\{max\}/g, max);
  }

  const updated = text.replace(/\(0\s*[-–—~～]\s*\d+\)/u, `(0-${max})`);
  return updated === text ? `${text.replace(/\s*$/, '')} (0-${max}):` : updated;
}

module.exports = {
  formatLanguagePrompt
};
