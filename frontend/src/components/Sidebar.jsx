// Sidebar Navigation Component

/**
 * Sidebar Navigation Component
 * 
 * Provides navigation between different sections of the dashboard:
 * - Register Content
 * - My Contents
 * - Transaction History
 */
function Sidebar({ 
  activePage, 
  onPageChange, 
  account, 
  onDisconnect,
  isIpfsConnected,
  isContractConnected 
}) {
  
  const formatAddress = (addr) => {
    if (!addr) return 'Not connected';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const navItems = [
    { id: 'all', label: 'All Contents', icon: '🌐', description: 'Browse all registered content' },
    { id: 'register', label: 'Register Content', icon: '📤', description: 'Upload & register new content' },
    { id: 'contents', label: 'My Contents', icon: '📁', description: 'View your owned contents' },
    { id: 'alerts', label: 'Alerts', icon: '🔔', description: 'Pending transfer requests' },
    { id: 'history', label: 'Transaction History', icon: '📜', description: 'View activity log' },
  ];

  return (
    <aside className="sidebar">
      {/* Logo / Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">🔐</div>
        <div className="brand-text">
          <h1>Ownership Proof</h1>
          <span>DApp</span>
        </div>
      </div>

      {/* Connection Status */}
      <div className="connection-status">
        <div className="status-row">
          <span className={`status-indicator ${isIpfsConnected ? 'connected' : 'disconnected'}`}></span>
          <span className="status-label">IPFS</span>
          <span className="status-value">{isIpfsConnected ? 'Connected' : 'Offline'}</span>
        </div>
        <div className="status-row">
          <span className={`status-indicator ${isContractConnected ? 'connected' : 'disconnected'}`}></span>
          <span className="status-label">Contract</span>
          <span className="status-value">{isContractConnected ? 'Connected' : 'Offline'}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-label">MENU</div>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => onPageChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <div className="nav-text">
              <span className="nav-title">{item.label}</span>
              <span className="nav-desc">{item.description}</span>
            </div>
          </button>
        ))}
      </nav>

      {/* Wallet Info */}
      <div className="sidebar-footer">
        <div className="wallet-card">
          <div className="wallet-icon">👛</div>
          <div className="wallet-info">
            <span className="wallet-label">Connected Wallet</span>
            <span className="wallet-address">{formatAddress(account)}</span>
          </div>
        </div>
        <button onClick={onDisconnect} className="disconnect-btn">
          🚪 Disconnect
        </button>
      </div>

      <style>{`
        .sidebar {
          width: 280px;
          height: 100vh;
          background: var(--sidebar-bg, #1e293b);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 100;
          border-right: 1px solid var(--sidebar-border, #334155);
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px 20px;
          border-bottom: 1px solid var(--sidebar-border, #334155);
        }

        .brand-icon {
          font-size: 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-text h1 {
          margin: 0;
          font-size: 18px;
          color: var(--sidebar-text, #f1f5f9);
          font-weight: 700;
        }

        .brand-text span {
          font-size: 12px;
          color: var(--sidebar-text-muted, #94a3b8);
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .connection-status {
          padding: 16px 20px;
          background: var(--sidebar-highlight, rgba(255,255,255,0.05));
          margin: 16px;
          border-radius: 12px;
        }

        .status-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-indicator.connected {
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .status-indicator.disconnected {
          background: #ef4444;
        }

        .status-label {
          color: var(--sidebar-text-muted, #94a3b8);
          font-size: 12px;
          flex: 1;
        }

        .status-value {
          color: var(--sidebar-text, #f1f5f9);
          font-size: 12px;
          font-weight: 500;
        }

        .sidebar-nav {
          flex: 1;
          padding: 8px 12px;
          overflow-y: auto;
        }

        .nav-label {
          color: var(--sidebar-text-muted, #94a3b8);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.5px;
          padding: 12px 8px 8px;
        }

        .nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          margin-bottom: 4px;
          background: transparent;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .nav-item:hover {
          background: var(--sidebar-highlight, rgba(255,255,255,0.08));
        }

        .nav-item.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .nav-icon {
          font-size: 22px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--sidebar-highlight, rgba(255,255,255,0.1));
          border-radius: 8px;
        }

        .nav-item.active .nav-icon {
          background: rgba(255,255,255,0.2);
        }

        .nav-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .nav-title {
          color: var(--sidebar-text, #f1f5f9);
          font-size: 14px;
          font-weight: 600;
        }

        .nav-desc {
          color: var(--sidebar-text-muted, #94a3b8);
          font-size: 11px;
        }

        .nav-item.active .nav-title,
        .nav-item.active .nav-desc {
          color: white;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid var(--sidebar-border, #334155);
        }

        .wallet-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: var(--sidebar-highlight, rgba(255,255,255,0.05));
          border-radius: 10px;
          margin-bottom: 12px;
        }

        .wallet-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 10px;
        }

        .wallet-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .wallet-label {
          color: var(--sidebar-text-muted, #94a3b8);
          font-size: 11px;
        }

        .wallet-address {
          color: var(--sidebar-text, #f1f5f9);
          font-family: monospace;
          font-size: 13px;
          font-weight: 500;
        }

        .disconnect-btn {
          width: 100%;
          padding: 12px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .disconnect-btn:hover {
          background: rgba(239, 68, 68, 0.25);
        }

        /* Mobile toggle would go here in future */
        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s;
          }
          
          .sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </aside>
  );
}

export default Sidebar;
