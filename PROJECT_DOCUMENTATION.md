# Ownership Proof DApp - Technical Documentation

## Project Overview

A decentralized application (DApp) for registering and managing digital content ownership on the blockchain using IPFS for content storage and Ethereum smart contracts for ownership verification.

### Core Functionality
- Register digital content ownership on blockchain
- Transfer ownership between users
- Request and approve/reject ownership transfers
- Track complete ownership history
- Immutable proof of ownership with timestamps
- Network-wide transparency of all transactions

---

## Architecture Overview

### Technology Stack

**Blockchain Layer:**
- Hardhat (Local Ethereum development environment)
- Solidity ^0.8.19 (Smart contract language)
- Ethers.js v6 (Blockchain interaction library)

**Storage Layer:**
- IPFS (InterPlanetary File System) for decentralized content storage
- ipfs-http-client (IPFS JavaScript client)

**Frontend Layer:**
- React 18.3.1 (UI framework)
- Vite 5.4.2 (Build tool and dev server)
- TailwindCSS 3.4.1 (Styling framework)

**Wallet Integration:**
- MetaMask (Browser wallet for transaction signing)

---

## Smart Contract Architecture

### Contract: ContentRegistry

**File:** `backend/contracts/ownership.sol`

#### Core Data Structures

```solidity
struct Content {
    string cid;                    // IPFS Content Identifier
    string title;                  // Content title
    string description;            // Content description
    string contentType;            // Type: Document/Image/Video/Audio
    address owner;                 // Current owner address
    uint256 timestamp;             // Registration timestamp
    address[] ownerHistory;        // Complete ownership chain
    uint256[] timeHistory;         // Timestamp for each transfer
}

struct TransferRequest {
    address requester;             // Address requesting ownership
    uint256 price;                 // Offered price (in Wei)
    bool isPending;                // Request status
    uint256 timestamp;             // Request creation time
}
```

#### State Variables

```solidity
address public authority;                                              // Authority address for content updates
mapping(string => bool) private cidExists;                            // CID existence check
mapping(string => Content) private contents;                          // CID to Content mapping
mapping(address => string[]) private userContents;                    // User to CIDs mapping
mapping(string => mapping(address => TransferRequest)) private transferRequests;  // Multi-request support
```

---

## Smart Contract Rules & Algorithms

### 1. Content Registration Algorithm

**Function:** `registerContent()`

**Rules:**
- Content ID (CID) must be unique (no duplicates)
- Registrant becomes the initial owner
- Timestamp recorded at registration
- Owner history initialized with registrant

**Algorithm:**
```
INPUT: contentId, title, description, contentType
1. CHECK if cidExists[contentId] == true
   - IF true: EMIT DuplicateRegistrationAttempt event
   - REVERT with "content already registered"
2. CREATE new Content struct
3. SET owner = msg.sender
4. ADD msg.sender to ownerHistory
5. ADD block.timestamp to timeHistory
6. SET cidExists[contentId] = true
7. ADD contentId to userContents[msg.sender]
8. EMIT ContentRegistered event
OUTPUT: Transaction success
```

**Complexity:** O(1) - Constant time operation

---

### 2. Ownership Transfer Algorithm

**Function:** `transferContentToBuyer()` / `transferOwnership()`

**Rules:**
- Only current owner can initiate transfer
- Content must be registered
- Ownership history is immutable (append-only)
- New owner added to recipient's content list

**Algorithm:**
```
INPUT: contentId, buyer
1. REQUIRE cidExists[contentId] == true
2. REQUIRE msg.sender == contents[contentId].owner
3. STORE previous_owner = contents[contentId].owner
4. UPDATE contents[contentId].owner = buyer
5. APPEND buyer to ownerHistory
6. APPEND block.timestamp to timeHistory
7. ADD contentId to userContents[buyer]
8. EMIT ContentTransferred event
OUTPUT: Ownership transferred
```

**Complexity:** O(1) - Constant time operation

---

### 3. Multi-Request Ownership System

**Function:** `requestOwnership()`

**Rules:**
- Multiple users can request same content
- One pending request per user per content
- Owner cannot request own content
- Each request stores offered price

**Algorithm:**
```
INPUT: contentId, price
1. REQUIRE cidExists[contentId] == true
2. REQUIRE msg.sender != contents[contentId].owner
3. CHECK transferRequests[contentId][msg.sender].isPending
   - IF true: REVERT "already have pending request"
4. CREATE TransferRequest:
   - requester = msg.sender
   - price = price
   - isPending = true
   - timestamp = block.timestamp
5. STORE in transferRequests[contentId][msg.sender]
6. EMIT OwnershipRequested event
OUTPUT: Request created
```

**Complexity:** O(1) - Constant time operation

---

### 4. Request Approval Algorithm

**Function:** `approveTransfer()`

**Rules:**
- Only owner can approve
- Approves specific requester
- Transfers ownership immediately
- Other pending requests become invalid (ownership changed)

**Algorithm:**
```
INPUT: contentId, requester
1. REQUIRE cidExists[contentId] == true
2. REQUIRE msg.sender == contents[contentId].owner
3. REQUIRE transferRequests[contentId][requester].isPending == true
4. SET transferRequests[contentId][requester].isPending = false
5. EXECUTE ownership transfer to requester
6. EMIT OwnershipApproved event
7. EMIT ContentTransferred event
OUTPUT: Ownership transferred to approved requester
```

**Complexity:** O(1) - Constant time operation

---

### 5. Request Rejection Algorithm

**Function:** `rejectTransfer()`

**Rules:**
- Only owner can reject
- Rejects specific requester
- Request marked as not pending
- No ownership change

**Algorithm:**
```
INPUT: contentId, requester
1. REQUIRE cidExists[contentId] == true
2. REQUIRE msg.sender == contents[contentId].owner
3. REQUIRE transferRequests[contentId][requester].isPending == true
4. SET transferRequests[contentId][requester].isPending = false
5. EMIT OwnershipRejected event
OUTPUT: Request rejected
```

**Complexity:** O(1) - Constant time operation

---

### 6. Authority Update Algorithm

**Function:** `authorityUpdateCID()`

**Rules:**
- Only authority address can update
- Updates CID (for content redaction/update)
- Preserves ownership history
- Authority action recorded in history

**Algorithm:**
```
INPUT: contentId, newCid
1. REQUIRE msg.sender == authority
2. REQUIRE cidExists[contentId] == true
3. REQUIRE newCid is not empty
4. STORE oldCid = contents[contentId].cid
5. UPDATE contents[contentId].cid = newCid
6. APPEND authority address to ownerHistory
7. APPEND block.timestamp to timeHistory
8. EMIT ContentAuthorityUpdated event
OUTPUT: CID updated
```

**Complexity:** O(1) - Constant time operation

---

## Performance Metrics & Evaluation

### 1. Transaction Throughput

**Metric:** Transactions per second (TPS)

**Formula:**
```
TPS = Total_Transactions / Time_Period_Seconds
```

**Evaluation Method:**
- Deploy contract to local Hardhat network
- Execute batch of registration/transfer transactions
- Measure time from first tx submission to last tx confirmation
- Calculate TPS

**Expected Performance (Local):**
- Hardhat: ~1000-2000 TPS (instant mining)
- Testnet: ~15-30 TPS (depends on network)
- Mainnet: ~15-30 TPS (Ethereum mainnet)

---

### 2. Gas Consumption

**Metric:** Gas units per operation

**Formula:**
```
Average_Gas = Sum(Gas_Used_Per_Transaction) / Number_Of_Transactions
Cost_USD = (Gas_Used * Gas_Price_Gwei * ETH_Price_USD) / 10^9
```

**Measured Operations:**

| Operation | Estimated Gas | Complexity |
|-----------|--------------|------------|
| Contract Deployment | ~2,793,706 | One-time |
| registerContent() | ~150,000-200,000 | O(1) |
| requestOwnership() | ~80,000-100,000 | O(1) |
| approveTransfer() | ~120,000-150,000 | O(1) |
| rejectTransfer() | ~50,000-70,000 | O(1) |
| getContent() | 0 (read-only) | O(1) |
| getUserContents() | 0 (read-only) | O(n) |

**Evaluation Method:**
```javascript
const tx = await contract.registerContent(...);
const receipt = await tx.wait();
console.log("Gas used:", receipt.gasUsed.toString());
```

---

### 3. Storage Efficiency

**Metric:** Storage slots used per content

**Formula:**
```
Storage_Per_Content = Base_Struct_Size + (History_Length * 2 * 32_bytes)
Total_Storage = Number_Of_Contents * Storage_Per_Content
```

**Breakdown:**
- CID (string): ~32-64 bytes
- Title (string): ~32-128 bytes
- Description (string): ~32-256 bytes
- ContentType (string): ~32 bytes
- Owner (address): 20 bytes
- Timestamp (uint256): 32 bytes
- OwnerHistory (address[]): 32 bytes per entry
- TimeHistory (uint256[]): 32 bytes per entry

**Evaluation Method:**
- Query contract storage after N registrations
- Calculate average storage per content
- Project storage costs for scale

---

### 4. Query Response Time

**Metric:** Time to retrieve content data

**Formula:**
```
Average_Response_Time = Sum(Query_Time_i) / Number_Of_Queries
```

**Measured Queries:**
- `getContent(cid)`: O(1) - Direct mapping lookup
- `getUserContents(address)`: O(n) - Returns array of n CIDs
- `getTransferRequest(cid, requester)`: O(1) - Direct mapping lookup

**Evaluation Method:**
```javascript
const start = performance.now();
const content = await contract.getContent(cid);
const end = performance.now();
console.log("Query time:", end - start, "ms");
```

**Expected Performance:**
- Local: <10ms
- Testnet: 100-500ms
- Mainnet: 200-1000ms

---

### 5. Event Query Performance

**Metric:** Time to query historical events

**Formula:**
```
Event_Query_Time = f(Block_Range, Event_Count, Network_Latency)
Query_Rate = Events_Retrieved / Query_Time_Seconds
```

**Measured Queries:**
- ContentRegistered events: All registrations
- ContentTransferred events: All transfers
- OwnershipRequested events: All requests
- OwnershipApproved/Rejected events: All resolutions

**Evaluation Method:**
```javascript
const start = performance.now();
const filter = contract.filters.ContentRegistered();
const events = await contract.queryFilter(filter, 0, 'latest');
const end = performance.now();
console.log("Events:", events.length, "Time:", end - start, "ms");
```

**Performance Factors:**
- Block range size
- Number of events
- Network latency
- RPC provider limits

---

### 6. IPFS Upload/Retrieval Performance

**Metric:** Time and success rate for IPFS operations

**Formula:**
```
Upload_Time = Time_To_Add_To_IPFS + Time_To_Pin
Retrieval_Time = Time_To_Fetch_From_Gateway
Success_Rate = Successful_Operations / Total_Operations * 100
```

**Evaluation Method:**
```javascript
// Upload
const start = performance.now();
const result = await ipfs.add(file);
const end = performance.now();
console.log("Upload time:", end - start, "ms", "CID:", result.path);

// Retrieval
const fetchStart = performance.now();
const response = await fetch(`${gateway}/${cid}`);
const fetchEnd = performance.now();
console.log("Retrieval time:", fetchEnd - fetchStart, "ms");
```

**Expected Performance:**
- Upload (local): 100-1000ms (depends on file size)
- Retrieval (local gateway): 50-500ms
- Retrieval (public gateway): 1000-5000ms

---

### 7. Frontend Rendering Performance

**Metric:** Time to load and render content lists

**Formula:**
```
Load_Time = Contract_Query_Time + Data_Processing_Time + Render_Time
FPS = Frames_Rendered / Time_Period_Seconds
```

**Measured Operations:**
- Load all contents page
- Load user contents
- Load transaction history
- Load pending alerts

**Evaluation Method:**
```javascript
const start = performance.now();
await loadAllContents();
const end = performance.now();
console.log("Page load time:", end - start, "ms");
```

---

## Module Architecture

### Backend Modules

#### 1. Smart Contract Module
**File:** `backend/contracts/ownership.sol`
- **Purpose:** Core business logic on blockchain
- **Components:**
  - Content struct
  - TransferRequest struct
  - State mappings
  - Registration functions
  - Transfer functions
  - Request management functions
  - Query functions
- **Dependencies:** Solidity compiler

#### 2. Deployment Module
**File:** `backend/scripts/deploy.js`
- **Purpose:** Deploy contract to blockchain
- **Components:**
  - Contract factory
  - Deployment script
  - Authority address configuration
- **Dependencies:** Hardhat, Ethers.js

#### 3. Hardhat Configuration Module
**File:** `backend/hardhat.config.js`
- **Purpose:** Configure development environment
- **Components:**
  - Network configuration
  - Solidity compiler settings
  - Path configurations
- **Dependencies:** Hardhat

#### 4. Contract ABI Module
**File:** `backend/artifacts/contracts/ownership.sol/ContentRegistry.json`
- **Purpose:** Interface definition for frontend
- **Components:**
  - Function signatures
  - Event definitions
  - Contract bytecode
- **Generated by:** Hardhat compiler

---

### Frontend Modules

#### 1. Dashboard Module
**File:** `frontend/src/components/Dashboard.jsx`
- **Purpose:** Main application container
- **Components:**
  - Page routing
  - Wallet connection state
  - IPFS connection state
  - Contract connection state
  - Refresh trigger management
- **Dependencies:** React, Ethers.js

#### 2. Sidebar Navigation Module
**File:** `frontend/src/components/Sidebar.jsx`
- **Purpose:** Application navigation
- **Components:**
  - Navigation menu
  - Connection status indicators
  - Wallet information display
  - Disconnect functionality
- **Dependencies:** React

#### 3. All Contents Module
**File:** `frontend/src/components/pages/AllContents.jsx`
- **Purpose:** Public content browser
- **Components:**
  - Content grid display
  - Content statistics
  - Request ownership modal
  - IPFS content viewer
- **Functions:**
  - `loadAllContents()`: Query all registered content
  - `handleRequestOwnership()`: Send ownership request
- **Dependencies:** React, Ethers.js, Contract ABI

#### 4. Register Content Module
**File:** `frontend/src/components/pages/RegisterContent.jsx`
- **Purpose:** Content registration interface
- **Components:**
  - File upload form
  - Metadata input fields
  - IPFS upload handler
  - Blockchain registration handler
- **Functions:**
  - `handleRegister()`: Upload to IPFS and register on blockchain
  - `checkContentExists()`: Prevent duplicate registration
- **Dependencies:** React, Ethers.js, IPFS HTTP Client, Contract ABI

#### 5. My Contents Module
**File:** `frontend/src/components/pages/MyContents.jsx`
- **Purpose:** User's owned content management
- **Components:**
  - Content cards with metadata
  - Pending request notifications
  - Approve/Reject buttons
  - Content statistics
- **Functions:**
  - `loadContents()`: Load user's owned content
  - `handleApproveTransfer()`: Approve ownership request
  - `handleRejectTransfer()`: Reject ownership request
- **Dependencies:** React, Ethers.js, Contract ABI

#### 6. Alerts Module
**File:** `frontend/src/components/pages/Alerts.jsx`
- **Purpose:** Pending transfer request notifications
- **Components:**
  - Alert cards
  - Request details
  - Approve/Reject actions
  - Alert statistics
- **Functions:**
  - `loadAlerts()`: Load all pending requests for user's content
  - `handleApprove()`: Approve specific request
  - `handleReject()`: Reject specific request
- **Dependencies:** React, Ethers.js, Contract ABI

#### 7. Transaction History Module
**File:** `frontend/src/components/pages/TransactionHistory.jsx`
- **Purpose:** Network-wide transaction audit trail
- **Components:**
  - Timeline view
  - Table view
  - Filter tabs
  - Status badges
- **Functions:**
  - `loadHistory()`: Query all blockchain events
  - Event types: Registered, Transferred, Requested, Duplicate Attempts
- **Dependencies:** React, Ethers.js, Contract ABI

#### 8. Configuration Module
**File:** `frontend/src/config.js`
- **Purpose:** Application configuration
- **Components:**
  - Contract address
  - IPFS connection settings
  - Network configuration
- **Dependencies:** None

#### 9. Contract ABI Module (Frontend)
**File:** `frontend/src/abi/ContentRegistry.json`
- **Purpose:** Contract interface for frontend
- **Components:**
  - Function signatures
  - Event definitions
- **Source:** Copied from backend artifacts

---

## Data Flow Diagrams

### 1. Content Registration Flow

```
User → Frontend (RegisterContent)
  ↓
Select File → IPFS Client
  ↓
Upload to IPFS → Receive CID
  ↓
Check if CID exists → Smart Contract (checkContentExists)
  ↓
If exists → Show error
If not exists → Continue
  ↓
Request wallet signature → MetaMask
  ↓
Submit transaction → Smart Contract (registerContent)
  ↓
Transaction mined → Event emitted (ContentRegistered)
  ↓
Update UI → Show success
```

### 2. Ownership Request Flow

```
User (Requester) → Frontend (AllContents)
  ↓
Click "Request Ownership" → Open modal
  ↓
Enter price → Validate input
  ↓
Check existing request → Smart Contract (getTransferRequest)
  ↓
If pending → Show error
If not → Continue
  ↓
Request wallet signature → MetaMask
  ↓
Submit transaction → Smart Contract (requestOwnership)
  ↓
Transaction mined → Event emitted (OwnershipRequested)
  ↓
Update UI → Show "Requested" status
  ↓
Owner receives notification → Alerts page
```

### 3. Ownership Transfer Flow

```
Owner → Frontend (MyContents/Alerts)
  ↓
View pending requests → Load from contract
  ↓
Click "Approve" → Confirm action
  ↓
Request wallet signature → MetaMask
  ↓
Submit transaction → Smart Contract (approveTransfer)
  ↓
Transaction mined → Events emitted:
  - OwnershipApproved
  - ContentTransferred
  ↓
Update ownership → Transfer complete
  ↓
Other pending requests → Become invalid (ownership changed)
  ↓
Update UI → Remove from alerts, update content owner
```

---

## Event System

### Emitted Events

```solidity
event ContentRegistered(string indexed contentId, address indexed owner, uint256 timestamp);
event ContentTransferred(string indexed contentId, address indexed from, address indexed to, uint256 timestamp);
event ContentAuthorityUpdated(string indexed contentId, string oldCid, string newCid, address indexed authority, uint256 timestamp);
event OwnershipRequested(string indexed contentId, address indexed requester, uint256 price, uint256 timestamp);
event OwnershipApproved(string indexed contentId, address indexed owner, address indexed buyer, uint256 timestamp);
event OwnershipRejected(string indexed contentId, address indexed owner, address indexed requester, uint256 timestamp);
event DuplicateRegistrationAttempt(string indexed contentId, address indexed attempter, address indexed currentOwner, uint256 timestamp);
```

### Event Usage in Frontend

- **Transaction History:** Queries all events for network-wide audit trail
- **Alerts:** Queries OwnershipRequested events for user's content
- **Status Tracking:** Determines request status from events
- **Real-time Updates:** Listens for new events to update UI

---

## Security Features

### 1. Access Control
- Only owner can transfer content
- Only owner can approve/reject requests
- Only authority can update CID
- Owner cannot request own content

### 2. Duplicate Prevention
- CID uniqueness enforced
- One pending request per user per content
- Duplicate registration attempts logged

### 3. Immutable History
- Ownership history is append-only
- Timestamps recorded for all actions
- Complete audit trail maintained

### 4. Validation
- Content existence checks
- Owner verification
- Request status validation
- Input sanitization

---

## Current Implementation Status

### ✅ Completed Features

1. **Content Registration**
   - Upload to IPFS
   - Register on blockchain
   - Duplicate detection
   - Metadata storage

2. **Ownership Management**
   - View owned content
   - Transfer ownership
   - Ownership history tracking

3. **Multi-Request System**
   - Multiple users can request same content
   - Individual request tracking
   - Approve/reject specific requests
   - Auto-invalidation on ownership change

4. **Alerts & Notifications**
   - Pending request notifications
   - Real-time alert updates
   - Request details display

5. **Transaction History**
   - Network-wide event tracking
   - Status indicators (Pending/Approved/Rejected)
   - Filter by event type
   - Timeline and table views

6. **User Interface**
   - Responsive design
   - Dark theme
   - Wallet integration
   - Connection status indicators

---

## Future Enhancements (TODO)

### 1. Payment Integration
- **Current:** Price stored but not enforced
- **TODO:** 
  - Implement actual ETH/token payment on approval
  - Escrow system for secure payments
  - Refund mechanism for rejected requests

### 2. Content Verification
- **TODO:**
  - Hash verification system
  - Content authenticity checks
  - Digital signatures

### 3. Batch Operations
- **TODO:**
  - Bulk content registration
  - Batch transfer approvals
  - Multi-content requests

### 4. Advanced Search & Filtering
- **TODO:**
  - Search by title/description
  - Filter by content type
  - Sort by date/price
  - Owner-based filtering

### 5. Notification System
- **TODO:**
  - Email notifications
  - Browser push notifications
  - Webhook integrations

### 6. Analytics Dashboard
- **TODO:**
  - User statistics
  - Network metrics
  - Gas usage analytics
  - Popular content tracking

### 7. Content Categories & Tags
- **TODO:**
  - Category system
  - Tag-based organization
  - Category-specific views

### 8. Dispute Resolution
- **TODO:**
  - Dispute filing system
  - Authority intervention mechanism
  - Evidence submission

### 9. Multi-chain Support
- **TODO:**
  - Deploy to multiple networks
  - Cross-chain content registry
  - Network selection UI

### 10. IPFS Pinning Service
- **TODO:**
  - Integrate with Pinata/Infura
  - Ensure content persistence
  - Redundant storage

### 11. Mobile Application
- **TODO:**
  - React Native app
  - Mobile wallet integration
  - Responsive mobile UI

### 12. API Layer
- **TODO:**
  - REST API for external integrations
  - GraphQL endpoint
  - API documentation

---

## Testing Requirements

### Unit Tests Needed
- Smart contract function tests
- Edge case validation
- Access control tests
- Event emission tests

### Integration Tests Needed
- Frontend-contract interaction
- IPFS upload/retrieval
- Wallet connection flow
- End-to-end user journeys

### Performance Tests Needed
- Gas optimization tests
- Load testing (multiple users)
- Event query performance
- IPFS gateway performance

---

## Deployment Checklist

### Testnet Deployment
- [ ] Deploy to Sepolia/Goerli
- [ ] Verify contract on Etherscan
- [ ] Configure frontend for testnet
- [ ] Test with testnet ETH
- [ ] Document testnet addresses

### Mainnet Deployment
- [ ] Security audit
- [ ] Gas optimization review
- [ ] Deploy to Ethereum mainnet
- [ ] Verify contract on Etherscan
- [ ] Configure production frontend
- [ ] Set up monitoring
- [ ] Document mainnet addresses

---

## Development Setup

### Prerequisites
- Node.js v18+
- MetaMask browser extension
- IPFS daemon (local or remote)

### Installation
```bash
# Backend
cd backend
npm install
npx hardhat node          # Terminal 1
npm run deploy            # Terminal 2

# Frontend
cd frontend
npm install
npm run dev               # Terminal 3

# IPFS
ipfs daemon               # Terminal 4
```

### Configuration
1. Update contract address in `frontend/src/config.js`
2. Configure IPFS settings in `frontend/src/config.js`
3. Connect MetaMask to localhost:8545
4. Import Hardhat test accounts to MetaMask

---

## Module Dependency Graph

```
Smart Contract (ownership.sol)
    ↓
Contract ABI (ContentRegistry.json)
    ↓
Frontend Configuration (config.js)
    ↓
Dashboard (Main Container)
    ├── Sidebar (Navigation)
    ├── AllContents (Public View)
    │   └── IPFS Client
    ├── RegisterContent (Upload)
    │   └── IPFS Client
    ├── MyContents (Owner View)
    ├── Alerts (Notifications)
    └── TransactionHistory (Audit Trail)
```

---

## Performance Optimization Recommendations

1. **Event Caching:** Cache queried events to reduce RPC calls
2. **Pagination:** Implement pagination for large content lists
3. **Lazy Loading:** Load content details on-demand
4. **IPFS Gateway:** Use dedicated IPFS gateway for production
5. **Gas Optimization:** Optimize struct packing in contract
6. **Batch Queries:** Combine multiple contract calls
7. **State Management:** Implement Redux/Context for global state

---

## Conclusion

This DApp provides a solid foundation for decentralized content ownership management. The current implementation covers core functionality with room for significant enhancements in payment processing, advanced features, and scalability improvements.

**Key Strengths:**
- Immutable ownership records
- Multi-request support
- Complete audit trail
- Decentralized storage
- Transparent operations

**Areas for Improvement:**
- Payment enforcement
- Advanced search capabilities
- Mobile support
- Multi-chain deployment
- Enhanced analytics

---

**Document Version:** 1.0  
**Last Updated:** February 1, 2026  
**Project Status:** Core Features Complete, Enhancements Pending
