class ArgumentParser {
  constructor() {
    this.args = {
      _: []
    };
    this.parse(process.argv.slice(2));
  }

  parse(argv) {
    let currentOption = null;
    
    for (const arg of argv) {
      if (arg.startsWith('--')) {
        // Handle --option=value or --option value
        if (arg.includes('=')) {
          const [key, value] = arg.split('=');
          this.args[key.slice(2)] = value;
        } else {
          currentOption = arg.slice(2);
          this.args[currentOption] = true;
        }
      } else if (arg.startsWith('-')) {
        // Handle short options
        currentOption = arg.slice(1);
        this.args[currentOption] = true;
      } else if (currentOption) {
        // Handle option value
        this.args[currentOption] = arg;
        currentOption = null;
      } else {
        // Handle positional arguments
        this.args._.push(arg);
      }
    }
    
    return this.args;
  }
}

module.exports = ArgumentParser;
