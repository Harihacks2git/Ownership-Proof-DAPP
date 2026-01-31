# 🚀 How to Run the Blockchain DApp

## Prerequisites Check
- ✅ Node.js installed
- ✅ MetaMask browser extension installed
- ⚠️ IPFS installed (run `ipfs --version` to check)

---

## Step-by-Step Instructions

### **Terminal 1: Start Hardhat Blockchain**

```bash
cd backend
node node_modules/hardhat/internal/cli/bootstrap.js node
```

**What to expect:**
- You'll see 20 test accounts with addresses and private keys
- Each account has 10,000 ETH
- Keep this terminal open
- The blockchain runs on `http://127.0.0.1:8545`

**Important:** Copy these for MetaMask:
- Account #1 Address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Account #1 Private Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- Account #2 Private Key: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`

---

### **Terminal 2: Start Frontend**

```bash
cd frontend
npm run dev
```

**What to expect:**
- Vite dev server starts
- You'll see: `Local: http://localhost:5173/`
- Keep this terminal open

---

### **Terminal 3: Start IPFS (Required for file uploads)**

```bash
ipfs daemon
```

**What to expect:**
- IPFS daemon starts
- You'll see: "Daemon is ready"
- API server on port 5001
- Gateway on port 8080
- Keep this terminal open

**If IPFS is not installed:**
```bash
# macOS
brew install ipfs

# Initialize IPFS (first time only)
ipfs init

# Then run
ipfs daemon
```

---

## Configure MetaMask

### 1. Add Hardhat Network
- Open MetaMask
- Click network dropdown → "Add Network" → "Add a network manually"
- Fill in:
  - **Network Name:** Hardhat Local
  - **RPC URL:** `http://127.0.0.1:8545`
  - **Chain ID:** `31337`
  - **Currency Symbol:** ETH
- Click "Save"

### 2. Import Test Accounts
- Click account icon → "Import Account"
- Paste Account #1 private key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- Repeat for Account #2 (for testing transfers)

### 3. Switch to Hardhat Network
- Select "Hardhat Local" from network dropdown

---

## Open the DApp

1. Open browser: `http://localhost:5173/`
2. Click "Connect MetaMask"
3. Approve connection in MetaMask
4. You should see the Dashboard

---

## Test the DApp

### Test 1: Register Content
1. Click "Register Digital Content" section
2. Select a file (any image, PDF, etc.)
3. Enter title and description
4. Click "Register Content"
5. Confirm transaction in MetaMask
6. Wait for confirmation
7. Content appears in "My Owned Contents"

### Test 2: View Content Details
1. Click on any content card in "My Owned Contents"
2. View ownership history
3. Click "View on IPFS" to see the file

### Test 3: Transfer Ownership
1. In content details, scroll to "Transfer Ownership"
2. Enter Account #2 address: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
3. Click "Transfer Ownership"
4. Confirm in MetaMask
5. Switch to Account #2 in MetaMask
6. Refresh page - content now belongs to Account #2

### Test 4: Check Transaction History
1. View "Transaction History" section
2. See all registrations and transfers

---

## Troubleshooting

### "IPFS not connected" error
- Make sure IPFS daemon is running in Terminal 3
- Check: `curl http://127.0.0.1:5001/api/v0/id -X POST`

### "Contract not connected" error
- Make sure Hardhat node is running in Terminal 1
- Contract address in `frontend/src/config.js` should be: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

### MetaMask shows wrong balance
- Reset account: MetaMask → Settings → Advanced → Clear activity tab data

### Port already in use
```bash
# Kill process on port 8545 (Hardhat)
lsof -ti:8545 | xargs kill -9

# Kill process on port 5173 (Frontend)
lsof -ti:5173 | xargs kill -9
```

---

## Optional: Start Additional Services

### Authority Server (for CID updates)
```bash
# Terminal 4
node authority-server.js
```

### Event Indexer (logs events to JSON)
```bash
# Terminal 5
node indexer.js
```

---

## Quick Restart

If you need to restart everything:

```bash
# Stop all terminals (Ctrl+C in each)

# Restart in order:
# Terminal 1
cd backend && node node_modules/hardhat/internal/cli/bootstrap.js node

# Terminal 2
cd frontend && npm run dev

# Terminal 3
ipfs daemon
```

---

## Summary

**3 Required Terminals:**
1. Hardhat blockchain (backend)
2. Frontend dev server
3. IPFS daemon

**MetaMask Setup:**
- Network: Hardhat Local (Chain ID 31337)
- Import 2 test accounts for testing

**Access:** `http://localhost:5173/`

---

**You're all set! 🎉**
