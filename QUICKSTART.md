# ⚡ Quick Start Guide

## First Time Setup (5 minutes)

### ✅ Prerequisites Already Installed
- ✅ Node.js v25.5.0
- ✅ npm v11.8.0
- ✅ IPFS v0.39.0
- ✅ IPFS configured with CORS
- ✅ All npm dependencies installed

### 🎯 What You Need to Do Now

#### 1. Install MetaMask (2 minutes)
- Visit https://metamask.io/
- Install browser extension
- Create new wallet
- **SAVE YOUR SEED PHRASE!**

#### 2. Start Services (3 terminals needed)

**Terminal 1 - Blockchain:**
```bash
cd backend
npx hardhat node
```
Keep this running! You'll see 20 test accounts with 10000 ETH each.

**Terminal 2 - IPFS:**
```bash
ipfs daemon
```
Keep this running! Check http://127.0.0.1:5001/webui

**Terminal 3 - Deploy Contract (run once):**
```bash
cd backend
npx hardhat run scripts/deploy.js --network localhost
```

Copy the deployed address (e.g., `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`)

#### 3. Update Configuration

**Edit `.env` file:**
```env
CONTRACT_ADDR=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512  # Paste your address
AUTH_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  # From Hardhat Account #0
```

**Edit `frontend/src/config.js`:**
```javascript
export const CONTRACT_CONFIG = {
  address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",  // Paste your address
  chainId: "31337"
};
```

#### 4. Start Frontend

**Terminal 4:**
```bash
cd frontend
npm run dev
```

Open http://localhost:5173

#### 5. Configure MetaMask

1. Click network dropdown → "Add Network" → "Add manually"
2. Enter:
   - **Network Name:** Hardhat Local
   - **RPC URL:** http://127.0.0.1:8545
   - **Chain ID:** 31337
   - **Currency:** ETH
3. Import test account:
   - MetaMask → Import Account
   - Paste private key from Hardhat Account #1
   - (Example: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`)

#### 6. Use the App! 🎉

1. Click "Connect MetaMask"
2. Select "Hardhat Local" network
3. Approve connection
4. Upload a file and register it!

---

## 🔄 Daily Usage (After First Setup)

### Starting Everything

**Option A: Use the helper script**
```bash
./start-services.sh
# Select option 1 (Start ALL services)
```

**Option B: Manual (3 terminals)**
```bash
# Terminal 1
cd backend && npx hardhat node

# Terminal 2
ipfs daemon

# Terminal 3
cd frontend && npm run dev
```

### Stopping Everything

```bash
./start-services.sh
# Select option 8 (Stop all services)
```

Or manually:
```bash
# Kill by port
lsof -ti:8545 | xargs kill -9  # Hardhat
lsof -ti:5001 | xargs kill -9  # IPFS
lsof -ti:5173 | xargs kill -9  # Frontend
```

---

## 🐛 Common Issues

### "IPFS not connected"
```bash
ipfs daemon
# Wait for "Daemon is ready"
```

### "Contract not connected"
1. Check Hardhat is running
2. Redeploy contract
3. Update addresses in config files

### "Transaction failed"
- MetaMask → Settings → Advanced → Clear activity data
- Restart Hardhat node
- Redeploy contract

### "Port already in use"
```bash
./start-services.sh
# Select option 8 to stop all services
```

---

## 📝 Cheat Sheet

### Essential Commands

```bash
# Start Hardhat
cd backend && npx hardhat node

# Deploy Contract
cd backend && npx hardhat run scripts/deploy.js --network localhost

# Start IPFS
ipfs daemon

# Start Frontend
cd frontend && npm run dev

# Start Authority Server (optional)
node authority-server.js

# Start Event Indexer (optional)
node indexer.js
```

### Important URLs

- Frontend: http://localhost:5173
- IPFS WebUI: http://127.0.0.1:5001/webui
- IPFS Gateway: http://127.0.0.1:8080/ipfs/
- Hardhat RPC: http://127.0.0.1:8545
- Authority Server: http://localhost:3001

### MetaMask Network Settings

- **Network Name:** Hardhat Local
- **RPC URL:** http://127.0.0.1:8545
- **Chain ID:** 31337
- **Currency:** ETH

---

## 🎓 What to Try

1. ✅ Register a document
2. ✅ Register an image
3. ✅ View your content on IPFS
4. ✅ Transfer ownership to another account
5. ✅ Check ownership history
6. ✅ Try registering the same file twice (should fail!)

---

## 📚 More Help

- **Detailed Setup:** See [SETUP.md](./SETUP.md)
- **Project Info:** See [README.md](./README.md)
- **Architecture:** See [context.md](./context.md)

---

**Need help? Check the troubleshooting section in SETUP.md**
