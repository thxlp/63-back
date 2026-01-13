@echo off
echo =========================================
echo 🚀 Deploying to GitHub
echo =========================================
echo.

REM Check if git is initialized
if not exist .git (
    echo Initializing git repository...
    git init
    echo.
)

REM Check remote
git remote -v >nul 2>&1
if errorlevel 1 (
    echo Adding remote repository...
    git remote add origin https://github.com/thxlp/63-back.git
    echo.
) else (
    echo Remote repository already exists.
    echo Updating remote URL...
    git remote set-url origin https://github.com/thxlp/63-back.git
    echo.
)

REM Check branch
git branch --show-current >nul 2>&1
if errorlevel 1 (
    echo Creating main branch...
    git checkout -b main
) else (
    echo Current branch: 
    git branch --show-current
)

echo.
echo Adding files...
git add .

echo.
echo Status:
git status

echo.
echo =========================================
echo Ready to commit and push?
echo =========================================
pause

echo.
echo Committing...
git commit -m "Initial commit: Backend API with Supabase integration

- Backend API server with Express.js
- Supabase integration for authentication and database
- BMI records management
- OpenFoodFacts API integration
- Barcode scanning functionality
- User profile management
- Complete API endpoints for frontend integration"

echo.
echo Pushing to GitHub...
git push -u origin main

if errorlevel 1 (
    echo.
    echo ❌ Push failed!
    echo.
    echo Possible solutions:
    echo 1. Check your GitHub credentials
    echo 2. Make sure you have access to the repository
    echo 3. If repository is not empty, use: git push -u origin main --force
    echo.
    pause
    exit /b 1
) else (
    echo.
    echo ✅ Successfully deployed to GitHub!
    echo.
    echo Repository: https://github.com/thxlp/63-back
    echo.
    pause
)

