const { discoverSkillTargets, installSkillTargets } = require('../../../utils/skill-installer');
const path = require('path');
const SecurityUtils = require('../../../utils/security');

class SkillsCommand {
  constructor(config = {}) {
    this.config = config;
    this.prompt = null;
    this.isNonInteractiveMode = false;
  }

  setRuntimeDependencies(prompt, isNonInteractiveMode) {
    this.prompt = prompt;
    this.isNonInteractiveMode = isNonInteractiveMode;
  }

  async execute(options = {}) {
    const interactive = options.fromMenu === true && !this.isNonInteractiveMode && this.prompt;
    const candidates = discoverSkillTargets({
      projectRoot: this.config.projectRoot || process.cwd(),
      agents: options.agents,
      scope: options.scope,
      includePotential: interactive,
    });

    if (candidates.length === 0) {
      return { success: false, error: 'No supported LLM skill directories were detected. Use --agents=codex,claude,copilot with --scope=personal or project.' };
    }

    let selected = options.agents ? candidates : candidates.filter(target => target.detected);
    if (interactive) {
      console.log('\nDetected and supported LLM skill destinations:');
      candidates.forEach((target, index) => {
        console.log(`  ${index + 1}. ${target.label}${target.detected ? ' [detected]' : ' [available]'}\n     ${target.root}`);
      });
      const defaults = selected.map(target => candidates.indexOf(target) + 1).join(',');
      const answer = await this.prompt(`Select destinations (comma-separated${defaults ? `, Enter for ${defaults}` : ''}): `);
      const indexes = String(answer || defaults).split(/[\s,]+/).map(Number)
        .filter(index => Number.isInteger(index) && index >= 1 && index <= candidates.length);
      selected = [...new Set(indexes)].map(index => candidates[index - 1]);
      if (selected.length === 0) return { success: false, error: 'No skill destinations selected.' };

      const existing = selected.some(target => SecurityUtils.safeExistsSync(path.join(target.root, 'i18ntk', 'SKILL.md'), target.root));
      if (existing && options.force !== true) {
        const update = await this.prompt('Update existing i18ntk skill installations? (y/N): ');
        options.force = /^(y|yes)$/i.test(String(update).trim());
      }
      const confirm = await this.prompt(`${options.dryRun ? 'Preview' : 'Install'} i18ntk skill in ${selected.length} destination(s)? (Y/n): `);
      if (/^(n|no)$/i.test(String(confirm).trim())) return { success: false, error: 'Skill installation cancelled.' };
    }

    if (selected.length === 0) {
      return { success: false, error: 'No existing skill directories matched. Specify --agents and --scope to create one.' };
    }

    const results = installSkillTargets(selected, { force: options.force === true, dryRun: options.dryRun === true });
    for (const result of results) console.log(`${result.status}: ${result.label} -> ${result.destination}`);
    return { success: true, command: 'skills', results };
  }
}

module.exports = SkillsCommand;
