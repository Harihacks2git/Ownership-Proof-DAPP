import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import './App.css';

/**
 * App Component
 * 
 * Main entry point that handles:
 * - Wallet connection state
 * - Renders Dashboard after connection
 */
function App() {
  const [account, setAccount] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountChange);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountChange);
      }
    };
  }, []);

  const handleAccountChange = (accounts) => {
    if (accounts.length > 0) {
      setAccount(accounts[0]);
    } else {
      setAccount('');
    }
  };

  const checkConnection = async () => {
    if (!window.ethereum) return;
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to use this DApp');
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      setAccount(accounts[0]);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
  };

  // ============ RENDER ============

  // Connected: Show Dashboard
  if (account) {
    return <Dashboard account={account} onDisconnect={disconnectWallet} />;
  }

  // Not Connected: Show Login
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>📜 Digital Ownership DApp</h1>
          <p>Register and verify ownership of your digital content on the blockchain</p>
        </div>

        <div className="features">
          <div className="feature">
            <span className="feature-icon">📤</span>
            <span>Upload to IPFS</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <span>Register Ownership</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📜</span>
            <span>Track History</span>
          </div>
        </div>

        <button 
          onClick={connectWallet} 
          className="connect-btn"
          disabled={isConnecting}
        >
          {isConnecting ? (
            'Connecting...'
          ) : (
            <>
              <span>🦊</span>
              <span>Connect MetaMask</span>
            </>
          )}
        </button>

        <p className="network-hint">
          Make sure you're connected to Hardhat Local Network (Chain ID: 31337)
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .login-container {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 48px;
          max-width: 480px;
          width: 100%;
          text-align: center;
        }

        .login-header h1 {
          color: white;
          font-size: 32px;
          margin: 0 0 12px 0;
        }

        .login-header p {
          color: rgba(255, 255, 255, 0.7);
          font-size: 16px;
          margin: 0;
          line-height: 1.5;
        }

        .features {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin: 40px 0;
        }

        .feature {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
        }

        .feature-icon {
          font-size: 28px;
        }

        .connect-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 16px 40px;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 0 auto;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .connect-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }

        .connect-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .network-hint {
          margin-top: 24px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

export default App;
