/**
 * Simple CLI argument parser to replace commander
 * Supports commands, options, and flags
 */

class Command {
  constructor(name, description = '') {
    this.name = name;
    this.description = description;
    this.options = [];
    this.flags = [];
    this.commands = [];
    this.actionHandler = null;
    this.requiredArgs = [];
  }

  description(desc) {
    this.description = desc;
    return this;
  }

  option(flags, description, defaultValue, required = false) {
    const option = {
      flags,
      description,
      required,
      defaultValue,
      long: flags.split(/\s*,\s*/).find(f => f.startsWith('--')).replace('--', ''),
      short: (flags.split(/\s*,\s*/).find(f => f.startsWith('-') && !f.startsWith('--')) || '').replace(/-/g, '')
    };
    
    this.options.push(option);
    return this;
  }

  requiredOption(flags, description, defaultValue) {
    return this.option(flags, description, defaultValue, true);
  }

  argument(name, description, validator) {
    this.requiredArgs.push({ name, description, validator });
    return this;
  }

  action(handler) {
    this.actionHandler = handler;
    return this;
  }

  command(name, description) {
    const cmd = new Command(name, description);
    this.commands.push(cmd);
    return cmd;
  }

  helpInformation() {
    let help = [];
    
    if (this.description) {
      help.push(`  ${this.description}\n`);
    }
    
    help.push('Usage:');
    help.push(`  ${process.argv[1]} ${this.name} [options]`);
    
    if (this.requiredArgs.length > 0) {
      help.push('\nArguments:');
      this.requiredArgs.forEach(arg => {
        help.push(`  ${arg.name.padEnd(20)} ${arg.description}`);
      });
    }
    
    if (this.options.length > 0) {
      help.push('\nOptions:');
      this.options.forEach(opt => {
        const flags = [
          opt.short ? `-${opt.short}` : null,
          `--${opt.long}${opt.defaultValue !== undefined ? ` <${opt.long}>` : ''}`
        ].filter(Boolean).join(', ');
        
        let desc = opt.description || '';
        if (opt.defaultValue !== undefined) {
          desc += ` (default: ${opt.defaultValue})`;
        }
        
        help.push(`  ${flags.padEnd(30)} ${desc}`);
      });
    }
    
    if (this.commands.length > 0) {
      help.push('\nCommands:');
      this.commands.forEach(cmd => {
        help.push(`  ${cmd.name.padEnd(20)} ${cmd.description || ''}`);
      });
    }
    
    return help.join('\n');
  }

  parse(argv = process.argv.slice(2)) {
    const args = {};
    const commandArgs = [];
    let currentCommand = null;
    
    // Set default values
    this.options.forEach(opt => {
      if (opt.defaultValue !== undefined) {
        args[opt.long] = opt.defaultValue;
      }
    });
    
    // Parse arguments
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      
      // Check for commands
      if (!arg.startsWith('-')) {
        const cmd = this.commands.find(c => c.name === arg);
        if (cmd) {
          currentCommand = cmd;
          continue;
        }
        commandArgs.push(arg);
        continue;
      }
      
      // Handle --option=value
      if (arg.includes('=')) {
        const [key, value] = arg.split('=');
        const option = this.options.find(opt => 
          `--${opt.long}` === key || (opt.short && `-${opt.short}` === key)
        );
        
        if (option) {
          args[option.long] = value === 'true' ? true : (value === 'false' ? false : value);
        }
        continue;
      }
      
      // Handle --option value or -o value
      const option = this.options.find(opt => 
        `--${opt.long}` === arg || (opt.short && `-${opt.short}` === arg)
      );
      
      if (option) {
        if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
          const value = argv[++i];
          args[option.long] = value === 'true' ? true : (value === 'false' ? false : value);
        } else {
          args[option.long] = true;
        }
        continue;
      }
      
      // Handle --no-* flags
      if (arg.startsWith('--no-')) {
        const flagName = arg.substring(5);
        args[flagName] = false;
        continue;
      }
    }
    
    // Check required options
    const missingOptions = this.options
      .filter(opt => opt.required && args[opt.long] === undefined)
      .map(opt => `--${opt.long}`);
    
    if (missingOptions.length > 0) {
      throw new Error(`Missing required options: ${missingOptions.join(', ')}`);
    }
    
    // Check required arguments
    if (commandArgs.length < this.requiredArgs.length) {
      const missingArgs = this.requiredArgs
        .slice(commandArgs.length)
        .map(arg => `<${arg.name}>`);
      
      throw new Error(`Missing required arguments: ${missingArgs.join(' ')}`);
    }
    
    // Call action handler
    if (this.actionHandler) {
      const actionArgs = commandArgs.slice(0, this.requiredArgs.length);
      const remainingArgs = commandArgs.slice(this.requiredArgs.length);
      
      // Validate argument types if validators are provided
      for (let i = 0; i < this.requiredArgs.length; i++) {
        const arg = this.requiredArgs[i];
        if (arg.validator && !arg.validator(actionArgs[i])) {
          throw new Error(`Invalid value for argument ${arg.name}: ${actionArgs[i]}`);
        }
      }
      
      return this.actionHandler(...actionArgs, { ...args, _args: remainingArgs });
    }
    
    // If we have a command, parse with that
    if (currentCommand) {
      return currentCommand.parse(commandArgs);
    }
    
    return { ...args, _args: commandArgs };
  }
}

function program(name = '') {
  return new Command(name);
}

module.exports = { program, Command };
