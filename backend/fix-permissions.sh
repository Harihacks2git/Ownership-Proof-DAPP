#!/bin/bash
# Fix permissions for node_modules binaries
# Run this script if you get "Permission denied" errors

echo "🔧 Fixing node_modules permissions..."

# Fix all binaries in .bin directory
chmod -R +x node_modules/.bin/

# Fix hardhat specifically
chmod +x node_modules/hardhat/internal/cli/bootstrap.js 2>/dev/null || true

echo "✅ Permissions fixed!"
echo ""
echo "You can now run:"
echo "  npx hardhat node"
echo "  npx hardhat run scripts/deploy.js --network localhost"
echo "  npm run node"
echo "  npm run deploy"
