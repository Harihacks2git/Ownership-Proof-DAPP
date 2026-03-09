import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import contractABI from '../../abi/ContentRegistry.json';
import { CONTRACT_CONFIG, PAYMENT_CONFIG } from '../../config';

const contractAddress = CONTRACT_CONFIG.address;

/**
 * CountdownTimer Component
 * Displays a live HH:MM:SS countdown until expiryTimestamp (unix seconds).
 * Shows "Expired" when the timer reaches zero.
 */
function CountdownTimer({ expiryTimestamp }) {
  const [remaining, setRemaining] = useState(() => {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, expiryTimestamp - now);
  });

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const left = Math.max(0, expiryTimestamp - now);
      setRemaining(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiryTimestamp, remaining]);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const pad = (n) => String(n).padStart(2, '0');

  if (remaining <= 0) return <span className="countdown expired">Expired</span>;
  return <span className="countdown active">{pad(hours)}:{pad(minutes)}:{pad(seconds)}</span>;
}

/**
 * PaymentPage Component
 *
 * Displays approved ownership transfer requests where the current user
 * is the buyer (requester). Shows pending payments with countdown timers
 * and "Pay Now" buttons for completing payment via Stripe.
 */
function PaymentPage({ account, isContractConnected, refreshTrigger }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'cancelled', 'completed', 'chain_failed'
  const [paymentMessage, setPaymentMessage] = useState('');

  const loadApprovals = useCallback(async () => {
    if (!account || !isContractConnected) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);

      // Since TransferApproved has indexed string contentId (hashed), we can't extract
      // the original CID from events. Instead, discover all content CIDs from
      // ContentRegistered events, then check each for an active approval matching this user.
      const registeredFilter = contract.filters.ContentRegistered();
      const registeredEvents = await contract.queryFilter(registeredFilter, 0, 'latest');

      // Collect all unique CIDs by querying each owner's contents
      const allCids = new Set();
      const seenOwners = new Set();
      for (const event of registeredEvents) {
        const ownerAddr = event.args.owner;
        if (seenOwners.has(ownerAddr)) continue;
        seenOwners.add(ownerAddr);
        try {
          const ownerCids = await contract.getUserContents(ownerAddr);
          for (const cid of ownerCids) allCids.add(cid);
        } catch (err) {
          console.error('Error getting contents for owner:', err.message);
        }
      }

      console.log('Checking', allCids.size, 'content items for approvals matching account:', account);

      const cooldownDuration = await contract.cooldownDuration();
      const latestBlock = await provider.getBlock('latest');
      const currentTimestamp = latestBlock.timestamp;

      const approvalsList = [];

      for (const contentId of allCids) {
        try {
          const approval = await contract.getApproval(contentId);
          if (!approval.isActive) continue;
          if (approval.requester.toLowerCase() !== account.toLowerCase()) continue;

          const expiryTimestamp = Number(approval.timestamp) + Number(cooldownDuration);
          const isExpired = currentTimestamp > expiryTimestamp;

          let contentTitle = 'Untitled';
          let contentType = 'Document';
          try {
            const content = await contract.getContent(contentId);
            contentTitle = content.title || 'Untitled';
            contentType = content.contentType || 'Document';
          } catch (err) {
            console.log('Could not load content details for', contentId);
          }

          approvalsList.push({
            contentId,
            contentTitle,
            contentType,
            price: approval.price,
            approvalTimestamp: Number(approval.timestamp),
            expiryTimestamp,
            isExpired
          });
        } catch (err) {
          console.error('Error checking approval for', contentId, ':', err.message);
        }
      }

      // Sort by approval timestamp (newest first)
      approvalsList.sort((a, b) => b.approvalTimestamp - a.approvalTimestamp);
      setApprovals(approvalsList);
    } catch (err) {
      console.error('Error loading approvals:', err);
      setError('Failed to load approvals: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [account, isContractConnected]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals, refreshTrigger]);

  // Handle Stripe redirect return (success/cancel)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');
    const contentId = params.get('content_id');

    if (payment === 'success' && contentId) {
      setPaymentStatus('success');
      setPaymentMessage('Payment successful. Ownership transfer is being processed on-chain.');

      // Poll payment status every 3 seconds
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`${PAYMENT_CONFIG.apiUrl}/payment-status/${contentId}/${account}`);
          const data = await response.json();

          if (data.status === 'completed') {
            clearInterval(pollInterval);
            setPaymentStatus('completed');
            setPaymentMessage('Transfer complete! Ownership has been transferred.');
            loadApprovals(); // Refresh the list
          } else if (data.status === 'chain_failed') {
            clearInterval(pollInterval);
            setPaymentStatus('chain_failed');
            setPaymentMessage('Payment was received but the on-chain transfer failed. Please contact support for manual resolution.');
          }
        } catch (err) {
          console.error('Error polling payment status:', err);
        }
      }, 3000);

      // Clean up URL params
      window.history.replaceState({}, '', window.location.pathname);

      return () => clearInterval(pollInterval);
    } else if (payment === 'cancelled') {
      setPaymentStatus('cancelled');
      setPaymentMessage('Payment was not completed. You can retry.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [account]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatPrice = (price) => {
    if (!price) return '₹0';
    return `₹${price.toString()}`;
  };

  const handlePayNow = async (contentId) => {
    try {
      setError('');
      const response = await fetch(`${PAYMENT_CONFIG.apiUrl}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, requesterAddress: account })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create checkout session');
        return;
      }

      // Redirect to Stripe checkout
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError('Failed to connect to payment server: ' + err.message);
    }
  };

  const handleCancelApproval = async (contentId) => {
    try {
      setError('');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);

      const tx = await contract.cancelApproval(contentId);
      await tx.wait();
      loadApprovals();
    } catch (err) {
      console.error('Error cancelling approval:', err);
      setError('Failed to cancel: ' + (err.reason || err.shortMessage || err.message));
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="payment-page">
      <div className="page-header">
        <div className="header-text">
          <h1>💳 Payments</h1>
          <p>Complete pending payments for approved ownership transfers</p>
        </div>
        <button onClick={loadApprovals} className="refresh-btn" disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      {/* Payment Status Banner */}
      {paymentStatus && (
        <div className={`payment-status-banner ${paymentStatus}`}>
          {paymentStatus === 'success' && '⏳ '}
          {paymentStatus === 'completed' && '✅ '}
          {paymentStatus === 'chain_failed' && '❌ '}
          {paymentStatus === 'cancelled' && '⚠️ '}
          {paymentMessage}
          {paymentStatus === 'cancelled' && (
            <button className="retry-btn" onClick={() => { setPaymentStatus(null); setPaymentMessage(''); }}>
              🔄 Dismiss
            </button>
          )}
        </div>
      )}

      {/* Content Display */}
      <div className="payments-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner">⏳</div>
            <p>Loading pending payments...</p>
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
            <p>Please connect your wallet to view pending payments.</p>
          </div>
        ) : approvals.length === 0 ? (
          <div className="empty-state success">
            <div className="empty-icon">✅</div>
            <h3>No Pending Payments</h3>
            <p>You don't have any approved transfers awaiting payment at the moment.</p>
          </div>
        ) : (
          <div className="approvals-list">
            {approvals.map((approval, idx) => (
              <div key={idx} className={`approval-card ${approval.isExpired ? 'expired' : 'active'}`}>
                <div className="approval-header">
                  <div className="approval-icon">{approval.isExpired ? '⏰' : '💳'}</div>
                  <div className="approval-title">
                    <h3>{approval.contentTitle}</h3>
                    <div className="approval-badges">
                      {approval.isExpired ? (
                        <span className="status-badge expired">Expired</span>
                      ) : (
                        <span className="status-badge active">Payment Required</span>
                      )}
                      <span className="type-badge">{approval.contentType}</span>
                    </div>
                  </div>
                </div>

                <div className="approval-body">
                  <div className="approval-details">
                    <div className="detail-row">
                      <span className="detail-label">Content ID:</span>
                      <code className="detail-value">{approval.contentId}</code>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Price:</span>
                      <span className="detail-value price">{formatPrice(approval.price)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Approved On:</span>
                      <span className="detail-value">{formatDate(approval.approvalTimestamp)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Time Remaining:</span>
                      <span className="detail-value">
                        <CountdownTimer expiryTimestamp={approval.expiryTimestamp} />
                      </span>
                    </div>
                  </div>

                  <div className="approval-actions">
                    {approval.isExpired ? (
                      <button className="action-btn disabled" disabled>
                        ⏰ Approval Expired
                      </button>
                    ) : (
                      <>
                        <button className="action-btn pay" onClick={() => handlePayNow(approval.contentId)}>
                          💳 Pay Now — {formatPrice(approval.price)}
                        </button>
                        <button className="action-btn cancel" onClick={() => handleCancelApproval(approval.contentId)}>
                          ❌ Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .payment-page {
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

        .error-banner {
          background: var(--error-bg);
          border: 1px solid var(--error-text);
          color: var(--error-text);
          padding: 14px 20px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .payment-status-banner {
          padding: 14px 20px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .payment-status-banner.success {
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.4);
          color: #f59e0b;
        }

        .payment-status-banner.completed {
          background: var(--success-bg);
          border: 1px solid var(--success-text);
          color: var(--success-text);
        }

        .payment-status-banner.chain_failed {
          background: var(--error-bg);
          border: 1px solid var(--error-text);
          color: var(--error-text);
        }

        .payment-status-banner.cancelled {
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.4);
          color: #f59e0b;
        }

        .retry-btn {
          margin-left: auto;
          padding: 6px 14px;
          border-radius: 6px;
          border: 1px solid rgba(251, 191, 36, 0.4);
          background: rgba(251, 191, 36, 0.15);
          color: #f59e0b;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .retry-btn:hover {
          background: rgba(251, 191, 36, 0.25);
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

        .approvals-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .approval-card {
          background: var(--bg-secondary);
          border: 2px solid rgba(99, 102, 241, 0.3);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .approval-card.active {
          border-color: rgba(99, 102, 241, 0.4);
        }

        .approval-card.expired {
          border-color: rgba(239, 68, 68, 0.3);
          opacity: 0.8;
        }

        .approval-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }

        .approval-card.active:hover {
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.2);
        }

        .approval-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          background: rgba(99, 102, 241, 0.1);
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
        }

        .approval-card.expired .approval-header {
          background: rgba(239, 68, 68, 0.1);
          border-bottom-color: rgba(239, 68, 68, 0.2);
        }

        .approval-icon {
          font-size: 32px;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(99, 102, 241, 0.2);
          border-radius: 12px;
        }

        .approval-card.expired .approval-icon {
          background: rgba(239, 68, 68, 0.2);
        }

        .approval-title {
          flex: 1;
        }

        .approval-title h3 {
          margin: 0 0 6px 0;
          font-size: 18px;
          color: var(--text-primary);
        }

        .approval-badges {
          display: flex;
          gap: 8px;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-badge.active {
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.4);
        }

        .status-badge.expired {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .type-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }

        .approval-body {
          padding: 24px;
        }

        .approval-details {
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
          color: #818cf8;
        }

        code.detail-value {
          font-family: monospace;
          background: var(--cid-bg);
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
        }

        .countdown {
          font-family: monospace;
          font-size: 16px;
          font-weight: 700;
        }

        .countdown.active {
          color: #f59e0b;
        }

        .countdown.expired {
          color: #ef4444;
        }

        .approval-actions {
          display: flex;
          gap: 12px;
        }

        .action-btn {
          flex: 1;
          padding: 14px 20px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          border: none;
        }

        .action-btn.pay {
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white;
        }

        .action-btn.pay:hover {
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }

        .action-btn.disabled {
          background: var(--bg-tertiary);
          color: var(--text-muted);
          cursor: not-allowed;
        }

        .action-btn.cancel {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .action-btn.cancel:hover {
          background: rgba(239, 68, 68, 0.25);
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .refresh-btn {
            width: 100%;
          }

          .approval-actions {
            flex-direction: column;
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

export default PaymentPage;