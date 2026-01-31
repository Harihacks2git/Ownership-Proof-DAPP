import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import contractABI from '../../abi/ContentRegistry.json';
import { CONTRACT_CONFIG, IPFS_CONFIG } from '../../config';

const contractAddress = CONTRACT_CONFIG.address;

/**
 * MyContents Page Component
 * 
 * Displays all content items owned by the connected wallet.
 * Shows: Title, CID, Content Type, Registration Time
 */
function MyContents({ account, isContractConnected, refreshTrigger }) {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedContent, setSelectedContent] = useState(null);

  const loadContents = useCallback(async () => {
    if (!account || !isContractConnected) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);

      // Get user's content CIDs
      const cids = await contract.getUserContents(account);
      
      if (!cids || cids.length === 0) {
        setContents([]);
        setLoading(false);
        return;
      }

      // Fetch details for each content
      const contentList = [];
      for (const cid of cids) {
        try {
          const data = await contract.getContent(cid);
          // Only show if current account is still the owner
          if (data.owner.toLowerCase() === account.toLowerCase()) {
            contentList.push({
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

      // Sort by timestamp (newest first)
      contentList.sort((a, b) => b.timestamp - a.timestamp);
      setContents(contentList);
    } catch (err) {
      console.error('Error loading contents:', err);
      setError('Failed to load contents. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [account, isContractConnected]);

  useEffect(() => {
    loadContents();
  }, [loadContents, refreshTrigger]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'Image': return '🖼️';
      case 'Video': return '🎬';
      case 'Audio': return '🎵';
      default: return '📄';
    }
  };

  return (
    <div className="my-contents-page">
      <div className="page-header">
        <div className="header-text">
          <h1>📁 My Owned Contents</h1>
          <p>These are the contents currently owned by your wallet</p>
        </div>
        <button onClick={loadContents} className="refresh-btn" disabled={loading}>
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
        </div>
      )}

      {/* Content Display */}
      <div className="contents-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner">⏳</div>
            <p>Loading your contents...</p>
          </div>
        ) : !isContractConnected ? (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h3>Contract Not Connected</h3>
            <p>Please ensure the Hardhat node is running and the contract is deployed.</p>
          </div>
        ) : contents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Content Registered Yet</h3>
            <p>Go to "Register Content" to upload your first digital content.</p>
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
                  <button 
                    className="action-btn secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(content.cid);
                    }}
                  >
                    📋 Copy CID
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .my-contents-page {
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

        .card-cid {
          margin-bottom: 16px;
        }

        .card-cid label {
          display: block;
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

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

export default MyContents;
