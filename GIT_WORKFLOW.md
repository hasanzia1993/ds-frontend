# Git Workflow Guide

## Branch Structure

- **`main`**: Production-ready code, stable releases
- **`dev`**: Development branch for new features and fixes

## Development Workflow

### 1. Starting Development
```bash
# Always work from dev branch
git checkout dev
git pull origin dev
```

### 2. Making Changes
```bash
# Create feature branch (optional, for complex features)
git checkout -b feature/your-feature-name

# Make your changes
# Test thoroughly

# Commit your changes
git add .
git commit -m "Descriptive commit message"
```

### 3. Pushing to Dev
```bash
# Push to dev branch
git push origin dev
```

### 4. Merging to Main (When Ready)
```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Merge dev into main
git merge dev

# Push to main
git push origin main

# Switch back to dev for continued development
git checkout dev
```

## Important Rules

1. **Never commit directly to main** - always go through dev branch
2. **Always pull before pushing** to avoid conflicts
3. **Test thoroughly** before merging to main
4. **Use descriptive commit messages**
5. **Create pull requests** for major changes (optional but recommended)

## Current Status

- ✅ Git repository initialized
- ✅ Remote origin added
- ✅ Main branch created and pushed
- ✅ Dev branch created and pushed
- ✅ Currently working on dev branch

## File Safety Promise

**I will never delete any files without your explicit permission and will always create backups before making destructive changes.**
