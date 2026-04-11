/**
 * Minimal zero-dependency subset of commander used by i18ntk language CLIs.
 */

function toCamelCase(input) {
  return String(input || '').replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function parseOptionDefinition(flags, defaultValue) {
  const longMatch = flags.match(/--([a-zA-Z0-9-]+)/);
  const shortMatch = flags.match(/(^|\s)-([a-zA-Z])(\s|,|$)/);
  const hasValue = /<[^>]+>/.test(flags);
  const longName = longMatch ? longMatch[1] : null;
  const shortName = shortMatch ? shortMatch[2] : null;
  const name = toCamelCase(longName || shortName || '');

  return {
    flags,
    hasValue,
    defaultValue,
    longFlag: longName ? `--${longName}` : null,
    shortFlag: shortName ? `-${shortName}` : null,
    name
  };
}

function parseOptions(args, optionDefs) {
  const options = {};

  for (const def of optionDefs) {
    if (def.defaultValue !== undefined) {
      options[def.name] = def.defaultValue;
    } else if (!def.hasValue) {
      options[def.name] = false;
    }
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg || !arg.startsWith('-')) {
      continue;
    }

    let matchedDef = null;
    let inlineValue;

    if (arg.startsWith('--')) {
      const [flag, value] = arg.split('=', 2);
      matchedDef = optionDefs.find(def => def.longFlag === flag);
      inlineValue = value;
    } else {
      matchedDef = optionDefs.find(def => def.shortFlag === arg);
    }

    if (!matchedDef) {
      continue;
    }

    if (!matchedDef.hasValue) {
      options[matchedDef.name] = true;
      continue;
    }

    let value = inlineValue;
    if (value === undefined) {
      const next = args[i + 1];
      if (next !== undefined && !String(next).startsWith('-')) {
        value = next;
        i++;
      }
    }

    options[matchedDef.name] = value !== undefined ? value : '';
  }

  return options;
}

class MiniCommand {
  constructor(name) {
    this._name = name;
    this._description = '';
    this._options = [];
    this._action = null;
  }

  description(text) {
    this._description = text;
    return this;
  }

  option(flags, _description, defaultValue) {
    this._options.push(parseOptionDefinition(flags, defaultValue));
    return this;
  }

  action(handler) {
    this._action = handler;
    return this;
  }

  execute(args) {
    const parsed = parseOptions(args, this._options);
    if (typeof this._action === 'function') {
      const result = this._action(parsed);
      if (result && typeof result.then === 'function') {
        result.catch(error => {
          console.error(error && error.message ? error.message : String(error));
          process.exit(1);
        });
      }
    }
  }
}

class MiniProgram {
  constructor() {
    this._name = '';
    this._description = '';
    this._version = '';
    this._options = [];
    this._commands = [];
    this._opts = {};
  }

  name(value) {
    this._name = value;
    return this;
  }

  description(value) {
    this._description = value;
    return this;
  }

  version(value) {
    this._version = value;
    return this;
  }

  option(flags, _description, defaultValue) {
    this._options.push(parseOptionDefinition(flags, defaultValue));
    return this;
  }

  command(name) {
    const command = new MiniCommand(name);
    this._commands.push(command);
    return command;
  }

  opts() {
    return { ...this._opts };
  }

  parse(argv = process.argv) {
    const args = argv.slice(2);

    if (this._commands.length > 0 && args.length > 0 && !args[0].startsWith('-')) {
      const command = this._commands.find(item => item._name === args[0]);
      if (command) {
        command.execute(args.slice(1));
        return this;
      }
    }

    this._opts = parseOptions(args, this._options);
    return this;
  }
}

function createProgram() {
  return new MiniProgram();
}

module.exports = {
  createProgram,
  program: createProgram()
};
