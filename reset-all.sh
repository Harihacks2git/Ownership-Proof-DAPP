#!/bin/bash

echo "🔄 Resetting entire development environment..."

# Kill any running Hardhat nodes
echo "1️⃣ Stopping Hardhat node..."
pkill -f "hardhat node" || true
sleep 2

# Kill any running frontend servers
echo "2️⃣ Stopping frontend server..."
pkill -f "vite" || true
sleep 1

# Start fresh Hardhat node
echo "3️⃣ Starting fresh Hardhat node..."
cd backend
npx hardhat node --hostname 0.0.0.0 > ../hardhat.log 2>&1 &
HARDHAT_PID=$!
cd ..

# Wait for Hardhat to start
echo "⏳ Waiting for Hardhat to start..."
sleep 5

# Compile and deploy
echo "4️⃣ Compiling contracts..."
cd backend
npx hardhat compile --force

echo "5️⃣ Copying ABI to frontend..."
cp artifacts/contracts/ownership.sol/ContentRegistry.json ../frontend/src/abi/

echo "6️⃣ Deploying contract..."
DEPLOY_OUTPUT=$(npx hardhat run scripts/deploy.js --network localhost 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract contract address
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "ContentRegistry deployed to:" | awk '{print $4}')
echo "📝 Contract deployed to: $CONTRACT_ADDRESS"

# Update frontend config
echo "7️⃣ Updating frontend config..."
cd ..
cat > frontend/src/config.js << EOF
// Configuration file for IPFS and contract settings
// This allows easy configuration without hardcoding values

// IPFS Configuration
// Default to local IPFS daemon (Kubo)
export const IPFS_CONFIG = {
  // IPFS API endpoint (for uploading)
  apiUrl: import.meta.env.VITE_IPFS_API_URL || 'http://127.0.0.1:5001/api/v0',
  // IPFS Gateway URL (for viewing content)
  gatewayUrl: import.meta.env.VITE_IPFS_GATEWAY_URL || 'http://127.0.0.1:8080/ipfs',
  // IPFS client host and port
  host: import.meta.env.VITE_IPFS_HOST || '127.0.0.1',
  port: import.meta.env.VITE_IPFS_PORT || 5001,
  protocol: import.meta.env.VITE_IPFS_PROTOCOL || 'http'
};

// Contract Configuration
export const CONTRACT_CONFIG = {
  address: import.meta.env.VITE_CONTRACT_ADDRESS || "$CONTRACT_ADDRESS",
  chainId: import.meta.env.VITE_CHAIN_ID || "31337" // Hardhat local network
};

// Authority Server Configuration (for authority updates)
export const AUTHORITY_CONFIG = {
  apiUrl: import.meta.env.VITE_AUTHORITY_API_URL || 'http://localhost:3001'
};
EOF

echo "8️⃣ Clearing frontend cache..."
cd frontend
rm -rf node_modules/.vite

echo ""
echo "✅ Reset complete!"
echo ""
echo "📋 Next steps:"
echo "   1. In MetaMask, for EACH account you're using:"
echo "      - Switch to the account"
echo "      - Settings > Advanced > Reset Account (NOT Clear activity)"
echo "   2. Start frontend: cd frontend && npm run dev"
echo ""
echo "🔗 Contract Address: $CONTRACT_ADDRESS"
echo "📊 Hardhat node running (PID: $HARDHAT_PID)"
echo "📄 Logs: tail -f hardhat.log"
