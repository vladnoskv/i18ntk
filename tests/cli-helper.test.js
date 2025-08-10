/**
 * Tests for CLI Helper - Shared Readline Interface Management
 * 
 * Validates the centralized CLI helper functionality including:
 * - Single readline instance management
 * - Hidden input behavior for PIN entry
 * - Proper cleanup and resource management
 * - Prevention of duplicate readline instances
 * 
 * @version 1.7.0
 * @since 2025-08-08
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const cliHelper = require('../utils/cli-helper');

describe('CLI Helper Tests', () => {
  let mockReadline;
  let mockInterface;

  beforeEach(() => {
    // Reset CLI helper singleton
    cliHelper.close();
    
    // Mock readline interface
    mockInterface = {
      question: jest.fn(),
      close: jest.fn(),
      input: {
        on: jest.fn(),
        off: jest.fn(),
        removeListener: jest.fn()
      },
      output: {
        write: jest.fn()
      }
    };
    
    // Mock readline.createInterface
    mockReadline = {
      createInterface: jest.fn().mockReturnValue(mockInterface)
    };
    
    // Replace readline with mock
    jest.spyOn(readline, 'createInterface').mockImplementation(mockReadline.createInterface);
  });

  afterEach(() => {
    cliHelper.close();
    jest.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    test('should create only one readline instance', () => {
      const instance1 = cliHelper.getInterface();
      const instance2 = cliHelper.getInterface();
      
      expect(instance1).toBe(instance2);
      expect(readline.createInterface).toHaveBeenCalledTimes(1);
    });

    test('should not create new instance when already initialized', () => {
      cliHelper.initialize();
      cliHelper.initialize();
      
      expect(readline.createInterface).toHaveBeenCalledTimes(1);
    });
  });

  describe('Resource Management', () => {
    test('should properly close readline interface', () => {
      cliHelper.getInterface();
      cliHelper.close();
      
      expect(mockInterface.close).toHaveBeenCalled();
      expect(cliHelper.isActive()).toBe(false);
    });

    test('should handle multiple close calls gracefully', () => {
      cliHelper.getInterface();
      cliHelper.close();
      cliHelper.close();
      
      expect(mockInterface.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('Input Masking', () => {
    test('should mask PIN input with asterisks', async () => {
      const mockQuestion = jest.fn((question, callback) => {
        setTimeout(() => callback('1234'), 10);
      });
      mockInterface.question = mockQuestion;

      const promptPromise = cliHelper.promptPin('Enter PIN: ');
      
      // Simulate keypress events
      const inputHandler = mockInterface.input.on.mock.calls.find(
        call => call[0] === 'data'
      )[1];
      
      // Test normal character
      inputHandler(Buffer.from('1'));
      expect(mockInterface.output.write).toHaveBeenCalledWith('*');
      
      // Test backspace
      inputHandler(Buffer.from('\b'));
      expect(mockInterface.output.write).toHaveBeenCalledWith('\b \b');
      
      // Test enter
      inputHandler(Buffer.from('\n'));
      expect(mockInterface.output.write).toHaveBeenCalledWith('\n');
      
      const result = await promptPromise;
      expect(result).toBe('1234');
    });

    test('should mask password input when requested', async () => {
      const mockQuestion = jest.fn((question, callback) => {
        setTimeout(() => callback('secret'), 10);
      });
      mockInterface.question = mockQuestion;

      const promptPromise = cliHelper.prompt('Password: ', true);
      
      // Simulate keypress events
      const keypressHandler = mockInterface.input.on.mock.calls.find(
        call => call[0] === 'keypress'
      )[1];
      
      // Test normal character
      keypressHandler('s', { name: 's' });
      expect(mockInterface.output.write).toHaveBeenCalledWith('*');
      
      // Test backspace
      keypressHandler(null, { name: 'backspace' });
      expect(mockInterface.output.write).toHaveBeenCalledWith('\b \b');
      
      const result = await promptPromise;
      expect(result).toBe('secret');
    });
  });

  describe('Confirmation Prompts', () => {
    test('should handle yes/no confirmations', async () => {
      const mockQuestion = jest.fn((question, callback) => {
        setTimeout(() => callback('y'), 10);
      });
      mockInterface.question = mockQuestion;

      const result = await cliHelper.confirm('Continue?');
      expect(result).toBe(true);
    });

    test('should handle default values', async () => {
      const mockQuestion = jest.fn((question, callback) => {
        setTimeout(() => callback(''), 10);
      });
      mockInterface.question = mockQuestion;

      const result = await cliHelper.confirm('Continue?', true);
      expect(result).toBe(true);
    });

    test('should handle case-insensitive responses', async () => {
      const mockQuestion = jest.fn((question, callback) => {
        setTimeout(() => callback('YES'), 10);
      });
      mockInterface.question = mockQuestion;

      const result = await cliHelper.confirm('Continue?');
      expect(result).toBe(true);
    });
  });

  describe('Menu Selection', () => {
    test('should return correct menu selection', async () => {
      let callCount = 0;
      const mockQuestion = jest.fn((question, callback) => {
        if (callCount === 0) {
          callCount++;
          setTimeout(() => callback('2'), 10);
        } else {
          setTimeout(() => callback('1'), 10);
        }
      });
      mockInterface.question = mockQuestion;

      const result = await cliHelper.selectMenu(['Option 1', 'Option 2']);
      expect(result).toBe(1);
    });

    test('should handle invalid input and retry', async () => {
      let callCount = 0;
      const mockQuestion = jest.fn((question, callback) => {
        if (callCount === 0) {
          callCount++;
          setTimeout(() => callback('invalid'), 10);
        } else {
          setTimeout(() => callback('1'), 10);
        }
      });
      mockInterface.question = mockQuestion;

      const result = await cliHelper.selectMenu(['Option 1']);
      expect(result).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    test('should work with real readline interface', (done) => {
      // This test uses actual readline interface
      jest.restoreAllMocks();
      
      const testScript = `
        const cliHelper = require('../utils/cli-helper');
        (async () => {
          const rl = cliHelper.getInterface();
          console.log('Interface created:', !!rl);
          console.log('Active:', cliHelper.isActive());
          cliHelper.close();
          console.log('Active after close:', cliHelper.isActive());
          process.exit(0);
        })();
      `;

      const testFile = path.join(__dirname, 'temp-test.js');
      fs.writeFileSync(testFile, testScript);

      const child = spawn('node', [testFile], { 
        cwd: __dirname,
        stdio: 'pipe'
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        fs.unlinkSync(testFile);
        expect(code).toBe(0);
        expect(output).toContain('Interface created: true');
        expect(output).toContain('Active: true');
        expect(output).toContain('Active after close: false');
        done();
      });
    }, 10000);
  });

  describe('Error Handling', () => {
    test('should handle readline creation errors gracefully', () => {
      jest.spyOn(readline, 'createInterface').mockImplementation(() => {
        throw new Error('Readline creation failed');
      });

      expect(() => cliHelper.getInterface()).toThrow('Readline creation failed');
    });

    test('should handle prompt errors gracefully', async () => {
      const mockQuestion = jest.fn((question, callback) => {
        throw new Error('Prompt error');
      });
      mockInterface.question = mockQuestion;

      await expect(cliHelper.prompt('test')).rejects.toThrow('Prompt error');
    });
  });

  describe('Cleanup Tests', () => {
    test('should remove all event listeners on close', () => {
      cliHelper.getInterface();
      cliHelper.close();
      
      expect(mockInterface.input.removeListener).toHaveBeenCalled();
      expect(mockInterface.input.off).toHaveBeenCalled();
    });

    test('should not leave dangling references', () => {
      const originalRl = cliHelper.rl;
      cliHelper.close();
      
      expect(cliHelper.rl).toBeNull();
      expect(cliHelper.isInitialized).toBe(false);
    });
  });
});

// Performance test
if (require.main === module) {
  console.log('Running CLI Helper tests...');
  
  // Simple performance benchmark
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    cliHelper.getInterface();
  }
  cliHelper.close();
  const end = Date.now();
  
  console.log(`1000 interface calls took ${end - start}ms`);
  console.log('Tests completed.');
}