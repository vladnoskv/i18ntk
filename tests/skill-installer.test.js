const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { discoverSkillTargets, installSkillTarget } = require('../utils/skill-installer');

test('skill discovery finds Codex, Claude, Copilot, and shared agent roots', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-skills-'));
  const home = path.join(root, 'home');
  const project = path.join(root, 'project');
  for (const dir of ['.codex', '.claude', '.copilot', '.agents']) fs.mkdirSync(path.join(home, dir), { recursive: true });
  for (const dir of ['.claude', '.github', '.agents']) fs.mkdirSync(path.join(project, dir), { recursive: true });
  try {
    const targets = discoverSkillTargets({ homeDir: home, projectRoot: project, env: {} });
    assert.ok(targets.some(target => target.id === 'codex-personal'));
    assert.ok(targets.some(target => target.id === 'claude-personal'));
    assert.ok(targets.some(target => target.id === 'copilot-personal'));
    assert.ok(targets.some(target => target.id === 'agents-personal'));
    assert.ok(targets.some(target => target.id === 'claude-project'));
    assert.ok(targets.some(target => target.id === 'copilot-project'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('skill installation keeps OpenAI metadata only for Codex targets', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-skills-install-'));
  try {
    const codex = installSkillTarget({ id: 'codex', agent: 'codex', label: 'Codex', scope: 'personal', root: path.join(root, 'codex') });
    const claude = installSkillTarget({ id: 'claude', agent: 'claude', label: 'Claude', scope: 'personal', root: path.join(root, 'claude') });
    assert.equal(codex.status, 'installed');
    assert.equal(claude.status, 'installed');
    assert.ok(fs.existsSync(path.join(codex.destination, 'agents', 'openai.yaml')));
    assert.ok(!fs.existsSync(path.join(claude.destination, 'agents', 'openai.yaml')));
    assert.ok(fs.existsSync(path.join(claude.destination, 'references', 'configuration.md')));
    assert.equal(installSkillTarget({ id: 'claude', agent: 'claude', label: 'Claude', scope: 'personal', root: path.join(root, 'claude') }).status, 'skipped');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
