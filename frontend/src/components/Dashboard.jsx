import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { create } from 'ipfs-http-client';
import contractABI from '../abi/ContentRegistry.json';
import { IPFS_CONFIG, CONTRACT_CONFIG } from '../config';

const contractAddress = CONTRACT_CONFIG.address;

// Initialize IPFS client
let ipfs;
try {
  ipfs = create({ 
    host: IPFS_CONFIG.host, 
    port: IPFS_CONFIG.port, 
    protocol: IPFS_CONFIG.protocol 
  });
} catch (err) {
  console.error('Failed to create IPFS client:', err);
}

/**
 * Dashboard Component
 * 
 * Main dashboard after wallet connection with 3 sections:
 * 1. Register Digital Content - Upload to IPFS and register on blockchain
 * 2. My Owned Contents - Display contents owned by connected wallet
 * 3. Transaction History - Show all events (registrations, transfers)
 */
function Dashboard({ account, onDisconnect }) {
  // ============ SECTION 1: Registration State ============
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('Document');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [txStatus, setTxStatus] = useState(''); // 'pending' | 'confirmed' | 'failed'

  // ============ SECTION 2: Owned Contents State ============
  const [ownedContents, setOwnedContents] = useState([]);
  const [loadingContents, setLoadingContents] = useState(true);

  // ============ SECTION 3: Transaction History State ============
  const [transactions, setTransactions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // ============ Shared State ============
  const [error, setError] = useState('');
  const [isIpfsConnected, setIsIpfsConnected] = useState(false);
  const [isContractConnected, setIsContractConnected] = useState(false);

  // ============ Initialize on mount ============
  useEffect(() => {
    checkConnections();
  }, []);

  useEffect(() => {
    if (account) {
      loadOwnedContents();
      loadTransactionHistory();
    }
  }, [account, isContractConnected]);

  // ============ Connection Checks ============
  const checkConnections = async () => {
    // Check IPFS
    try {
      await axios.post(`${IPFS_CONFIG.apiUrl}/id`, {}, { timeout: 3000 });
      setIsIpfsConnected(true);
    } catch {
      setIsIpfsConnected(false);
      console.log('IPFS not connected - start your local IPFS daemon');
    }

    // Check Contract
    try {
      if (!window.ethereum) {
        setIsContractConnected(false);
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);
      // Try to call a view function to verify contract is deployed
      await contract.authority();
      setIsContractConnected(true);
    } catch (err) {
      console.log('Contract not connected - deploy the contract first');
      setIsContractConnected(false);
    }
  };

  // ============ SECTION 1: Registration Functions ============
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!file || !title.trim()) {
      setError('Please select a file and enter a title');
      return;
    }

    if (!isIpfsConnected) {
      setError('IPFS is not connected. Please start your local IPFS daemon (run: ipfs daemon)');
      return;
    }

    if (!isContractConnected) {
      setError('Smart contract is not connected. Please start Hardhat node and deploy the contract.');
      return;
    }

    setIsUploading(true);
    setError('');
    setTxStatus('');
    setUploadStatus('');

    try {
      // Step 1: Upload to IPFS
      setUploadStatus('📤 Uploading to IPFS...');
      const result = await ipfs.add(file);
      const cid = result.path;
      setUploadStatus(`✅ Uploaded! CID: ${cid.substring(0, 16)}...`);

      // Step 2: Register on blockchain
      setUploadStatus('🔐 Waiting for wallet confirmation...');
      setTxStatus('pending');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);

      const tx = await contract.registerContent(cid, title.trim(), description.trim() || '', contentType);
      setUploadStatus(`⏳ Transaction submitted. Waiting for confirmation...`);

      // Wait for confirmation
      await tx.wait();
      setTxStatus('confirmed');
      setUploadStatus('🎉 Content registered successfully!');

      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';

      // Refresh data after short delay
      setTimeout(() => {
        loadOwnedContents();
        loadTransactionHistory();
        setUploadStatus('');
        setTxStatus('');
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      setTxStatus('failed');
      if (err.code === 'ACTION_REJECTED') {
        setError('Transaction rejected by user');
      } else if (err.message?.includes('already registered')) {
        setError('This content is already registered');
      } else {
        setError('Registration failed: ' + (err.shortMessage || err.message || 'Unknown error'));
      }
      setUploadStatus('');
    } finally {
      setIsUploading(false);
    }
  };

  // ============ SECTION 2: Load Owned Contents ============
  const loadOwnedContents = useCallback(async () => {
    if (!account) {
      setLoadingContents(false);
      return;
    }

    setLoadingContents(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);

      // Get user's content CIDs
      const cids = await contract.getUserContents(account);
      
      if (!cids || cids.length === 0) {
        setOwnedContents([]);
        setLoadingContents(false);
        setIsContractConnected(true);
        return;
      }

      // Fetch details for each content
      const contents = [];
      for (const cid of cids) {
        try {
          const data = await contract.getContent(cid);
          // Only show if current account is still the owner
          if (data.owner.toLowerCase() === account.toLowerCase()) {
            contents.push({
              cid: data.cid,
              title: data.title || 'Untitled',
              description: data.description || '',
              contentType: data.contentType || 'Document',
              owner: data.owner,
              timestamp: Number(data.timestamp)
            });
          }
        } catch (err) {
          console.log(`Could not load content ${cid}:`, err.message);
        }
      }

      setOwnedContents(contents);
      setIsContractConnected(true);
    } catch (err) {
      console.error('Error loading contents:', err);
      if (err.message?.includes('BAD_DATA') || err.message?.includes('could not decode')) {
        setIsContractConnected(false);
      }
      setOwnedContents([]);
    } finally {
      setLoadingContents(false);
    }
  }, [account]);

  // ============ SECTION 3: Load Transaction History ============
  const loadTransactionHistory = useCallback(async () => {
    if (!account) {
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);

      // Get all registered contents first to build history
      const allEvents = [];
      
      // Query ContentRegistered events (filter by owner = this account)
      try {
        const registeredFilter = contract.filters.ContentRegistered(null, account);
        const registeredEvents = await contract.queryFilter(registeredFilter, 0, 'latest');
        
        for (const event of registeredEvents) {
          // For indexed strings, we need to get the actual value differently
          // The contentId is hashed, so we'll show the tx hash instead
          const block = await provider.getBlock(event.blockNumber);
          allEvents.push({
            type: 'Registered',
            contentId: event.transactionHash, // Use tx hash as ID since contentId is hashed
            actor: account,
            timestamp: block ? block.timestamp : 0,
            txHash: event.transactionHash
          });
        }
      } catch (err) {
        console.log('Could not load registration events:', err.message);
      }

      // Query ContentTransferred events where user is involved
      try {
        // Events where user sent
        const sentFilter = contract.filters.ContentTransferred(null, account);
        const sentEvents = await contract.queryFilter(sentFilter, 0, 'latest');
        
        for (const event of sentEvents) {
          const block = await provider.getBlock(event.blockNumber);
          allEvents.push({
            type: 'Sent',
            contentId: event.transactionHash,
            actor: account,
            to: event.args.to,
            timestamp: block ? block.timestamp : 0,
            txHash: event.transactionHash
          });
        }

        // Events where user received
        const receivedFilter = contract.filters.ContentTransferred(null, null, account);
        const receivedEvents = await contract.queryFilter(receivedFilter, 0, 'latest');
        
        for (const event of receivedEvents) {
          const block = await provider.getBlock(event.blockNumber);
          allEvents.push({
            type: 'Received',
            contentId: event.transactionHash,
            actor: event.args.from,
            timestamp: block ? block.timestamp : 0,
            txHash: event.transactionHash
          });
        }
      } catch (err) {
        console.log('Could not load transfer events:', err.message);
      }

      // Sort by timestamp (newest first)
      allEvents.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(allEvents);
      setIsContractConnected(true);
    } catch (err) {
      console.error('Error loading history:', err);
      setTransactions([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [account]);

  // ============ Helper Functions ============
  const formatAddress = (addr) => {
    if (!addr) return 'N/A';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatTxHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 6)}`;
  };

  // ============ RENDER ============
  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>📊 Dashboard</h1>
          <p className="wallet-info">
            <span className="status-dot"></span>
            {formatAddress(account)}
          </p>
        </div>
        <div className="header-right">
          <button onClick={() => { loadOwnedContents(); loadTransactionHistory(); }} className="refresh-btn">
            🔄 Refresh
          </button>
          <button onClick={onDisconnect} className="disconnect-btn">
            Disconnect
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="status-bar">
        <span className={`status-item ${isIpfsConnected ? 'connected' : 'disconnected'}`}>
          {isIpfsConnected ? '✓' : '✗'} IPFS {!isIpfsConnected && '(run: ipfs daemon)'}
        </span>
        <span className={`status-item ${isContractConnected ? 'connected' : 'disconnected'}`}>
          {isContractConnected ? '✓' : '✗'} Smart Contract {!isContractConnected && '(deploy contract)'}
        </span>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          ⚠️ {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="dashboard-grid">
        
        {/* ============ SECTION 1: Register Digital Content ============ */}
        <div className="dashboard-section register-section">
          <div className="section-header">
            <h2>📤 Register Digital Content</h2>
            <p>Upload a file to IPFS and register ownership on blockchain</p>
          </div>
          
          <form onSubmit={handleRegister} className="register-form">
            <div className="form-group">
              <label>📁 File *</label>
              <input
                id="file-input"
                type="file"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="file-input"
              />
              {file && <span className="file-name">Selected: {file.name}</span>}
            </div>

            <div className="form-group">
              <label>📝 Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter content title"
                disabled={isUploading}
                required
              />
            </div>

            <div className="form-group">
              <label>📋 Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                disabled={isUploading}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>🏷️ Content Type</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                disabled={isUploading}
              >
                <option value="Document">📄 Document</option>
                <option value="Image">🖼️ Image</option>
                <option value="Video">🎬 Video</option>
                <option value="Audio">🎵 Audio</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="register-btn"
              disabled={isUploading || !file || !title.trim() || !isIpfsConnected || !isContractConnected}
            >
              {isUploading ? '⏳ Processing...' : '🔒 Register Content'}
            </button>

            {/* Transaction Status */}
            {uploadStatus && (
              <div className={`tx-status ${txStatus}`}>
                {uploadStatus}
              </div>
            )}
          </form>
        </div>

        {/* ============ SECTION 2: My Owned Contents ============ */}
        <div className="dashboard-section owned-section">
          <div className="section-header">
            <h2>📁 My Owned Contents</h2>
            <p>Contents currently owned by your wallet ({ownedContents.length})</p>
          </div>

          <div className="contents-list">
            {loadingContents ? (
              <div className="loading">⏳ Loading your contents...</div>
            ) : !isContractConnected ? (
              <div className="empty-state">
                <p>⚠️ Contract not connected</p>
                <p className="hint">1. Start Hardhat: cd backend && npx hardhat node</p>
                <p className="hint">2. Deploy: npx hardhat run scripts/deploy.js --network localhost</p>
              </div>
            ) : ownedContents.length === 0 ? (
              <div className="empty-state">
                <p>📭 No content registered yet</p>
                <p className="hint">Upload your first file using the form!</p>
              </div>
            ) : (
              ownedContents.map((content, idx) => (
                <div key={idx} className="content-card">
                  <div className="content-header">
                    <span className="content-type">{content.contentType}</span>
                    <span className="content-title">{content.title}</span>
                  </div>
                  <div className="content-details">
                    <div className="detail-row">
                      <span className="label">CID:</span>
                      <span className="value cid">{content.cid}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Registered:</span>
                      <span className="value">{formatDate(content.timestamp)}</span>
                    </div>
                    {content.description && (
                      <div className="detail-row">
                        <span className="label">Description:</span>
                        <span className="value desc">{content.description}</span>
                      </div>
                    )}
                  </div>
                  <a 
                    href={`${IPFS_CONFIG.gatewayUrl}/${content.cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-link"
                  >
                    🔗 View on IPFS
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ============ SECTION 3: Transaction History ============ */}
        <div className="dashboard-section history-section">
          <div className="section-header">
            <h2>📜 Transaction History</h2>
            <p>Your registration and transfer activity ({transactions.length})</p>
          </div>

          <div className="history-list">
            {loadingHistory ? (
              <div className="loading">⏳ Loading history...</div>
            ) : !isContractConnected ? (
              <div className="empty-state">
                <p>⚠️ Contract not connected</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">
                <p>📭 No transactions yet</p>
                <p className="hint">Register content to see your history</p>
              </div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Tx Hash</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className={`action-badge ${tx.type.toLowerCase()}`}>
                          {tx.type === 'Registered' && '📝'}
                          {tx.type === 'Sent' && '📤'}
                          {tx.type === 'Received' && '📥'}
                          {' '}{tx.type}
                        </span>
                      </td>
                      <td className="tx-cell">
                        <a 
                          href={`#`} 
                          title={tx.txHash}
                          onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(tx.txHash); }}
                        >
                          {formatTxHash(tx.txHash)}
                        </a>
                      </td>
                      <td>{formatDate(tx.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
          background: #f3f4f6;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          color: white;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
        }

        .header-left h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
        }

        .wallet-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: monospace;
          font-size: 14px;
          opacity: 0.9;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .header-right {
          display: flex;
          gap: 10px;
        }

        .refresh-btn, .disconnect-btn {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .refresh-btn:hover, .disconnect-btn:hover {
          background: rgba(255,255,255,0.3);
        }

        .status-bar {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          padding: 12px 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .status-item {
          font-size: 14px;
          padding: 6px 14px;
          border-radius: 20px;
          font-weight: 500;
        }

        .status-item.connected {
          background: rgba(16, 185, 129, 0.15);
          color: #059669;
        }

        .status-item.disconnected {
          background: rgba(239, 68, 68, 0.15);
          color: #dc2626;
        }

        .error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 14px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .error-banner button {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #dc2626;
          padding: 0 8px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto auto;
          gap: 20px;
        }

        .dashboard-section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .section-header {
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f3f4f6;
        }

        .section-header h2 {
          margin: 0 0 6px 0;
          font-size: 20px;
          color: #1f2937;
        }

        .section-header p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        /* Register Section */
        .register-section {
          grid-column: 1;
          grid-row: 1;
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }

        .form-group input[type="text"],
        .form-group textarea,
        .form-group select {
          padding: 12px 14px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          color: #1f2937;
          transition: border-color 0.2s;
        }

        .form-group input[type="text"]:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #667eea;
        }

        .file-input {
          padding: 12px;
          border: 2px dashed #d1d5db;
          border-radius: 10px;
          cursor: pointer;
          background: #f9fafb;
        }

        .file-input:hover {
          border-color: #667eea;
          background: #f3f4f6;
        }

        .file-name {
          font-size: 13px;
          color: #059669;
          font-weight: 500;
        }

        .register-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          margin-top: 8px;
        }

        .register-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .register-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .tx-status {
          padding: 14px;
          border-radius: 10px;
          font-size: 14px;
          text-align: center;
          font-weight: 500;
        }

        .tx-status.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .tx-status.confirmed {
          background: #d1fae5;
          color: #065f46;
        }

        .tx-status.failed {
          background: #fee2e2;
          color: #991b1b;
        }

        /* Owned Contents Section */
        .owned-section {
          grid-column: 2;
          grid-row: 1 / span 2;
          max-height: 800px;
          overflow-y: auto;
        }

        .contents-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .content-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 18px;
          transition: box-shadow 0.2s;
        }

        .content-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .content-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .content-type {
          background: #e0e7ff;
          color: #4338ca;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .content-title {
          font-weight: 600;
          color: #1f2937;
          font-size: 16px;
        }

        .content-details {
          font-size: 13px;
        }

        .detail-row {
          display: flex;
          gap: 10px;
          margin-bottom: 8px;
          align-items: flex-start;
        }

        .detail-row .label {
          color: #6b7280;
          min-width: 80px;
          flex-shrink: 0;
        }

        .detail-row .value {
          color: #1f2937;
          word-break: break-all;
        }

        .detail-row .cid {
          font-family: monospace;
          font-size: 11px;
          background: #f3f4f6;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .detail-row .desc {
          font-style: italic;
        }

        .view-link {
          display: inline-block;
          margin-top: 12px;
          color: #6366f1;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
        }

        .view-link:hover {
          text-decoration: underline;
        }

        /* History Section */
        .history-section {
          grid-column: 1;
          grid-row: 2;
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .history-table th {
          text-align: left;
          padding: 12px 10px;
          background: #f9fafb;
          color: #6b7280;
          font-weight: 600;
          border-bottom: 2px solid #e5e7eb;
        }

        .history-table td {
          padding: 12px 10px;
          border-bottom: 1px solid #f3f4f6;
          color: #1f2937;
        }

        .action-badge {
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .action-badge.registered {
          background: #d1fae5;
          color: #065f46;
        }

        .action-badge.sent {
          background: #fee2e2;
          color: #991b1b;
        }

        .action-badge.received {
          background: #dbeafe;
          color: #1e40af;
        }

        .tx-cell a {
          font-family: monospace;
          font-size: 11px;
          color: #6366f1;
          text-decoration: none;
        }

        .tx-cell a:hover {
          text-decoration: underline;
        }

        /* States */
        .loading {
          text-align: center;
          color: #6b7280;
          padding: 40px;
          font-size: 14px;
        }

        .empty-state {
          text-align: center;
          color: #6b7280;
          padding: 40px 20px;
        }

        .empty-state p {
          margin: 0 0 8px 0;
        }

        .empty-state .hint {
          font-size: 12px;
          color: #9ca3af;
          font-family: monospace;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
          
          .owned-section {
            grid-column: 1;
            grid-row: auto;
            max-height: none;
          }
          
          .history-section {
            grid-column: 1;
            grid-row: auto;
          }
        }

        @media (max-width: 640px) {
          .dashboard-header {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }

          .header-right {
            width: 100%;
            justify-content: center;
          }

          .status-bar {
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
