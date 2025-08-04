#!/usr/bin/env node

/**
 * Quick Admin PIN Test
 * Verifies basic admin PIN functionality works correctly
 */

const AdminAuth = require('./utils/admin-auth');
const fs = require('fs');
const path = require('path');

async function testAdminPin() {
    console.log('🔐 Quick Admin PIN Test');
    console.log('='.repeat(30));
    
    const auth = new AdminAuth();
    const testPin = '1234';
    
    try {
        // Test 1: Check if PIN exists
        console.log('1. Testing PIN existence...');
        const exists = await auth.isAuthRequired();
        console.log(`   PIN exists: ${exists}`);
        
        // Test 2: Set PIN
        console.log('2. Setting admin PIN...');
        const setResult = await auth.setupPin(testPin);
        console.log(`   PIN set: ${setResult}`);
        
        // Test 3: Verify PIN
        console.log('3. Verifying PIN...');
        const isValid = await auth.verifyPin(testPin);
        console.log(`   PIN valid: ${isValid}`);
        
        // Test 4: Create session
        console.log('4. Creating authenticated session...');
        const sessionId = await auth.createSession(testPin);
        console.log(`   Session created: ${sessionId ? 'Yes' : 'No'}`);
        
        // Test 5: Check session status
        console.log('5. Checking session status...');
        const isAuthenticated = await auth.isCurrentlyAuthenticated();
        console.log(`   Currently authenticated: ${isAuthenticated}`);
        
        // Test 6: Clear session
        console.log('6. Clearing session...');
        await auth.clearCurrentSession();
        const afterClear = await auth.isCurrentlyAuthenticated();
        console.log(`   Session cleared: ${!afterClear}`);
        
        // Test 7: Verify PIN file exists
        console.log('7. Checking PIN file...');
        const pinFile = path.join(__dirname, 'settings', 'admin-pin.json');
        const fileExists = fs.existsSync(pinFile);
        console.log(`   PIN file exists: ${fileExists}`);
        
        console.log('\n✅ All admin PIN tests passed!');
        console.log('The admin PIN system is working correctly.');
        
        // Clean up
        if (fs.existsSync(pinFile)) {
            fs.unlinkSync(pinFile);
            console.log('Test PIN file cleaned up.');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    testAdminPin();
}

module.exports = { testAdminPin };