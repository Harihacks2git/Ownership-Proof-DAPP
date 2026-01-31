Project Title

Blockchain-based Digital Content Ownership Registration and Transfer System

Project Goal

The goal of this project is to design and implement a decentralized application (DApp) that allows users to:

Register ownership of digital content

View ownership details and transaction history

Search digital content and its current owner

Request and transfer ownership (free or paid)

Ensure immutability and transparency using blockchain

Store digital content off-chain using IPFS

Detect and notify potential fake or duplicate registrations

The system targets non-crypto users by abstracting blockchain complexity through a simple dashboard UI.

Technology Stack

Frontend: React (Dashboard DApp)

Wallet: MetaMask

Blockchain: Ethereum (simulated using Hardhat)

Smart Contracts: Solidity

Off-chain Storage: IPFS

Payment Gateway: Off-chain (UPI / Card simulation acceptable)

Optional Backend / Authority Server: Node.js (off-chain support)

High-Level Architecture (Mental Model)

Layers:

User Layer

Presentation Layer (Dashboard DApp)

Wallet Layer (MetaMask)

Smart Contract Layer

Blockchain Network Layer

Off-chain Storage Layer (IPFS)

Off-chain Support Services (Authority, Payment Gateway)

Key principle:

Smart contracts enforce rules

Blockchain records state

IPFS stores files

Authority advises, not controls

Core Functional Modules
1. Dashboard DApp (Frontend)

Responsibilities:

Home page showing all registered contents

Search content by CID / metadata

Register new digital content

View “My Contents”

View transaction history

View network-wide history

Request ownership transfer

Handle payment flow (off-chain trigger)

No blockchain logic here — only UI and transaction triggering.

2. Wallet Module (MetaMask)

Responsibilities:

User identity via wallet address

Signing blockchain transactions

Gas fee handling (transparent to user)

Users do not need crypto knowledge beyond clicking “Confirm”.

3. Smart Contract Layer (Core Logic)

There is ONE logical smart contract layer.

Responsibilities:

Content Registration Validation

Reject duplicate CIDs

Register CID → Owner mapping

Ownership Transfer Authorization

Handle transfer requests

Ensure only current owner can approve

Update ownership mapping

State Update & Event Emission

Emit events for frontend updates

Smart contracts do NOT:

Create blocks

Handle payments

Send notifications

4. Blockchain Network Layer

Responsibilities:

Block creation and ordering

Immutable ledger maintenance

Storing ownership metadata

On-chain data includes:

Content Hash (CID)

Owner Wallet Address

Timestamp

Transfer history

5. IPFS (Off-chain Storage)

Responsibilities:

Store encrypted digital content

Chunk files and store as Merkle DAG

Generate CID (Content Identifier)

Only the CID is stored on-chain.
Actual content never enters the blockchain.

6. Authority Server (Off-chain, Optional but Included)

Responsibilities:

Handle fake / duplicate registration complaints

Perform off-chain verification (metadata, similarity)

Notify users about disputes

Read blockchain data (read-only)

Authority server has NO power to:

Modify blockchain state

Transfer ownership

Override smart contracts

7. Payment Gateway (Off-chain)

Responsibilities:

Handle ownership price payment between users

Confirm payment success/failure

Notify frontend

After payment confirmation:

Frontend triggers blockchain transaction

Smart contract updates ownership mapping

CID never changes — only owner address updates.

Ownership Transfer Logic (High-Level)

Buyer requests ownership transfer

Owner approves or rejects

If paid transfer:

Buyer pays via payment gateway

Payment confirmation received

Frontend sends blockchain transaction

Smart contract updates ownership

Blockchain emits event

UI updates

Fake Registration Handling

Smart contract prevents exact duplicate CID registration

Authority server handles complaints for:

Modified copies

Similar content

Legal disputes

Authority sends notifications only

Final ownership enforcement remains on-chain

What Is Already Implemented

Dashboard UI with:

Register ownership

My contents

Transaction history

Blockchain block structure visualization

High-level architecture diagram

IPFS-based content storage (basic)

Smart contract skeleton (ownership mapping)

What Must Be Completed?

Priority order:

Finalize smart contract logic (registration + transfer)

Event emission and frontend listening

Ownership transfer (free + paid flow simulation)

Network-wide history view

Clean architecture + module diagrams

Clear explanation of on-chain vs off-chain logic

Non-Goals (Out of Scope for Review)

Real ETH payments

Mainnet deployment

Advanced encryption schemes

DAO-based governance

One-line Project Summary (for Review)

“A decentralized platform that registers and transfers digital content ownership using blockchain for immutable records and IPFS for off-chain storage, with user-friendly abstractions for non-crypto users.”