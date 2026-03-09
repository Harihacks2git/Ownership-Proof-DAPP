import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import contractABI from '../../abi/ContentRegistry.json';
import { CONTRACT_CONFIG, PAYMENT_CONFIG } from '../../config';

const contractAddress = CONTRACT_CONFIG.address;

/**
 * TransactionHistory Page Component
 * 
 * Displays a timeline/table of ALL blockchain events network-wide:
 * - Content registrations
 * - Ownership transfers
 * - Ownership requests
 * Shows: Action type, Transaction Hash, Timestamp, Actor
 */
function TransactionHistory({ account, isContractConnected, refreshTrigger }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'registered', 'transferred', 'requested', 'approved'

  const loadHistory = useCallback(async () => {
    if (!isContractConnected) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);

      const allEvents = [];

      // Query ALL ContentRegistered events (network-wide)
      try {
        const registeredFilter = contract.filters.ContentRegistered();
        const registeredEvents = await contract.queryFilter(registeredFilter, 0, 'latest');
        
        for (const event of registeredEvents) {
          const block = await provider.getBlock(event.blockNumber);
          allEvents.push({
            type: 'Registered',
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: block ? block.timestamp : 0,
            actor: event.args.owner,
            details: `Content registered by ${event.args.owner?.substring(0, 10)}...`
          });
        }
      } catch (err) {
        console.log('Could not load registration events:', err.message);
      }

      // Query ALL ContentTransferred events (network-wide)
      try {
        const transferFilter = contract.filters.ContentTransferred();
        const transferEvents = await contract.queryFilter(transferFilter, 0, 'latest');
        
        for (const event of transferEvents) {
          const block = await provider.getBlock(event.blockNumber);
          allEvents.push({
            type: 'Transferred',
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: block ? block.timestamp : 0,
            actor: event.args.from,
            from: event.args.from,
            to: event.args.to,
            details: `Transferred from ${event.args.from?.substring(0, 10)}... to ${event.args.to?.substring(0, 10)}...`
          });
        }
      } catch (err) {
        console.log('Could not load transfer events:', err.message);
      }

      // Build lookup sets from OwnershipApproved and OwnershipRejected events
      // so we can reliably determine request status
      const approvedSet = new Set(); // "contentIdHash:requesterLower"
      const rejectedSet = new Set();

      // Query ALL OwnershipApproved events to build lookup for request status
      try {
        const approvedFilter = contract.filters.OwnershipApproved();
        const approvedEvents = await contract.queryFilter(approvedFilter, 0, 'latest');

        for (const event of approvedEvents) {
          const buyerAddr = event.args.buyer;
          const key = `${event.topics[1]}:${buyerAddr.toLowerCase()}`;
          approvedSet.add(key);
        }
      } catch (err) {
        console.log('Could not load approval events:', err.message);
      }

      // Query ALL OwnershipRejected events (network-wide)
      try {
        const rejectedFilter = contract.filters.OwnershipRejected();
        const rejectedEvents = await contract.queryFilter(rejectedFilter, 0, 'latest');

        for (const event of rejectedEvents) {
          const block = await provider.getBlock(event.blockNumber);
          const ownerAddr = event.args.owner;
          const requesterAddr = event.args.requester;

          const key = `${event.topics[1]}:${requesterAddr.toLowerCase()}`;
          rejectedSet.add(key);

          allEvents.push({
            type: 'Rejected',
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: block ? block.timestamp : 0,
            actor: ownerAddr,
            from: ownerAddr,
            to: requesterAddr,
            details: `Transfer rejected by ${ownerAddr?.substring(0, 10)}... for requester ${requesterAddr?.substring(0, 10)}...`
          });
        }
      } catch (err) {
        console.log('Could not load rejection events:', err.message);
      }

      // Query ALL OwnershipRequested events (network-wide)
      try {
        const requestFilter = contract.filters.OwnershipRequested();
        const requestEvents = await contract.queryFilter(requestFilter, 0, 'latest');
        
        for (const event of requestEvents) {
          const block = await provider.getBlock(event.blockNumber);
          const requesterAddr = event.args.requester;

          // Use the indexed contentId topic hash + requester to look up status
          const key = `${event.topics[1]}:${requesterAddr.toLowerCase()}`;
          let status = 'Pending';
          if (approvedSet.has(key)) {
            status = 'Transferred';
          } else if (rejectedSet.has(key)) {
            status = 'Rejected';
          }
          
          allEvents.push({
            type: 'Requested',
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: block ? block.timestamp : 0,
            actor: requesterAddr,
            contentId: event.args.contentId,
            status: status,
            details: `Ownership requested by ${requesterAddr?.substring(0, 10)}... - ${status}`
          });
        }
      } catch (err) {
        console.log('Could not load request events:', err.message);
      }

      // Query ALL DuplicateRegistrationAttempt events (network-wide)
      try {
        const duplicateFilter = contract.filters.DuplicateRegistrationAttempt();
        const duplicateEvents = await contract.queryFilter(duplicateFilter, 0, 'latest');
        
        for (const event of duplicateEvents) {
          const block = await provider.getBlock(event.blockNumber);
          allEvents.push({
            type: 'Duplicate Attempt',
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: block ? block.timestamp : 0,
            actor: event.args.attempter,
            owner: event.args.currentOwner,
            contentId: event.args.contentId,
            details: `${event.args.attempter?.substring(0, 10)}... tried to register content owned by ${event.args.currentOwner?.substring(0, 10)}...`
          });
        }
      } catch (err) {
        console.log('Could not load duplicate attempt events:', err.message);
      }

      // Query ALL TransferApproved events (network-wide)
      try {
        const transferApprovedFilter = contract.filters.TransferApproved();
        const transferApprovedEvents = await contract.queryFilter(transferApprovedFilter, 0, 'latest');
        
        for (const event of transferApprovedEvents) {
          const block = await provider.getBlock(event.blockNumber);
          allEvents.push({
            type: 'Approved',
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: block ? block.timestamp : 0,
            actor: event.args.owner,
            from: event.args.owner,
            to: event.args.requester,
            price: event.args.price,
            details: `Transfer approved by ${event.args.owner?.substring(0, 10)}... for ${event.args.requester?.substring(0, 10)}... — awaiting payment`
          });
        }
      } catch (err) {
        console.log('Could not load transfer approved events:', err.message);
      }

      // Query ALL RequestWithdrawn events (network-wide)
      try {
        const withdrawnFilter = contract.filters.RequestWithdrawn();
        const withdrawnEvents = await contract.queryFilter(withdrawnFilter, 0, 'latest');
        
        for (const event of withdrawnEvents) {
          const block = await provider.getBlock(event.blockNumber);
          allEvents.push({
            type: 'Withdrawn',
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: block ? block.timestamp : 0,
            actor: event.args.requester,
            details: `Request withdrawn by ${event.args.requester?.substring(0, 10)}...`
          });
        }
      } catch (err) {
        console.log('Could not load withdrawn events:', err.message);
      }

      // For ContentTransferred events, query Payment Server for payment status
      for (const evt of allEvents) {
        if (evt.type === 'Transferred' && evt.to) {
          try {
            const response = await fetch(`${PAYMENT_CONFIG.apiUrl}/payment-status/${encodeURIComponent('unknown')}/${evt.to}`);
            if (response.ok) {
              const data = await response.json();
              evt.paymentStatus = data.status || 'unavailable';
            } else {
              evt.paymentStatus = 'unavailable';
            }
          } catch {
            evt.paymentStatus = 'unavailable';
          }
        }
      }

      // Sort by timestamp (newest first)
      allEvents.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(allEvents);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load transaction history.');
    } finally {
      setLoading(false);
    }
  }, [isContractConnected]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshTrigger]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const formatTxHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.type.toLowerCase() === filter;
  });

  const getTypeColor = (type) => {
    switch(type) {
      case 'Registered': return 'registered';
      case 'Transferred': return 'transferred';
      case 'Requested': return 'requested';
      case 'Rejected': return 'rejected';
      case 'Approved': return 'approved';
      case 'Withdrawn': return 'withdrawn';
      case 'Duplicate Attempt': return 'duplicate';
      default: return '';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'Registered': return '📝';
      case 'Transferred': return '🔄';
      case 'Requested': return '📤';
      case 'Rejected': return '❌';
      case 'Approved': return '✅';
      case 'Withdrawn': return '↩️';
      case 'Duplicate Attempt': return '🚨';
      default: return '📋';
    }
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    
    const statusColors = {
      'Pending': { bg: 'rgba(251, 191, 36, 0.2)', color: '#f59e0b' },
      'Transferred': { bg: 'var(--success-bg)', color: 'var(--success-text)' },
      'Rejected': { bg: 'var(--error-bg)', color: 'var(--error-text)' }
    };
    
    const style = statusColors[status] || {};
    return (
      <span 
        className="status-badge"
        style={{ 
          background: style.bg, 
          color: style.color,
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600',
          marginLeft: '8px'
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="history-page">
      <div className="page-header">
        <div className="header-text">
          <h1>📜 Network Transaction History</h1>
          <p>Complete audit trail of all ownership activities on the network</p>
        </div>
        <button onClick={loadHistory} className="refresh-btn" disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({transactions.length})
        </button>
        <button 
          className={`filter-tab ${filter === 'registered' ? 'active' : ''}`}
          onClick={() => setFilter('registered')}
        >
          📝 Registered ({transactions.filter(t => t.type === 'Registered').length})
        </button>
        <button 
          className={`filter-tab ${filter === 'transferred' ? 'active' : ''}`}
          onClick={() => setFilter('transferred')}
        >
          🔄 Transferred ({transactions.filter(t => t.type === 'Transferred').length})
        </button>
        <button 
          className={`filter-tab ${filter === 'requested' ? 'active' : ''}`}
          onClick={() => setFilter('requested')}
        >
          📤 Requested ({transactions.filter(t => t.type === 'Requested').length})
        </button>
        <button 
          className={`filter-tab ${filter === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilter('rejected')}
        >
          ❌ Rejected ({transactions.filter(t => t.type === 'Rejected').length})
        </button>
        <button 
          className={`filter-tab ${filter === 'duplicate attempt' ? 'active' : ''}`}
          onClick={() => setFilter('duplicate attempt')}
        >
          🚨 Duplicate Attempts ({transactions.filter(t => t.type === 'Duplicate Attempt').length})
        </button>
        <button 
          className={`filter-tab ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          ✅ Approved ({transactions.filter(t => t.type === 'Approved').length})
        </button>
        <button 
          className={`filter-tab ${filter === 'withdrawn' ? 'active' : ''}`}
          onClick={() => setFilter('withdrawn')}
        >
          ↩️ Withdrawn ({transactions.filter(t => t.type === 'Withdrawn').length})
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      {/* Content Display */}
      <div className="history-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner">⏳</div>
            <p>Loading transaction history...</p>
          </div>
        ) : !isContractConnected ? (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h3>Contract Not Connected</h3>
            <p>Please ensure the Hardhat node is running and the contract is deployed.</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Transactions Yet</h3>
            <p>Your transaction history will appear here after you register or transfer content.</p>
          </div>
        ) : (
          <>
            {/* Timeline View */}
            <div className="timeline">
              {filteredTransactions.map((tx, idx) => (
                <div key={idx} className={`timeline-item ${getTypeColor(tx.type)}`}>
                  <div className="timeline-marker">
                    <span className="marker-icon">{getTypeIcon(tx.type)}</span>
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className={`type-badge ${getTypeColor(tx.type)}`}>
                        {tx.type}
                        {tx.status && getStatusBadge(tx.status)}
                      </span>
                      <span className="timeline-time">{formatDate(tx.timestamp)}</span>
                    </div>
                    <p className="timeline-details">{tx.details}</p>
                    {tx.paymentStatus && (
                      <span className="payment-badge" style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        marginBottom: '8px',
                        background: tx.paymentStatus === 'completed' ? 'var(--success-bg)' : 'var(--bg-tertiary)',
                        color: tx.paymentStatus === 'completed' ? 'var(--success-text)' : 'var(--text-muted)',
                        border: `1px solid ${tx.paymentStatus === 'completed' ? 'var(--success-text)' : 'var(--border-color)'}`
                      }}>
                        {tx.paymentStatus === 'completed' ? '💳 Paid via Stripe' : '💳 Payment details unavailable'}
                      </span>
                    )}
                    <div className="timeline-meta">
                      <div className="meta-item">
                        <span className="meta-label">Tx Hash:</span>
                        <code 
                          className="meta-value clickable"
                          onClick={() => navigator.clipboard.writeText(tx.txHash)}
                          title="Click to copy"
                        >
                          {formatTxHash(tx.txHash)}
                        </code>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Block:</span>
                        <span className="meta-value">#{tx.blockNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Table View */}
            <div className="table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Details</th>
                    {filter === 'requested' && <th>Status</th>}
                    <th>Tx Hash</th>
                    <th>Block</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className={`type-badge ${getTypeColor(tx.type)}`}>
                          {getTypeIcon(tx.type)} {tx.type}
                        </span>
                      </td>
                      <td className="details-cell">
                        {tx.details}
                        {tx.paymentStatus && (
                          <span className="payment-badge" style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: '600',
                            marginLeft: '8px',
                            background: tx.paymentStatus === 'completed' ? 'var(--success-bg)' : 'var(--bg-tertiary)',
                            color: tx.paymentStatus === 'completed' ? 'var(--success-text)' : 'var(--text-muted)',
                            border: `1px solid ${tx.paymentStatus === 'completed' ? 'var(--success-text)' : 'var(--border-color)'}`
                          }}>
                            {tx.paymentStatus === 'completed' ? '💳 Paid via Stripe' : '💳 Payment details unavailable'}
                          </span>
                        )}
                      </td>
                      {filter === 'requested' && (
                        <td>
                          {tx.status ? getStatusBadge(tx.status) : '-'}
                        </td>
                      )}
                      <td>
                        <code 
                          className="tx-hash clickable"
                          onClick={() => navigator.clipboard.writeText(tx.txHash)}
                          title="Click to copy"
                        >
                          {formatTxHash(tx.txHash)}
                        </code>
                      </td>
                      <td>#{tx.blockNumber}</td>
                      <td className="time-cell">{formatDate(tx.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <style>{`
        .history-page {
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

        .filter-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .filter-tab {
          padding: 10px 20px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .filter-tab:hover {
          background: var(--bg-tertiary);
        }

        .filter-tab.active {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
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

        /* Timeline View */
        .timeline {
          margin-bottom: 40px;
        }

        .timeline-item {
          display: flex;
          gap: 20px;
          position: relative;
          padding-bottom: 24px;
        }

        .timeline-item:not(:last-child)::before {
          content: '';
          position: absolute;
          left: 20px;
          top: 45px;
          bottom: 0;
          width: 2px;
          background: var(--border-color);
        }

        .timeline-marker {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--bg-secondary);
          border: 2px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          z-index: 1;
        }

        .timeline-item.registered .timeline-marker {
          border-color: var(--success-text);
          background: var(--success-bg);
        }

        .timeline-item.transferred .timeline-marker {
          border-color: #60a5fa;
          background: rgba(59, 130, 246, 0.2);
        }

        .timeline-item.requested .timeline-marker {
          border-color: #f59e0b;
          background: rgba(251, 191, 36, 0.2);
        }

        .timeline-item.rejected .timeline-marker {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.2);
        }

        .timeline-item.duplicate .timeline-marker {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.2);
        }

        .timeline-item.approved .timeline-marker {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.2);
        }

        .marker-icon {
          font-size: 18px;
        }

        .timeline-content {
          flex: 1;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 16px 20px;
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .type-badge {
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .type-badge.registered {
          background: var(--success-bg);
          color: var(--success-text);
        }

        .type-badge.transferred {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }

        .type-badge.requested {
          background: rgba(251, 191, 36, 0.2);
          color: #f59e0b;
        }

        .type-badge.rejected {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .type-badge.duplicate {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .type-badge.approved {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .type-badge.withdrawn {
          background: rgba(168, 85, 247, 0.2);
          color: #a855f7;
        }

        .timeline-item.withdrawn .timeline-marker {
          border-color: #a855f7;
          background: rgba(168, 85, 247, 0.2);
        }

        .timeline-time {
          color: var(--text-muted);
          font-size: 12px;
        }

        .timeline-details {
          margin: 0 0 12px 0;
          color: var(--text-primary);
          font-size: 14px;
        }

        .timeline-meta {
          display: flex;
          gap: 20px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .meta-label {
          color: var(--text-muted);
          font-size: 12px;
        }

        .meta-value {
          color: var(--text-secondary);
          font-size: 12px;
        }

        .meta-value.clickable {
          cursor: pointer;
          padding: 4px 8px;
          background: var(--cid-bg);
          border-radius: 4px;
          border: 1px solid var(--border-color);
          transition: all 0.2s;
        }

        .meta-value.clickable:hover {
          background: var(--accent-color);
          color: white;
        }

        /* Table View */
        .table-container {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          overflow-x: auto;
          width: 100%;
        }

        .history-table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
        }

        .history-table th {
          text-align: left;
          padding: 16px;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .history-table td {
          padding: 16px;
          border-top: 1px solid var(--border-color);
          color: var(--text-primary);
          font-size: 14px;
        }

        .history-table tr:hover {
          background: var(--bg-tertiary);
        }

        .details-cell {
          min-width: 300px;
          max-width: 500px;
          word-wrap: break-word;
          white-space: normal;
        }

        .tx-hash {
          font-size: 11px;
          padding: 4px 8px;
          background: var(--cid-bg);
          border-radius: 4px;
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tx-hash:hover {
          background: var(--accent-color);
          color: white;
        }

        .time-cell {
          white-space: nowrap;
          min-width: 180px;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .refresh-btn {
            width: 100%;
          }

          .filter-tabs {
            overflow-x: auto;
            padding-bottom: 8px;
          }

          .timeline-meta {
            flex-direction: column;
            gap: 8px;
          }

          .table-container {
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
}

export default TransactionHistory;
