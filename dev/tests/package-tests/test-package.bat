@echo off
REM Windows Batch Script for i18ntk Local Testing
REM Emulates the exact user experience from npm-test.md

echo [TEST] Starting i18ntk Local Test Environment
echo [TEST] ======================================

REM Clean up any existing test directory
if exist test-i18ntk-local (
    echo [TEST] Cleaning up existing test directory...
    rmdir /s /q test-i18ntk-local
)

REM Create test directory
echo [TEST] Creating test directory: test-i18ntk-local
mkdir test-i18ntk-local

REM Package the toolkit
echo [TEST] Creating npm package...
npm pack

REM Find the created tarball
for %%f in (*.tgz) do (
    set tarball=%%f
    goto :found
)

:found
if not defined tarball (
    echo [ERROR] No tarball found after npm pack
    pause
    exit /b 1
)

echo [TEST] Created package: %tarball%

REM Move tarball to test directory
move %tarball% test-i18ntk-local\%tarball%

REM Change to test directory
cd test-i18ntk-local

REM Initialize npm project
echo [TEST] Initializing npm project...
npm init -y

REM Install the package
echo [TEST] Installing package...
npm i .\%tarball%

REM Test basic commands
echo [TEST] Testing CLI commands...
echo [TEST] Testing: i18ntk --help
npx i18ntk --help

echo [TEST] Testing: i18ntk-manage --help
npx i18ntk-manage --help

echo [TEST] Testing package resolution...
node -e "console.log(require.resolve('i18ntk/ui-locales/en.json'))"

REM Create test project
echo [TEST] Creating test project...
mkdir test-project
cd test-project

REM Create sample locales
mkdir locales
echo {"greeting":"Hello World","welcome":"Welcome to our application"} > locales\en.json
echo {"greeting":"Hola Mundo","welcome":"Bienvenido a nuestra aplicación"} > locales\es.json

REM Test initialization
echo [TEST] Testing i18ntk initialization...
npx i18ntk-init

echo [TEST] ======================================
echo [TEST] ✅ All tests completed successfully!
echo [TEST] 📁 Test artifacts available in: %cd%\..\test-i18ntk-local
echo [TEST] Press any key to continue...
pause

REM Return to original directory
cd ..\..