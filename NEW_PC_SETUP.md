# 🖥️ Setting Up on a New PC

This guide helps you clone and run this project on any new computer.

---

## 📋 Prerequisites Checklist

Before cloning the project, install these on your new PC:

### macOS
```bash
# 1. Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install Node.js and npm
brew install node

# 3. Install IPFS
brew install ipfs

# 4. Verify installations
node --version  # Should show v18+
npm --version   # Should show 9+
ipfs --version  # Should show 0.x.x
```

### Windows
```powershell
# 1. Install Node.js from https://nodejs.org/ (LTS version)

# 2. Install IPFS Desktop from https://docs.ipfs.tech/install/ipfs-desktop/
# OR install Kubo CLI from https://docs.ipfs.tech/install/command-line/

# 3. Verify installations
node --version
npm --version
ipfs --version
```

### Linux (Ubuntu/Debian)
```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install IPFS
wget https://dist.ipfs.tech/kubo/v0.39.0/kubo_v0.39.0_linux-amd64.tar.gz
tar -xvzf kubo_v0.39.0_linux-amd64.tar.gz
cd kubo
sudo bash install.sh

# 3. Verify installations
node --version
npm --version
ipfs --version
```

### Install MetaMask
- Visit https://metamask.io/
- Install browser extension for Chrome/Firefox/Brave
- Create wallet and **SAVE YOUR SEED PHRASE**

---

## 📥 Clone and Setup

### Step 1: Clone Repository
```bash
# Clone the project
git clone <your-repository-url>
cd Ownership-Proof-DAPP

# OR if you have a zip file
unzip Ownership-Proof-DAPP.zip
cd Ownership-Proof-DAPP
```

### Step 2: Initialize IPFS
```bash
# Initialize IPFS (first time only)
ipfs init

# Configure CORS for browser access
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:5173", "http://127.0.0.1:5173"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]'
```

### Step 3: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install root dependencies (for authority server)
npm install express ethers dotenv
```

### Step 4: Create Environment File
```bash
# Copy example to .env
cp .env.example .env

# The .env file will look like this:
# RPC_URL=http://127.0.0.1:8545
# CONTRACT_ADDR=                    # Fill after deployment
# AUTH_PRIVATE_KEY=                 # Fill after deployment
# IPFS_API_URL=http://127.0.0.1:5001/api/v0
# IPFS_GATEWAY_URL=http://127.0.0.1:8080/ipfs
```

---

## 🚀 First Run

### Terminal 1: Start Hardhat Blockchain
```bash
cd backend
npx hardhat node
```

**Wait for output showing 20 accounts with private keys.**

**Copy Account #0 private key** - you'll need this for authority.

### Terminal 2: Deploy Smart Contract
```bash
cd backend
npx hardhat run scripts/deploy.js --network localhost
```

**Copy the deployed contract address** (e.g., `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`)

### Terminal 3: Update Configuration

**Edit `.env` file:**
```env
CONTRACT_ADDR=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512  # Your address
AUTH_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  # Account #0
```

**Edit `frontend/src/config.js`:**
```javascript
export const CONTRACT_CONFIG = {
  address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",  // Your address
  chainId: "31337"
};
```

### Terminal 4: Start IPFS
```bash
ipfs daemon
```

**Wait for "Daemon is ready"**

### Terminal 5: Start Frontend
```bash
cd frontend
npm run dev
```

**Open http://localhost:5173 in your browser**

---

## 🦊 Configure MetaMask

### Add Hardhat Local Network
1. Open MetaMask
2. Click network dropdown
3. "Add Network" → "Add a network manually"
4. Enter:
   - **Network Name:** Hardhat Local
   - **RPC URL:** http://127.0.0.1:8545
   - **Chain ID:** 31337
   - **Currency Symbol:** ETH
5. Click "Save"

### Import Test Account
1. MetaMask → Account icon → "Import Account"
2. Paste **Account #1 private key** from Hardhat output
   - Example: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
3. This account has 10000 ETH for testing

---

## ✅ Verification

Test that everything works:

1. Open http://localhost:5173
2. Click "Connect MetaMask"
3. Select "Hardhat Local" network
4. Approve connection
5. Check status indicators:
   - ✓ IPFS (green)
   - ✓ Smart Contract (green)
6. Upload a test file
7. Register content
8. Confirm transaction in MetaMask
9. View in "My Owned Contents"

---

## 🔄 Daily Usage (After First Setup)

### Quick Start (3 terminals)
```bash
# Terminal 1
cd backend && npx hardhat node

# Terminal 2
ipfs daemon

# Terminal 3
cd frontend && npm run dev
```

### Using Helper Script (macOS/Linux)
```bash
./start-services.sh
# Select option 1 (Start ALL services)
```

---

## 📦 What Gets Installed

### Global (System-wide)
- Node.js and npm
- IPFS (Kubo)
- MetaMask browser extension

### Project Dependencies
- **Backend:** Hardhat, ethers, Solidity compiler
- **Frontend:** React, Vite, ethers, ipfs-http-client
- **Root:** Express, ethers, dotenv

### Total Disk Space
- Node.js: ~70 MB
- IPFS: ~70 MB
- Project dependencies: ~500 MB
- **Total: ~640 MB**

---

## 🐛 Common Issues on New PC

### "Command not found: node"
**Solution:** Node.js not installed or not in PATH
```bash
# macOS
brew install node

# Windows: Download from nodejs.org
# Linux: Use package manager
```

### "Command not found: ipfs"
**Solution:** IPFS not installed
```bash
# macOS
brew install ipfs

# Windows/Linux: See installation section above
```

### "Cannot connect to IPFS"
**Solution:** IPFS daemon not running or CORS not configured
```bash
ipfs daemon

# If still fails, reconfigure CORS:
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:5173"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]'
```

### "Port already in use"
**Solution:** Previous instance still running
```bash
# macOS/Linux
lsof -ti:8545 | xargs kill -9  # Hardhat
lsof -ti:5001 | xargs kill -9  # IPFS
lsof -ti:5173 | xargs kill -9  # Frontend

# Windows
netstat -ano | findstr :8545
taskkill /PID <PID> /F
```

### "npm install fails"
**Solution:** Clear npm cache
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Checklist for New PC

- [ ] Install Node.js
- [ ] Install npm (comes with Node.js)
- [ ] Install IPFS
- [ ] Install MetaMask
- [ ] Clone project
- [ ] Initialize IPFS
- [ ] Configure IPFS CORS
- [ ] Install backend dependencies
- [ ] Install frontend dependencies
- [ ] Install root dependencies
- [ ] Create .env file
- [ ] Start Hardhat node
- [ ] Deploy contract
- [ ] Update CONTRACT_ADDR in configs
- [ ] Start IPFS daemon
- [ ] Start frontend
- [ ] Configure MetaMask network
- [ ] Import test account
- [ ] Test registration

---

## 🎓 Next Steps

After successful setup:

1. Read [QUICKSTART.md](./QUICKSTART.md) for daily usage
2. Read [SETUP.md](./SETUP.md) for detailed documentation
3. Read [README.md](./README.md) for project overview
4. Check [PROJECT_STATUS.md](./PROJECT_STATUS.md) for current status

---

## 💾 Backup Important Files

Before moving to a new PC, backup:

- `.env` file (if you want to keep same config)
- `event_db.json` (if using event indexer)
- MetaMask seed phrase (CRITICAL!)
- Any custom modifications you made

**Note:** You'll need to redeploy the contract on the new PC as Hardhat creates a fresh blockchain each time.

---

## 🆘 Getting Help

If you're stuck:

1. Check this guide's troubleshooting section
2. Check [SETUP.md](./SETUP.md) for detailed help
3. Verify all prerequisites are installed
4. Check terminal outputs for error messages
5. Try restarting services in order

---

**Good luck with your setup! 🚀**
