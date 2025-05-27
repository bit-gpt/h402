#!/bin/bash

# Print current directory for debugging
echo "Current directory: $(pwd)"

# Create a temporary mock paywall HTML file
echo "Creating temporary mock paywall HTML..."
cat > ./typescript/package/src/shared/paywall/paywallHtml.ts << 'EOL'
// This is a temporary mock file that will be replaced with the actual paywall HTML
export const paywallHtml = "<html><head><title>Mock Paywall</title></head><body><div>Payment Required</div></body></html>";
EOL

# Step 1: Build the main package with the mock paywall HTML first
# This allows the paywall app to access the types it needs
echo "Building main package with mock paywall..."
pnpm --filter @bit-gpt/h402 build

# Step 2: Build the paywall app now that it can access the main package types
echo "Building paywall app..."
pnpm --filter paywall-app build

# Step 3: Create the actual paywall bundle from the paywall app build
echo "Creating actual paywall bundle..."
node ./scripts/build-paywall.js

# Step 4: Build all packages with the real paywall HTML
echo "Building all packages with actual paywall..."
pnpm build

# Start the example app
pnpm --filter example dev
