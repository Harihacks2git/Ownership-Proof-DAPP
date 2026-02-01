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
  address: import.meta.env.VITE_CONTRACT_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  chainId: import.meta.env.VITE_CHAIN_ID || "31337" // Hardhat local network
};

// Authority Server Configuration (for authority updates)
export const AUTHORITY_CONFIG = {
  apiUrl: import.meta.env.VITE_AUTHORITY_API_URL || 'http://localhost:3001'
};
