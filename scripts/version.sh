#!/bin/bash

# Go to typescript/package directory
cd typescript/packages/h402

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"

# Ask for increment type if not provided
echo "Current version: $CURRENT_VERSION"
echo "Select version increment type (major|minor|patch)"
read -p "Enter choice: " INCREMENT
echo

case $choice in
  1) INCREMENT="major" ;;
  2) INCREMENT="minor" ;;
  *) INCREMENT="patch" ;;
esac

case $INCREMENT in
  major)
    ((VERSION_PARTS[0]++))
    VERSION_PARTS[1]=0
    VERSION_PARTS[2]=0
    ;;
  minor)
    ((VERSION_PARTS[1]++))
    VERSION_PARTS[2]=0
    ;;
  patch)
    ((VERSION_PARTS[2]++))
    ;;
esac

NEW_VERSION="${VERSION_PARTS[0]}.${VERSION_PARTS[1]}.${VERSION_PARTS[2]}"

echo "New version will be: $NEW_VERSION"
echo ""
echo "The following actions will be performed:"
echo "1. Update package.json version to $NEW_VERSION"
echo "2. Commit changes with message 'chore: bump version to $NEW_VERSION'"
echo "3. Push commit to main branch"
echo "4. Create git tag v$NEW_VERSION"
echo "5. Push tag to remote"
echo ""
read -p "Do you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Operation cancelled"
    exit 1
fi

# Update package.json
npm version $NEW_VERSION --no-git-tag-version

# Commit changes
git add .
git commit -m "chore: bump version to $NEW_VERSION"

# Push changes
git push origin main

# Create and push tag
git tag v$NEW_VERSION
git push origin --tags
