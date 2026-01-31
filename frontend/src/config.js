// Configuration file for IPFS and contract settings
// This allows easy configuration without hardcoding values

// IPFS Configuration
// Default to local IPFS daemon (Kubo)
export const IPFS_CONFIG = {
  // IPFS API endpoint (for uploading)
  apiUrl: import.meta.env.VITE_IPFS_API_URL || 'http://127.0.0.1:5001/api/v0',
  // IPFS Gateway URL (for viewing content)
  // Note: Check your IPFS gateway port with: ipfs config Addresses.Gateway
  gatewayUrl: import.meta.env.VITE_IPFS_GATEWAY_URL || 'http://127.0.0.1:3046/ipfs',
  // IPFS client host and port
  host: import.meta.env.VITE_IPFS_HOST || 'localhost',
  port: import.meta.env.VITE_IPFS_PORT || '5001',
  protocol: import.meta.env.VITE_IPFS_PROTOCOL || 'http'
};

// Contract Configuration
export const CONTRACT_CONFIG = {
  address: import.meta.env.VITE_CONTRACT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  chainId: import.meta.env.VITE_CHAIN_ID || "31337" // Hardhat local network
};

// Authority Server Configuration (for authority updates)
export const AUTHORITY_CONFIG = {
  apiUrl: import.meta.env.VITE_AUTHORITY_API_URL || 'http://localhost:3001'
};
