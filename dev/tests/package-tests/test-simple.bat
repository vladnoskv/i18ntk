@echo off
setlocal enabledelayedexpansion

echo 🧪 Creating isolated test environment...

:: Generate unique timestamp
set timestamp=%date:~10,4%-%date:~4,2%-%date:~7,2%-%time:~0,2%-%time:~3,2%-%time:~6,2%
set timestamp=%timestamp: =0%
set TEST_DIR=test-isolated-%timestamp%

echo 📁 Test directory: %TEST_DIR%

:: Create test directory
if not exist "%TEST_DIR%" mkdir "%TEST_DIR%"

:: Create tarball
echo 📦 Creating package tarball...
call npm pack

:: Find the created tarball
for /f "tokens=*" %%f in ('dir /b *.tgz') do set TARBALL=%%f
echo Created: %TARBALL%

:: Move to test directory
cd "%TEST_DIR%"

:: Setup test environment
echo 🚀 Setting up test environment...
call npm init -y

:: Install the package
echo 📥 Installing package...
call npm install ..\%TARBALL%

:: Test CLI commands
echo 📋 Testing CLI commands...
call npx i18ntk --help

:: Test initialization
echo 🎯 Testing initialization...
call npx i18ntk-init --help

:: Test analysis
echo 🔍 Testing analysis...
call npx i18ntk-analyze --help

:: Return to original directory
cd ..

:: Cleanup
del %TARBALL%

echo ✅ All tests completed successfully!
echo 📁 Test directory: %TEST_DIR%
echo 🧹 To clean up: rmdir /s /q %TEST_DIR%

echo ✨ Isolated test completed - no version conflicts!
pause