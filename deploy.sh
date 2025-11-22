#!/bin/bash

echo "========================================="
echo "🚀 Deploying to GitHub"
echo "========================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "Initializing git repository..."
    git init
    echo ""
fi

# Check remote
if ! git remote | grep -q origin; then
    echo "Adding remote repository..."
    git remote add origin https://github.com/thxlp/63-back.git
    echo ""
else
    echo "Remote repository already exists."
    echo "Updating remote URL..."
    git remote set-url origin https://github.com/thxlp/63-back.git
    echo ""
fi

# Check branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
if [ -z "$CURRENT_BRANCH" ]; then
    echo "Creating main branch..."
    git checkout -b main
else
    echo "Current branch: $CURRENT_BRANCH"
fi

echo ""
echo "Adding files..."
git add .

echo ""
echo "Status:"
git status

echo ""
echo "========================================="
read -p "Ready to commit and push? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

echo ""
echo "Committing..."
git commit -m "Initial commit: Backend API with Supabase integration

- Backend API server with Express.js
- Supabase integration for authentication and database
- BMI records management
- OpenFoodFacts API integration
- Barcode scanning functionality
- User profile management
- Complete API endpoints for frontend integration"

echo ""
echo "Pushing to GitHub..."
if git push -u origin main; then
    echo ""
    echo "✅ Successfully deployed to GitHub!"
    echo ""
    echo "Repository: https://github.com/thxlp/63-back"
    echo ""
else
    echo ""
    echo "❌ Push failed!"
    echo ""
    echo "Possible solutions:"
    echo "1. Check your GitHub credentials"
    echo "2. Make sure you have access to the repository"
    echo "3. If repository is not empty, use: git push -u origin main --force"
    echo ""
    exit 1
fi

