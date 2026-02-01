import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import contractABI from '../../abi/ContentRegistry.json';
import { CONTRACT_CONFIG, IPFS_CONFIG } from '../../config';

const contractAddress = CONTRACT_CONFIG.address;

/**
 * Alerts Page Component
 * 
 * Shows pending transfer requests for content owned by the current user.
 * When someone requests ownership of your content, you get notified here.
 * Once approved or rejected, the alert is removed.
 */
function Alerts({ account, isContractConnected, refreshTrigger }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAlerts = useCallback(async () => {
    if (!account || !isContractConnected) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);

      console.log('Loading alerts for account:', account);

      // Get all content owned by current user
      const userCids = await contract.getUserContents(account);
      console.log('User owns', userCids.length, 'contents');

      const alertsList = [];

      // For each owned content, check for pending transfer requests
      for (const cid of userCids) {
        try {
          // Get transfer request for this content
          const transferReq = await contract.getTransferRequest(cid);
          
          // Only show if there's a PENDING request
          if (transferReq.isPending && transferReq.requester !== ethers.ZeroAddress) {
            const content = await contract.getContent(cid);
            
            // Get the request event to find when it was created
            const requestFilter = contract.filters.OwnershipRequested(cid);
            const requestEvents = await contract.queryFilter(requestFilter, 0, 'latest');
            
            // Get the most recent request event
            const latestRequest = requestEvents[requestEvents.length - 1];
            const block = latestRequest ? await provider.getBlock(latestRequest.blockNumber) : null;

            alertsList.push({
              cid: cid,
              contentTitle: content.title || 'Untitled',
              contentType: content.contentType || 'Document',
              requester: transferReq.requester,
              price: transferReq.price,
              timestamp: block ? block.timestamp : transferReq.timestamp,
              txHash: latestRequest ? latestRequest.transactionHash : '',
              blockNumber: latestRequest ? latestRequest.blockNumber : 0
            });
          }
        } catch (err) {
          console.error(`Error loading alerts for ${cid}:`, err.message);
        }
      }

      // Sort by timestamp (newest first)
      alertsList.sort((a, b) => b.timestamp - a.timestamp);
      console.log('Total pending requests:', alertsList.length);
      setAlerts(alertsList);
    } catch (err) {
      console.error('Error loading alerts:', err);
      setError('Failed to load alerts: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [account, isContractConnected]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts, refreshTrigger]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatTxHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
  };

  const formatPrice = (price) => {
    if (!price) return '₹0';
    return `₹${price.toString()}`;
  };

  const handleApprove = async (cid) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);

      const tx = await contract.approveTransfer(cid);
      await tx.wait();
      
      // Reload alerts after approval
      loadAlerts();
    } catch (err) {
      console.error('Error approving transfer:', err);
      setError('Failed to approve transfer: ' + (err.shortMessage || err.message));
    }
  };

  const handleReject = async (cid) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);

      const tx = await contract.rejectTransfer(cid);
      await tx.wait();
      
      // Reload alerts after rejection
      loadAlerts();
    } catch (err) {
      console.error('Error rejecting transfer:', err);
      setError('Failed to reject transfer: ' + (err.shortMessage || err.message));
    }
  };

  return (
    <div className="alerts-page">
      <div className="page-header">
        <div className="header-text">
          <h1>🔔 Transfer Requests</h1>
          <p>Pending ownership transfer requests for your digital content</p>
        </div>
        <button onClick={loadAlerts} className="refresh-btn" disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item alert">
          <span className="stat-value">{alerts.length}</span>
          <span className="stat-label">Pending Requests</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{new Set(alerts.map(a => a.cid)).size}</span>
          <span className="stat-label">Contents Requested</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{new Set(alerts.map(a => a.requester)).size}</span>
          <span className="stat-label">Unique Requesters</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      {/* Alerts Display */}
      <div className="alerts-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner">⏳</div>
            <p>Loading security alerts...</p>
          </div>
        ) : !isContractConnected ? (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h3>Contract Not Connected</h3>
            <p>Please ensure the Hardhat node is running and the contract is deployed.</p>
          </div>
        ) : !account ? (
          <div className="empty-state">
            <div className="empty-icon">🔒</div>
            <h3>Wallet Not Connected</h3>
            <p>Please connect your wallet to view alerts.</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="empty-state success">
            <div className="empty-icon">✅</div>
            <h3>No Pending Requests</h3>
            <p>You don't have any pending ownership transfer requests at the moment.</p>
          </div>
        ) : (
          <div className="alerts-list">
            {alerts.map((alert, idx) => (
              <div key={idx} className="alert-card">
                <div className="alert-header">
                  <div className="alert-icon">📤</div>
                  <div className="alert-title">
                    <h3>Ownership Transfer Request</h3>
                    <span className="alert-time">{formatDate(alert.timestamp)}</span>
                  </div>
                </div>

                <div className="alert-body">
                  <div className="alert-message">
                    <strong>{formatAddress(alert.requester)}</strong> wants to purchase 
                    your digital property <strong>"{alert.contentTitle}"</strong> for <strong>{formatPrice(alert.price)}</strong>
                  </div>

                  <div className="alert-details">
                    <div className="detail-row">
                      <span className="detail-label">Content Title:</span>
                      <span className="detail-value">{alert.contentTitle}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Content Type:</span>
                      <span className="detail-value">{alert.contentType}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Content ID (CID):</span>
                      <code className="detail-value">{alert.cid}</code>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Requester Address:</span>
                      <code className="detail-value">{alert.requester}</code>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Offered Price:</span>
                      <span className="detail-value price">{formatPrice(alert.price)}</span>
                    </div>
                    {alert.txHash && (
                      <div className="detail-row">
                        <span className="detail-label">Transaction Hash:</span>
                        <code 
                          className="detail-value clickable"
                          onClick={() => navigator.clipboard.writeText(alert.txHash)}
                          title="Click to copy"
                        >
                          {formatTxHash(alert.txHash)}
                        </code>
                      </div>
                    )}
                  </div>

                  <div className="alert-actions">
                    <button 
                      className="action-btn approve"
                      onClick={() => handleApprove(alert.cid)}
                    >
                      ✅ Approve Transfer
                    </button>
                    <button 
                      className="action-btn reject"
                      onClick={() => handleReject(alert.cid)}
                    >
                      ❌ Reject Request
                    </button>
                    <a 
                      href={`${IPFS_CONFIG.gatewayUrl}/${alert.cid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="action-btn secondary"
                    >
                      🔗 View on IPFS
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .alerts-page {
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
          grid-template-columns: repeat(3, 1fr);
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

        .stat-item.alert {
          background: rgba(251, 191, 36, 0.1);
          border-color: rgba(251, 191, 36, 0.3);
        }

        .stat-value {
          display: block;
          font-size: 32px;
          font-weight: 700;
          color: var(--accent-color);
          margin-bottom: 4px;
        }

        .stat-item.alert .stat-value {
          color: #f59e0b;
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

        .empty-state.success {
          background: var(--success-bg);
          border-color: var(--success-text);
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

        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .alert-card {
          background: var(--bg-secondary);
          border: 2px solid rgba(251, 191, 36, 0.3);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .alert-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(251, 191, 36, 0.2);
        }

        .alert-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          background: rgba(251, 191, 36, 0.1);
          border-bottom: 1px solid rgba(251, 191, 36, 0.2);
        }

        .alert-icon {
          font-size: 32px;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(251, 191, 36, 0.2);
          border-radius: 12px;
        }

        .alert-title {
          flex: 1;
        }

        .alert-title h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          color: var(--text-primary);
        }

        .alert-time {
          color: var(--text-muted);
          font-size: 12px;
        }

        .alert-body {
          padding: 24px;
        }

        .alert-message {
          padding: 16px;
          background: rgba(251, 191, 36, 0.05);
          border-left: 4px solid #f59e0b;
          border-radius: 8px;
          margin-bottom: 20px;
          color: var(--text-primary);
          font-size: 15px;
          line-height: 1.6;
        }

        .alert-message strong {
          color: #f59e0b;
        }

        .alert-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .detail-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: var(--bg-tertiary);
          border-radius: 8px;
        }

        .detail-label {
          font-size: 12px;
          color: var(--text-muted);
          min-width: 140px;
          font-weight: 600;
        }

        .detail-value {
          flex: 1;
          font-size: 13px;
          color: var(--text-primary);
          word-break: break-all;
        }

        .detail-value.price {
          font-size: 18px;
          font-weight: 700;
          color: #f59e0b;
        }

        .detail-value.clickable {
          cursor: pointer;
          padding: 4px 8px;
          background: var(--cid-bg);
          border-radius: 4px;
          border: 1px solid var(--border-color);
          transition: all 0.2s;
        }

        .detail-value.clickable:hover {
          background: var(--accent-color);
          color: white;
        }

        code.detail-value {
          font-family: monospace;
          background: var(--cid-bg);
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
        }

        .alert-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .action-btn {
          flex: 1;
          min-width: 150px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          text-decoration: none;
          border: none;
        }

        .action-btn.approve {
          background: var(--success-bg);
          color: var(--success-text);
          border: 1px solid var(--success-text);
        }

        .action-btn.approve:hover {
          background: var(--success-text);
          color: white;
        }

        .action-btn.reject {
          background: var(--error-bg);
          color: var(--error-text);
          border: 1px solid var(--error-text);
        }

        .action-btn.reject:hover {
          background: var(--error-text);
          color: white;
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
            grid-template-columns: 1fr;
          }

          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .refresh-btn {
            width: 100%;
          }

          .alert-actions {
            flex-direction: column;
          }

          .action-btn {
            min-width: auto;
          }

          .detail-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .detail-label {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
}

export default Alerts;
