/**
 * Settings Web Server
 * Express.js server for the web-based settings interface
 */

const express = require('express');
const path = require('path');
const settingsManager = require('./settings-manager');

class SettingsServer {
    constructor() {
        this.app = express();
        this.server = null;
        this.port = 3000;
        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // Parse JSON bodies
        this.app.use(express.json());
        
        // Parse URL-encoded bodies
        this.app.use(express.urlencoded({ extended: true }));
        
        // Serve static files from settings directory
        this.app.use('/settings', express.static(path.join(__dirname, 'settings')));
        
        // CORS headers for local development
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });
    }

    /**
     * Setup API routes
     */
    setupRoutes() {
        // Serve the settings page
        this.app.get('/', (req, res) => {
            res.redirect('/settings');
        });

        this.app.get('/settings', (req, res) => {
            res.sendFile(path.join(__dirname, 'settings', 'index.html'));
        });

        // API Routes
        
        // Get current settings
        this.app.get('/api/settings', (req, res) => {
            try {
                const settings = settingsManager.getSettings();
                res.json({
                    success: true,
                    data: settings
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Get settings schema
        this.app.get('/api/settings/schema', (req, res) => {
            try {
                const schema = settingsManager.getSettingsSchema();
                res.json({
                    success: true,
                    data: schema
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Get available languages
        this.app.get('/api/languages', (req, res) => {
            try {
                const languages = settingsManager.getAvailableLanguages();
                res.json({
                    success: true,
                    data: languages
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Update settings
        this.app.post('/api/settings', (req, res) => {
            try {
                const newSettings = req.body;
                
                if (!newSettings || typeof newSettings !== 'object') {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid settings data provided'
                    });
                }

                const success = settingsManager.saveSettings(newSettings);
                
                if (success) {
                    res.json({
                        success: true,
                        message: 'Settings saved successfully',
                        data: settingsManager.getSettings()
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        error: 'Failed to save settings'
                    });
                }
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Update a specific setting
        this.app.put('/api/settings/:key', (req, res) => {
            try {
                const key = req.params.key;
                const { value } = req.body;
                
                if (value === undefined) {
                    return res.status(400).json({
                        success: false,
                        error: 'Value is required'
                    });
                }

                const success = settingsManager.setSetting(key, value);
                
                if (success) {
                    res.json({
                        success: true,
                        message: `Setting '${key}' updated successfully`,
                        data: {
                            key,
                            value: settingsManager.getSetting(key)
                        }
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        error: `Failed to update setting '${key}'`
                    });
                }
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Reset settings to defaults
        this.app.post('/api/settings/reset', (req, res) => {
            try {
                const success = settingsManager.resetToDefaults();
                
                if (success) {
                    res.json({
                        success: true,
                        message: 'Settings reset to defaults successfully',
                        data: settingsManager.getSettings()
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        error: 'Failed to reset settings'
                    });
                }
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Validate settings
        this.app.post('/api/settings/validate', (req, res) => {
            try {
                const settings = req.body;
                const isValid = settingsManager.validateSettings(settings);
                
                res.json({
                    success: true,
                    data: {
                        valid: isValid
                    }
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({
                success: true,
                message: 'Settings server is running',
                timestamp: new Date().toISOString()
            });
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found'
            });
        });

        // Error handler
        this.app.use((error, req, res, next) => {
            console.error('❌ Server error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        });
    }

    /**
     * Start the server
     * @param {number} port - Port to listen on
     * @returns {Promise} Promise that resolves when server starts
     */
    start(port = null) {
        return new Promise((resolve, reject) => {
            const serverPort = port || this.port;
            
            // Find available port if the default is in use
            this.findAvailablePort(serverPort)
                .then(availablePort => {
                    this.server = this.app.listen(availablePort, () => {
                        this.port = availablePort;
                        console.log(`\n🌐 Settings server started at: http://localhost:${availablePort}`);
                        console.log(`📱 Settings page: http://localhost:${availablePort}/settings`);
                        console.log(`🔧 API endpoint: http://localhost:${availablePort}/api`);
                        resolve({
                            port: availablePort,
                            url: `http://localhost:${availablePort}`,
                            settingsUrl: `http://localhost:${availablePort}/settings`
                        });
                    });
                    
                    this.server.on('error', (error) => {
                        reject(error);
                    });
                })
                .catch(reject);
        });
    }

    /**
     * Stop the server
     * @returns {Promise} Promise that resolves when server stops
     */
    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('🛑 Settings server stopped');
                    this.server = null;
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Find an available port starting from the given port
     * @param {number} startPort - Starting port to check
     * @returns {Promise<number>} Available port
     */
    findAvailablePort(startPort) {
        return new Promise((resolve, reject) => {
            const net = require('net');
            
            const checkPort = (port) => {
                const server = net.createServer();
                
                server.listen(port, () => {
                    server.once('close', () => {
                        resolve(port);
                    });
                    server.close();
                });
                
                server.on('error', () => {
                    if (port < startPort + 10) {
                        checkPort(port + 1);
                    } else {
                        reject(new Error(`No available port found between ${startPort} and ${startPort + 10}`));
                    }
                });
            };
            
            checkPort(startPort);
        });
    }

    /**
     * Get server info
     * @returns {object} Server information
     */
    getInfo() {
        return {
            running: !!this.server,
            port: this.port,
            url: this.server ? `http://localhost:${this.port}` : null,
            settingsUrl: this.server ? `http://localhost:${this.port}/settings` : null
        };
    }
}

// Export singleton instance
module.exports = new SettingsServer();

// If run directly, start the server
if (require.main === module) {
    const server = new SettingsServer();
    server.start()
        .then((info) => {
            console.log('✅ Settings server started successfully');
            console.log('Press Ctrl+C to stop the server');
        })
        .catch((error) => {
            console.error('❌ Failed to start settings server:', error.message);
            process.exit(1);
        });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down settings server...');
        server.stop().then(() => {
            process.exit(0);
        });
    });
}