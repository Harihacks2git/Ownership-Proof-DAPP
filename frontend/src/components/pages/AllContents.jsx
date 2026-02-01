import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import contractABI from '../../abi/ContentRegistry.json';
import { CONTRACT_CONFIG, IPFS_CONFIG } from '../../config';

const contractAddress = CONTRACT_CONFIG.address;

/**
 * AllContents Page Component (Public Landing Page)
 * 
 * Displays ALL registered content on the network
 * Shows: Title, CID, Owner, Registration Time
 * Allows viewing and requesting ownership
 */
function AllContents({ account, isContractConnected, refreshTrigger }) {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedContent, setSelectedContent] = useState(null);
  const [requestingFor, setRequestingFor] = useState(null);
  const [requestPrice, setRequestPrice] = useState('0');

  const loadAllContents = useCallback(async () => {
    if (!isContractConnected) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);

      console.log('Loading all contents from contract:', contractAddress);

      // Query ALL ContentRegistered events
      const filter = contract.filters.ContentRegistered();
      console.log('Querying ContentRegistered events...');
      const events = await contract.queryFilter(filter, 0, 'latest');
      console.log('Found events:', events.length);

      const contentList = [];
      const seenCids = new Set(); // Track unique CIDs

      for (const event of events) {
        try {
          // The contentId is indexed, so we can't read it directly from args
          // Instead, we need to get the owner address and query their contents
          const ownerAddress = event.args.owner;
          console.log('Processing event for owner:', ownerAddress);

          // Get all contents for this owner
          const ownerCids = await contract.getUserContents(ownerAddress);
          console.log('Owner has', ownerCids.length, 'contents');

          // Process each CID
          for (const cid of ownerCids) {
            // Skip if we've already processed this CID
            if (seenCids.has(cid)) {
              continue;
            }
            seenCids.add(cid);

            try {
              const data = await contract.getContent(cid);
              console.log('Loaded content:', cid);

              contentList.push({
                cid: data.cid,
                title: data.title || 'Untitled',
                description: data.description || '',
                contentType: data.contentType || 'Document',
                owner: data.owner,
                timestamp: Number(data.timestamp)
              });
            } catch (err) {
              console.error(`Could not load content ${cid}:`, err.message);
            }
          }
        } catch (err) {
          console.error(`Could not process event:`, err);
        }
      }

      console.log('Total contents loaded:', contentList.length);

      // Sort by timestamp (newest first)
      contentList.sort((a, b) => b.timestamp - a.timestamp);
      setContents(contentList);
    } catch (err) {
      console.error('Error loading contents:', err);
      setError('Failed to load contents: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [isContractConnected]);

  useEffect(() => {
    loadAllContents();
  }, [loadAllContents, refreshTrigger]);

  const handleRequestOwnership = async (cid) => {
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setError('');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);

      // Check if user already owns this content
      const content = await contract.getContent(cid);
      if (content.owner.toLowerCase() === account.toLowerCase()) {
        setError('You already own this content');
        return;
      }

      // Check if there's already a pending request
      const existingRequest = await contract.getTransferRequest(cid);
      if (existingRequest.isPending) {
        setError('A transfer request is already pending for this content');
        return;
      }

      const priceInWei = requestPrice || '0';
      const tx = await contract.requestOwnership(cid, priceInWei);
      await tx.wait();

      setRequestingFor(null);
      setRequestPrice('0');
      alert('Ownership request sent successfully!');
      
      // Reload contents to update UI
      loadAllContents();
    } catch (err) {
      console.error('Request error:', err);
      if (err.message?.includes('Owner cannot request own content')) {
        setError('You already own this content');
      } else if (err.message?.includes('Request already pending')) {
        setError('A transfer request is already pending for this content');
      } else if (err.code === 'ACTION_REJECTED') {
        setError('Transaction rejected by user');
      } else {
        setError('Failed to request ownership: ' + (err.shortMessage || err.message));
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'Image': return '🖼️';
      case 'Video': return '🎬';
      case 'Audio': return '🎵';
      default: return '📄';
    }
  };

  const isOwner = (content) => {
    return account && content.owner.toLowerCase() === account.toLowerCase();
  };

  return (
    <div className="all-contents-page">
      <div className="page-header">
        <div className="header-text">
          <h1>🌐 All Registered Contents</h1>
          <p>Browse all digital content registered on the blockchain network</p>
        </div>
        <button onClick={loadAllContents} className="refresh-btn" disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">{contents.length}</span>
          <span className="stat-label">Total Contents</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{contents.filter(c => c.contentType === 'Document').length}</span>
          <span className="stat-label">Documents</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{contents.filter(c => c.contentType === 'Image').length}</span>
          <span className="stat-label">Images</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{contents.filter(c => ['Video', 'Audio'].includes(c.contentType)).length}</span>
          <span className="stat-label">Media</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          ⚠️ {error}
          <button 
            onClick={loadAllContents}
            style={{
              marginLeft: '10px',
              padding: '5px 10px',
              background: 'white',
              border: '1px solid var(--error-text)',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Debug Info */}
      {!loading && contents.length === 0 && !error && (
        <div style={{
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          padding: '14px 20px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontSize: '13px',
          color: 'var(--text-primary)'
        }}>
          ℹ️ No content found. Check browser console (F12) for debug logs.
          <br />
          Contract: <code style={{ fontSize: '11px' }}>{contractAddress}</code>
        </div>
      )}

      {/* Content Display */}
      <div className="contents-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner">⏳</div>
            <p>Loading all contents...</p>
          </div>
        ) : !isContractConnected ? (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h3>Contract Not Connected</h3>
            <p>Please ensure the Hardhat node is running and the contract is deployed.</p>
            <p style={{ fontSize: '12px', marginTop: '10px', color: 'var(--text-muted)' }}>
              Contract Address: {contractAddress}
            </p>
          </div>
        ) : contents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Content Registered Yet</h3>
            <p>Be the first to register digital content on the blockchain!</p>
            <button 
              onClick={loadAllContents}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: 'var(--accent-color)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🔄 Retry Loading
            </button>
          </div>
        ) : (
          <div className="contents-grid">
            {contents.map((content, idx) => (
              <div 
                key={idx} 
                className={`content-card ${selectedContent === idx ? 'selected' : ''}`}
                onClick={() => setSelectedContent(selectedContent === idx ? null : idx)}
              >
                <div className="card-header">
                  <span className="type-badge">
                    {getTypeIcon(content.contentType)} {content.contentType}
                  </span>
                  <span className="timestamp">{formatDate(content.timestamp)}</span>
                </div>
                
                <h3 className="card-title">{content.title}</h3>
                
                {content.description && (
                  <p className="card-description">{content.description}</p>
                )}

                <div className="card-owner">
                  <label>Owner</label>
                  <code>{formatAddress(content.owner)}</code>
                  {isOwner(content) && <span className="owner-badge">You</span>}
                </div>
                
                <div className="card-cid">
                  <label>Content ID (CID)</label>
                  <code>{content.cid}</code>
                </div>

                <div className="card-actions">
                  <a 
                    href={`${IPFS_CONFIG.gatewayUrl}/${content.cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-btn primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    🔗 View on IPFS
                  </a>
                  {!isOwner(content) && account && (
                    <button 
                      className="action-btn request"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRequestingFor(content.cid);
                      }}
                    >
                      📤 Request Ownership
                    </button>
                  )}
                </div>

                {/* Request Ownership Modal */}
                {requestingFor === content.cid && (
                  <div className="request-modal" onClick={(e) => e.stopPropagation()}>
                    <h4>Request Ownership</h4>
                    <p>Send a transfer request to the current owner</p>
                    <div className="form-group">
                      <label>Price (₹ Rupees) - 0 for free</label>
                      <input
                        type="number"
                        value={requestPrice}
                        onChange={(e) => setRequestPrice(e.target.value)}
                        placeholder="0"
                        min="0"
                      />
                      <small style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        Note: This is stored on-chain as Wei (1 Wei = 1 Rupee for simulation)
                      </small>
                    </div>
                    <div className="modal-actions">
                      <button 
                        className="action-btn primary"
                        onClick={() => handleRequestOwnership(content.cid)}
                      >
                        Send Request
                      </button>
                      <button 
                        className="action-btn secondary"
                        onClick={() => {
                          setRequestingFor(null);
                          setRequestPrice('0');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .all-contents-page {
          padding: 30px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .header-text h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          color: var(--text-primary);
        }

        .header-text p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 15px;
        }

        .refresh-btn {
          padding: 10px 20px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-primary);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          background: var(--bg-tertiary);
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .stats-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-item {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 32px;
          font-weight: 700;
          color: var(--accent-color);
          margin-bottom: 4px;
        }

        .stat-label {
          color: var(--text-secondary);
          font-size: 13px;
        }

        .error-banner {
          background: var(--error-bg);
          border: 1px solid var(--error-text);
          color: var(--error-text);
          padding: 14px 20px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .loading-state,
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: var(--bg-secondary);
          border-radius: 16px;
          border: 1px solid var(--border-color);
        }

        .spinner {
          font-size: 48px;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          color: var(--text-primary);
        }

        .empty-state p {
          margin: 0;
          color: var(--text-secondary);
        }

        .contents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .content-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .content-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }

        .content-card.selected {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .type-badge {
          background: var(--badge-bg);
          color: var(--badge-text);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .timestamp {
          color: var(--text-muted);
          font-size: 12px;
        }

        .card-title {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: var(--text-primary);
        }

        .card-description {
          margin: 0 0 16px 0;
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.5;
        }

        .card-owner,
        .card-cid {
          margin-bottom: 16px;
        }

        .card-owner label,
        .card-cid label {
          display: block;
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-owner code,
        .card-cid code {
          display: block;
          padding: 10px;
          background: var(--cid-bg);
          border-radius: 8px;
          font-size: 11px;
          word-break: break-all;
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        .owner-badge {
          display: inline-block;
          margin-left: 8px;
          background: var(--success-bg);
          color: var(--success-text);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
        }

        .card-actions {
          display: flex;
          gap: 10px;
        }

        .action-btn {
          flex: 1;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          text-decoration: none;
          border: none;
        }

        .action-btn.primary {
          background: var(--accent-color);
          color: white;
        }

        .action-btn.primary:hover {
          opacity: 0.9;
        }

        .action-btn.secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        .action-btn.secondary:hover {
          background: var(--border-color);
        }

        .action-btn.request {
          background: rgba(251, 191, 36, 0.2);
          color: #f59e0b;
          border: 1px solid rgba(251, 191, 36, 0.4);
        }

        .action-btn.request:hover {
          background: rgba(251, 191, 36, 0.3);
        }

        /* Request Modal */
        .request-modal {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--bg-primary);
          border: 2px solid var(--accent-color);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          z-index: 10;
          min-width: 280px;
        }

        .request-modal h4 {
          margin: 0 0 8px 0;
          color: var(--text-primary);
        }

        .request-modal p {
          margin: 0 0 16px 0;
          color: var(--text-secondary);
          font-size: 13px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }

        .form-group input {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--input-bg);
          color: var(--text-primary);
          font-size: 14px;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
        }

        @media (max-width: 768px) {
          .stats-bar {
            grid-template-columns: repeat(2, 1fr);
          }

          .contents-grid {
            grid-template-columns: 1fr;
          }

          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .refresh-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default AllContents;
