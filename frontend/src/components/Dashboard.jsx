import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import contractABI from '../abi/ContentRegistry.json';
import { IPFS_CONFIG, CONTRACT_CONFIG } from '../config';

// Import components
import Sidebar from './Sidebar';
import RegisterContent from './pages/RegisterContent';
import MyContents from './pages/MyContents';
import TransactionHistory from './pages/TransactionHistory';
import AllContents from './pages/AllContents';
import Alerts from './pages/Alerts';

const contractAddress = CONTRACT_CONFIG.address;

/**
 * Dashboard Component
 * 
 * Main dashboard layout with:
 * - Sidebar navigation (left)
 * - Content area (right) - displays selected page
 * 
 * Pages:
 * - Register Content
 * - My Contents  
 * - Transaction History
 */
function Dashboard({ account, onDisconnect }) {
  // Current active page
  const [activePage, setActivePage] = useState('all');
  
  // Connection status
  const [isIpfsConnected, setIsIpfsConnected] = useState(false);
  const [isContractConnected, setIsContractConnected] = useState(false);
  
  // Refresh trigger for child components
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Mobile sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check connections on mount
  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    // Check IPFS
    try {
      const response = await fetch('http://127.0.0.1:5001/api/v0/id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        setIsIpfsConnected(true);
      } else {
        setIsIpfsConnected(false);
      }
    } catch (err) {
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
      await contract.authority();
      setIsContractConnected(true);
    } catch (err) {
      console.log('Contract not connected - deploy the contract first');
      setIsContractConnected(false);
    }
  };

  // Handle page change
  const handlePageChange = (page) => {
    setActivePage(page);
    setIsSidebarOpen(false); // Close mobile sidebar
  };

  // Handle successful registration - trigger refresh
  const handleRegistrationSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Render the active page
  const renderPage = () => {
    switch (activePage) {
      case 'all':
        return (
          <AllContents 
            account={account}
            isContractConnected={isContractConnected}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'register':
        return (
          <RegisterContent 
            account={account}
            isIpfsConnected={isIpfsConnected}
            isContractConnected={isContractConnected}
            onSuccess={handleRegistrationSuccess}
          />
        );
      case 'contents':
        return (
          <MyContents 
            account={account}
            isContractConnected={isContractConnected}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'history':
        return (
          <TransactionHistory 
            account={account}
            isContractConnected={isContractConnected}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'alerts':
        return (
          <Alerts 
            account={account}
            isContractConnected={isContractConnected}
            refreshTrigger={refreshTrigger}
          />
        );
      default:
        return (
          <AllContents 
            account={account}
            isContractConnected={isContractConnected}
            refreshTrigger={refreshTrigger}
          />
        );
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile Menu Toggle */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? '✕' : '☰'}
      </button>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`sidebar-wrapper ${isSidebarOpen ? 'open' : ''}`}>
        <Sidebar 
          activePage={activePage}
          onPageChange={handlePageChange}
          account={account}
          onDisconnect={onDisconnect}
          isIpfsConnected={isIpfsConnected}
          isContractConnected={isContractConnected}
        />
      </div>

      {/* Main Content Area */}
      <main className="main-content">
        {renderPage()}
      </main>

      <style>{`
        /* ============ CSS Variables ============ */
        :root {
          --bg-primary: #f3f4f6;
          --bg-secondary: #ffffff;
          --bg-tertiary: #f9fafb;
          --text-primary: #1f2937;
          --text-secondary: #6b7280;
          --text-muted: #9ca3af;
          --border-color: #e5e7eb;
          --border-light: #f3f4f6;
          --input-bg: #ffffff;
          --input-border: #e5e7eb;
          --card-bg: #f9fafb;
          --cid-bg: #f3f4f6;
          --success-bg: rgba(16, 185, 129, 0.15);
          --success-text: #059669;
          --error-bg: rgba(239, 68, 68, 0.15);
          --error-text: #dc2626;
          --accent-color: #6366f1;
          --badge-bg: #e0e7ff;
          --badge-text: #4338ca;
          --sidebar-bg: #1e293b;
          --sidebar-border: #334155;
          --sidebar-text: #f1f5f9;
          --sidebar-text-muted: #94a3b8;
          --sidebar-highlight: rgba(255,255,255,0.05);
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-tertiary: #334155;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --border-color: #475569;
            --border-light: #334155;
            --input-bg: #1e293b;
            --input-border: #475569;
            --card-bg: #334155;
            --cid-bg: #1e293b;
            --success-bg: rgba(16, 185, 129, 0.2);
            --success-text: #34d399;
            --error-bg: rgba(239, 68, 68, 0.2);
            --error-text: #f87171;
            --accent-color: #818cf8;
            --badge-bg: #3730a3;
            --badge-text: #c7d2fe;
            --sidebar-bg: #0f172a;
            --sidebar-border: #1e293b;
          }
        }

        /* ============ Layout ============ */
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
          background: var(--bg-primary);
        }

        .sidebar-wrapper {
          position: fixed;
          left: 0;
          top: 0;
          height: 100vh;
          z-index: 100;
        }

        .main-content {
          flex: 1;
          margin-left: 280px;
          min-height: 100vh;
          background: var(--bg-primary);
        }

        /* Mobile Menu Button */
        .mobile-menu-btn {
          display: none;
          position: fixed;
          top: 16px;
          left: 16px;
          z-index: 200;
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: var(--sidebar-bg);
          color: white;
          border: none;
          font-size: 20px;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }

        /* Sidebar Overlay for Mobile */
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 90;
        }

        /* ============ Responsive ============ */
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .sidebar-overlay {
            display: block;
          }

          .sidebar-wrapper {
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }

          .sidebar-wrapper.open {
            transform: translateX(0);
          }

          .main-content {
            margin-left: 0;
            padding-top: 70px;
          }
        }

        /* ============ Global Scrollbar ============ */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: var(--bg-tertiary);
        }

        ::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
