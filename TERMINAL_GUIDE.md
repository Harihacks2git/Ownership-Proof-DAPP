# 🖥️ Terminal Setup Guide

Visual guide for running the DApp with multiple terminals.

---

## 📺 Terminal Layout

You need **3 terminals** running simultaneously:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Terminal 1: HARDHAT NODE (Blockchain)                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ $ cd backend                                          │ │
│  │ $ npx hardhat node                                    │ │
│  │                                                       │ │
│  │ Started HTTP and WebSocket JSON-RPC server at         │ │
│  │ http://127.0.0.1:8545/                                │ │
│  │                                                       │ │
│  │ Accounts                                              │ │
│  │ ========                                              │ │
│  │ Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb... │ │
│  │ Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944b... │ │
│  │ ...                                                   │ │
│  │                                                       │ │
│  │ ⚠️  KEEP THIS RUNNING!                                │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Terminal 2: IPFS DAEMON (File Storage)                    │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ $ ipfs daemon                                         │ │
│  │                                                       │ │
│  │ Initializing daemon...                                │ │
│  │ go-ipfs version: 0.39.0                               │ │
│  │ Repo version: 15                                      │ │
│  │ System version: arm64/darwin                          │ │
│  │ Golang version: go1.21.5                              │ │
│  │                                                       │ │
│  │ Swarm listening on /ip4/127.0.0.1/tcp/4001           │ │
│  │ API server listening on /ip4/127.0.0.1/tcp/5001      │ │
│  │ WebUI: http://127.0.0.1:5001/webui                    │ │
│  │ Gateway server listening on /ip4/127.0.0.1/tcp/8080  │ │
│  │                                                       │ │
│  │ Daemon is ready                                       │ │
│  │                                                       │ │
│  │ ⚠️  KEEP THIS RUNNING!                                │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Terminal 3: FRONTEND (Web Application)                    │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ $ cd frontend                                         │ │
│  │ $ npm run dev                                         │ │
│  │                                                       │ │
│  │ VITE v6.3.2  ready in 234 ms                          │ │
│  │                                                       │ │
│  │ ➜  Local:   http://localhost:5173/                   │ │
│  │ ➜  Network: use --host to expose                     │ │
│  │ ➜  press h + enter to show help                      │ │
│  │                                                       │ │
│  │ ⚠️  KEEP THIS RUNNING!                                │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎬 Step-by-Step Startup

### Step 1: Start Hardhat (Terminal 1)

```bash
cd backend
npx hardhat node
```

**What you'll see:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========

WARNING: These accounts, and their private keys, are publicly known.
Any funds sent to them on Mainnet or any other live network WILL BE LOST.

Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

... (18 more accounts)
```

**✅ Success indicators:**
- Shows "Started HTTP and WebSocket JSON-RPC server"
- Lists 20 accounts with 10000 ETH each
- No error messages

**❌ Common errors:**
- "Port 8545 already in use" → Kill existing process: `lsof -ti:8545 | xargs kill -9`

---

### Step 2: Deploy Contract (One-time, Terminal 4)

Open a **new terminal** (don't close Terminal 1!):

```bash
cd backend
npx hardhat run scripts/deploy.js --network localhost
```

**What you'll see:**
```
Deploying contracts with the account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
ContentRegistry deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

**✅ Success indicators:**
- Shows "Deploying contracts with the account"
- Shows "ContentRegistry deployed to: 0x..."
- No error messages

**📝 IMPORTANT:** Copy the deployed address (e.g., `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`)

**Update these files:**
1. `.env` → `CONTRACT_ADDR=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
2. `frontend/src/config.js` → `address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"`

**You can close this terminal after deployment.**

---

### Step 3: Start IPFS (Terminal 2)

```bash
ipfs daemon
```

**What you'll see:**
```
Initializing daemon...
go-ipfs version: 0.39.0
Repo version: 15
System version: arm64/darwin
Golang version: go1.21.5

Swarm listening on /ip4/127.0.0.1/tcp/4001
Swarm listening on /ip4/192.168.1.100/tcp/4001
Swarm listening on /ip6/::1/tcp/4001
API server listening on /ip4/127.0.0.1/tcp/5001
WebUI: http://127.0.0.1:5001/webui
Gateway server listening on /ip4/127.0.0.1/tcp/8080
Daemon is ready
```

**✅ Success indicators:**
- Shows "Daemon is ready"
- API server on port 5001
- Gateway on port 8080
- No error messages

**❌ Common errors:**
- "Port 5001 already in use" → Kill existing: `lsof -ti:5001 | xargs kill -9`
- "Error: lock /Users/.../.ipfs/repo.lock" → IPFS already running or crashed
  - Solution: `rm ~/.ipfs/repo.lock` then retry

**🌐 Test IPFS:** Open http://127.0.0.1:5001/webui in browser

---

### Step 4: Start Frontend (Terminal 3)

```bash
cd frontend
npm run dev
```

**What you'll see:**
```
VITE v6.3.2  ready in 234 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

**✅ Success indicators:**
- Shows "VITE ready"
- Shows "Local: http://localhost:5173/"
- No error messages

**❌ Common errors:**
- "Port 5173 already in use" → Kill existing: `lsof -ti:5173 | xargs kill -9`
- "Cannot find module" → Run `npm install` in frontend directory

**🌐 Open app:** http://localhost:5173

---

## 🎯 What Each Terminal Does

### Terminal 1: Hardhat Node
- **Purpose:** Local Ethereum blockchain
- **Port:** 8545
- **What it does:**
  - Simulates Ethereum network
  - Provides test accounts with ETH
  - Processes transactions instantly
  - Stores smart contract state
- **When to restart:** After closing or if transactions fail

### Terminal 2: IPFS Daemon
- **Purpose:** Decentralized file storage
- **Ports:** 5001 (API), 8080 (Gateway)
- **What it does:**
  - Stores uploaded files
  - Generates CIDs (Content Identifiers)
  - Serves files via gateway
  - Connects to IPFS network
- **When to restart:** After closing or if uploads fail

### Terminal 3: Frontend
- **Purpose:** Web application interface
- **Port:** 5173
- **What it does:**
  - Serves React application
  - Hot-reloads on code changes
  - Connects to MetaMask
  - Interacts with blockchain and IPFS
- **When to restart:** After closing or if UI doesn't update

---

## 🔄 Restart Sequence

If you need to restart everything:

### 1. Stop All Services
```bash
# Kill Hardhat
lsof -ti:8545 | xargs kill -9

# Kill IPFS
lsof -ti:5001 | xargs kill -9

# Kill Frontend
lsof -ti:5173 | xargs kill -9
```

### 2. Start in Order
```bash
# Terminal 1
cd backend && npx hardhat node

# Wait 5 seconds, then Terminal 2
ipfs daemon

# Wait 5 seconds, then Terminal 3
cd frontend && npm run dev
```

### 3. Redeploy Contract
```bash
# Terminal 4 (temporary)
cd backend
npx hardhat run scripts/deploy.js --network localhost
# Update CONTRACT_ADDR in configs
```

### 4. Reset MetaMask
- Settings → Advanced → Clear activity tab data
- This resets transaction nonces

---

## 🎨 Terminal Color Coding (Optional)

To make terminals easier to identify, you can set custom colors:

### macOS Terminal
1. Terminal → Preferences → Profiles
2. Create 3 profiles:
   - "Hardhat" (Blue background)
   - "IPFS" (Green background)
   - "Frontend" (Purple background)

### iTerm2
1. Preferences → Profiles
2. Create 3 profiles with different colors
3. Use ⌘+D to split panes

### VS Code Terminal
1. Use split terminal feature
2. Label each terminal:
   - Right-click → Rename → "Hardhat"
   - Right-click → Rename → "IPFS"
   - Right-click → Rename → "Frontend"

---

## 📊 Status Indicators

### Hardhat Node
```
✅ Running: Shows account list, no errors
❌ Stopped: Terminal closed or shows error
⚠️  Issue: "Port already in use" or "Connection refused"
```

### IPFS Daemon
```
✅ Running: Shows "Daemon is ready"
❌ Stopped: Terminal closed or shows error
⚠️  Issue: "Port already in use" or "lock file exists"
```

### Frontend
```
✅ Running: Shows "Local: http://localhost:5173/"
❌ Stopped: Terminal closed or shows error
⚠️  Issue: "Port already in use" or "Cannot find module"
```

---

## 🛠️ Quick Commands

### Check What's Running
```bash
# Check Hardhat
lsof -ti:8545

# Check IPFS
lsof -ti:5001

# Check Frontend
lsof -ti:5173

# If command returns a number, service is running
```

### Kill Specific Service
```bash
# Kill Hardhat
lsof -ti:8545 | xargs kill -9

# Kill IPFS
lsof -ti:5001 | xargs kill -9

# Kill Frontend
lsof -ti:5173 | xargs kill -9
```

### View Logs
```bash
# Hardhat logs are in Terminal 1
# IPFS logs are in Terminal 2
# Frontend logs are in Terminal 3
# Browser console logs: F12 → Console
```

---

## 🎓 Pro Tips

1. **Use tmux or screen** for persistent sessions
2. **Label your terminals** so you don't mix them up
3. **Keep terminals visible** to catch errors quickly
4. **Don't close terminals** while app is running
5. **Check all 3 terminals** if something breaks

---

## 📱 Mobile-Friendly Alternative

Can't manage 3 terminals? Use the helper script:

```bash
./start-services.sh
# Select option 1 (Start ALL services)
# This opens 3 terminals automatically!
```

---

**Now you're ready to run the app! 🚀**

Open http://localhost:5173 and start building!
