# Configuration Changes for Running on Different Machines

This guide explains what needs to be changed when running the DApp on a different laptop/PC.

---

## Scenario 1: Running Everything Locally (Same Machine)

**No changes needed!** Just follow these steps:

### 1. Start Services
```bash
# Terminal 1: Hardhat Blockchain
cd backend
npx hardhat node

# Terminal 2: Deploy Contract (after Hardhat starts)
cd backend
npx hardhat run scripts/deploy.js --network localhost
# Copy the deployed contract address

# Terminal 3: IPFS
ipfs daemon

# Terminal 4: Frontend
cd frontend
npm run dev
```

### 2. Update Contract Address (if needed)
If the contract deploys to a different address, update:

**File:** `frontend/src/config.js`
```javascript
export const CONTRACT_CONFIG = {
  address: "PASTE_DEPLOYED_ADDRESS_HERE",
  chainId: "31337"
};
```

### 3. MetaMask Setup
```
Network Name: Hardhat Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency Symbol: ETH
```

Import test account:
```
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

---

## Scenario 2: Running on Different Machines (Network Setup)

### Machine A (Server - Running Blockchain & Frontend)

#### Step 1: Find Your IP Address

**macOS:**
```bash
ipconfig getifaddr en0
```

**Linux:**
```bash
hostname -I | awk '{print $1}'
```

**Windows:**
```bash
ipconfig
# Look for IPv4 Address
```

**Example:** Let's say your IP is `192.168.1.100`

#### Step 2: Start Hardhat with External Access
```bash
cd backend
npx hardhat node --hostname 0.0.0.0
```

#### Step 3: Deploy Contract
```bash
cd backend
npx hardhat run scripts/deploy.js --network localhost
```
**Copy the deployed contract address!**

#### Step 4: Update Frontend Config

**File:** `frontend/src/config.js`

Change these lines:
```javascript
export const IPFS_CONFIG = {
  apiUrl: 'http://YOUR_IP:5001/api/v0',  // Change to your IP
  gatewayUrl: 'http://YOUR_IP:8080/ipfs', // Change to your IP
  host: 'YOUR_IP',  // Change to your IP
  port: '5001',
  protocol: 'http'
};

export const CONTRACT_CONFIG = {
  address: "PASTE_DEPLOYED_ADDRESS_HERE",  // From deploy step
  chainId: "31337"
};
```

**Example with IP 192.168.1.100:**
```javascript
export const IPFS_CONFIG = {
  apiUrl: 'http://192.168.1.100:5001/api/v0',
  gatewayUrl: 'http://192.168.1.100:8080/ipfs',
  host: '192.168.1.100',
  port: '5001',
  protocol: 'http'
};

export const CONTRACT_CONFIG = {
  address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  chainId: "31337"
};
```

#### Step 5: Start IPFS with External Access
```bash
# Configure IPFS to accept external connections
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]'

# Start IPFS
ipfs daemon
```

#### Step 6: Start Frontend with External Access
```bash
cd frontend
npm run dev -- --host 0.0.0.0
```

### Machine B (Client - Accessing the DApp)

#### Step 1: MetaMask Setup
```
Network Name: Hardhat Local
RPC URL: http://MACHINE_A_IP:8545
Chain ID: 31337
Currency Symbol: ETH
```

**Example:**
```
RPC URL: http://192.168.1.100:8545
```

#### Step 2: Import Test Account
```
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

#### Step 3: Access DApp
Open browser and go to:
```
http://MACHINE_A_IP:5173
```

**Example:**
```
http://192.168.1.100:5173
```

---

## Quick Reference: Files to Change

### 1. Contract Address (Always check after deployment)
**File:** `frontend/src/config.js`
```javascript
address: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
```

### 2. Network Configuration (Only for remote access)
**File:** `frontend/src/config.js`
```javascript
// Change localhost to your IP
apiUrl: 'http://YOUR_IP:5001/api/v0'
gatewayUrl: 'http://YOUR_IP:8080/ipfs'
host: 'YOUR_IP'
```

### 3. Environment Variables (Optional - Alternative to hardcoding)
**File:** `frontend/.env` (create if doesn't exist)
```bash
VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_IPFS_API_URL=http://192.168.1.100:5001/api/v0
VITE_IPFS_GATEWAY_URL=http://192.168.1.100:8080/ipfs
VITE_IPFS_HOST=192.168.1.100
```

---

## Common Issues & Solutions

### Issue 1: "Contract Not Connected"
**Cause:** Wrong contract address or Hardhat not running
**Fix:**
1. Check Hardhat is running: `curl http://localhost:8545`
2. Verify contract address in `frontend/src/config.js` matches deployed address
3. Redeploy contract if needed

### Issue 2: "IPFS Not Connected"
**Cause:** IPFS daemon not running or wrong configuration
**Fix:**
1. Check IPFS is running: `curl -X POST http://localhost:5001/api/v0/id`
2. Verify IPFS gateway port: `ipfs config Addresses.Gateway`
3. Update `gatewayUrl` in config if port is different

### Issue 3: "Cannot connect from other machine"
**Cause:** Services not accepting external connections
**Fix:**
1. Start Hardhat with: `npx hardhat node --hostname 0.0.0.0`
2. Start Frontend with: `npm run dev -- --host 0.0.0.0`
3. Configure IPFS CORS (see Step 5 above)
4. Check firewall allows ports 8545, 5173, 5001, 8080

### Issue 4: "MetaMask shows 0 ETH"
**Cause:** Wrong account imported or wrong network
**Fix:**
1. Verify you're on Hardhat Local network (Chain ID 31337)
2. Import correct private key from Hardhat accounts
3. Reset MetaMask account if needed: Settings → Advanced → Clear activity

---

## Test Account Private Keys (Hardhat Default)

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

---

## Summary Checklist

### For Local Development (Same Machine):
- [ ] Start Hardhat: `npx hardhat node`
- [ ] Deploy contract and copy address
- [ ] Update contract address in `frontend/src/config.js`
- [ ] Start IPFS: `ipfs daemon`
- [ ] Start frontend: `npm run dev`
- [ ] Configure MetaMask with localhost:8545
- [ ] Import test account

### For Network Development (Different Machines):
- [ ] Find server machine IP address
- [ ] Start Hardhat with `--hostname 0.0.0.0`
- [ ] Deploy contract and copy address
- [ ] Update `frontend/src/config.js` with server IP
- [ ] Configure IPFS CORS
- [ ] Start IPFS daemon
- [ ] Start frontend with `--host 0.0.0.0`
- [ ] Configure MetaMask on client with server IP
- [ ] Import test account
- [ ] Access DApp at `http://SERVER_IP:5173`

---

**Note:** Always ensure both machines are on the same network (same WiFi/LAN) for network development.
