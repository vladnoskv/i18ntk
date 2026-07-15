const fs = require('fs');
const os = require('os');
const path = require('path');
const SecurityUtils = require('./security');

const SKILL_NAME = 'i18ntk';
const SOURCE_DIR = path.join(__dirname, '..', 'skills', SKILL_NAME);

function pathExists(value) {
  try {
    fs.accessSync(path.resolve(value), fs.constants.F_OK);
    return true;
  } catch (_) {
    return false;
  }
}

function normalizeAgents(value) {
  if (!value) return null;
  const items = Array.isArray(value) ? value : String(value).split(/[;,]/);
  return new Set(items.map(item => String(item).trim().toLowerCase()).filter(Boolean));
}

function discoverSkillTargets(options = {}) {
  const home = path.resolve(options.homeDir || os.homedir());
  const project = path.resolve(options.projectRoot || process.cwd());
  const env = options.env || process.env;
  const includePotential = options.includePotential === true;
  const agentFilter = normalizeAgents(options.agents);
  const scopeFilter = options.scope && options.scope !== 'all' ? String(options.scope).toLowerCase() : null;
  const candidates = [];

  function add(id, agent, label, scope, root, explicit = false) {
    if (agentFilter && !agentFilter.has(agent)) return;
    if (scopeFilter && scope !== scopeFilter) return;
    const resolvedRoot = path.resolve(root);
    const parentDetected = pathExists(resolvedRoot) || pathExists(path.dirname(resolvedRoot));
    const detected = explicit || parentDetected;
    if (!detected && !includePotential && !agentFilter) return;
    candidates.push({ id, agent, label, scope, root: resolvedRoot, detected });
  }

  const codexHome = path.resolve(env.CODEX_HOME || path.join(home, '.codex'));
  const claudeHome = path.resolve(env.CLAUDE_CONFIG_DIR || path.join(home, '.claude'));
  add('codex-personal', 'codex', 'OpenAI Codex (personal)', 'personal', path.join(codexHome, 'skills'), Boolean(env.CODEX_HOME));
  add('claude-personal', 'claude', 'Claude Code (personal)', 'personal', path.join(claudeHome, 'skills'), Boolean(env.CLAUDE_CONFIG_DIR));
  add('copilot-personal', 'copilot', 'GitHub Copilot (personal)', 'personal', path.join(home, '.copilot', 'skills'));
  add('agents-personal', 'agents', 'Shared Agent Skills (personal)', 'personal', path.join(home, '.agents', 'skills'));

  add('codex-project', 'codex', 'OpenAI Codex (project)', 'project', path.join(project, '.codex', 'skills'));
  add('claude-project', 'claude', 'Claude Code (project)', 'project', path.join(project, '.claude', 'skills'));
  add('copilot-project', 'copilot', 'GitHub Copilot (project)', 'project', path.join(project, '.github', 'skills'));
  add('agents-project', 'agents', 'Shared Agent Skills (project)', 'project', path.join(project, '.agents', 'skills'));

  if (env.COPILOT_SKILLS_DIRS) {
    String(env.COPILOT_SKILLS_DIRS).split(/[;,]/).map(value => value.trim()).filter(Boolean)
      .forEach((root, index) => add(`copilot-custom-${index + 1}`, 'copilot', 'GitHub Copilot (custom)', 'personal', root, true));
  }

  const seen = new Set();
  return candidates.filter(candidate => {
    const key = process.platform === 'win32' ? candidate.root.toLowerCase() : candidate.root;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectSourceFiles(dir = SOURCE_DIR, relative = '') {
  const results = [];
  const entries = SecurityUtils.safeReaddirSync(dir, SOURCE_DIR, { withFileTypes: true }) || [];
  for (const entry of entries) {
    const childRelative = relative ? path.join(relative, entry.name) : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) results.push(...collectSourceFiles(fullPath, childRelative));
    else if (entry.isFile()) results.push({ fullPath, relativePath: childRelative });
  }
  return results;
}

function installSkillTarget(target, options = {}) {
  if (!target || typeof target.root !== 'string') throw new Error('Invalid skill installation target.');
  if (!pathExists(path.join(SOURCE_DIR, 'SKILL.md'))) throw new Error('Bundled i18ntk skill is missing.');

  const root = path.resolve(target.root);
  const destination = path.join(root, SKILL_NAME);
  const exists = pathExists(path.join(destination, 'SKILL.md'));
  if (exists && options.force !== true) {
    return { ...target, destination, status: 'skipped', reason: 'exists' };
  }
  if (options.dryRun === true) {
    return { ...target, destination, status: exists ? 'would-update' : 'would-install' };
  }

  fs.mkdirSync(root, { recursive: true });
  const sourceFiles = collectSourceFiles().filter(file => {
    if (target.agent === 'codex') return true;
    return file.relativePath.split(path.sep)[0] !== 'agents';
  });
  for (const file of sourceFiles) {
    const destinationFile = path.join(destination, file.relativePath);
    const content = SecurityUtils.safeReadFileSync(file.fullPath, SOURCE_DIR, 'utf8');
    if (content === null) throw new Error(`Unable to read bundled skill file: ${file.relativePath}`);
    if (!SecurityUtils.safeWriteFileSync(destinationFile, content, root)) {
      throw new Error(`Unable to install skill file: ${file.relativePath}`);
    }
  }
  return { ...target, destination, status: exists ? 'updated' : 'installed', files: sourceFiles.length };
}

function installSkillTargets(targets, options = {}) {
  return targets.map(target => installSkillTarget(target, options));
}

module.exports = {
  SKILL_NAME,
  SOURCE_DIR,
  discoverSkillTargets,
  installSkillTarget,
  installSkillTargets,
};
