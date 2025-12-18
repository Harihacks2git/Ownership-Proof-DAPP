import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import contractABI from '../abi/ContentRegistry.json';
import { create } from 'ipfs-http-client';
import { IPFS_CONFIG, CONTRACT_CONFIG } from '../config';

const contractAddress = CONTRACT_CONFIG.address;
const IPFS_API_URL = IPFS_CONFIG.apiUrl;

// Initialize IPFS client with configurable settings
const ipfs = create({ 
  host: IPFS_CONFIG.host, 
  port: IPFS_CONFIG.port, 
  protocol: IPFS_CONFIG.protocol 
});

// Store for all registered CIDs across all wallets
const loadGlobalCids = () => {
  const stored = localStorage.getItem('global_registered_cids');
  return stored ? new Set(JSON.parse(stored)) : new Set();
};

const saveGlobalCids = (cids) => {
  localStorage.setItem('global_registered_cids', JSON.stringify([...cids]));
};

const UploadForm = ({ account, onDisconnect }) => {
  const [file, setFile] = useState(null);
  const [contentType, setContentType] = useState('Document');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isIpfsAvailable, setIsIpfsAvailable] = useState(false);
  const [uploadedCids, setUploadedCids] = useState(new Set());
  const [globalCids, setGlobalCids] = useState(loadGlobalCids());
  const [txStatus, setTxStatus] = useState(''); // Transaction status: 'pending', 'confirmed', 'failed'
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    const init = async () => {
      await checkIpfsConnection();
      if (account) {
        loadUserContent();
      }
    };
    init();
  }, [account]);

  const checkIpfsConnection = async () => {
    try {
      const response = await axios.post(`${IPFS_API_URL}/id`);
      console.log('IPFS Connection Successful. Node ID:', response.data.ID);
      setIsIpfsAvailable(true);
      setError('');
      return true;
    } catch (err) {
      console.error('IPFS Connection Error:', err);
      setIsIpfsAvailable(false);
      setError('Cannot connect to IPFS node. Please ensure your local IPFS daemon is running.');
      return false;
    }
  };

  const loadUserContent = async () => {
    if (!account || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);
      const userCids = await contract.getUserContents(account);
      setUploadedCids(new Set(userCids));
    } catch (err) {
      console.error('Error loading user content:', err);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // First check if IPFS is available
      if (!isIpfsAvailable) {
        const connected = await checkIpfsConnection();
        if (!connected) {
          setError('Cannot connect to IPFS. Please ensure IPFS daemon is running and CORS is enabled. Restart IPFS daemon if you just enabled CORS.');
          e.target.value = '';
          return;
        }
      }

      try {
        setStatus('Checking file...');
        setError('');
        
        // Add file to IPFS to get its CID
        const result = await ipfs.add(selectedFile);
        const cid = result.path;
        console.log('Selected file CID:', cid);
        
        // Check if this CID is in the global list of registered CIDs
        if (globalCids.has(cid)) {
          setError('This file has already been registered by another wallet!');
          e.target.value = '';
          setFile(null);
        } 
        // Check if this user has already registered this file
        else if (uploadedCids.has(cid)) {
          setError('You have already registered this exact file!');
          e.target.value = '';
          setFile(null);
        } else {
          setFile(selectedFile);
          setError('');
        }
      } catch (err) {
        console.error('Error checking file:', err);
        if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch') || err.message.includes('CORS') || err.message.includes('Network request failed')) {
          setError('Cannot connect to IPFS. Please ensure IPFS daemon is running and restart it after enabling CORS. Run: ipfs daemon');
        } else {
          setError('Error checking file: ' + err.message);
        }
        setIsIpfsAvailable(false);
        e.target.value = '';
        setFile(null);
      }
      setStatus('');
    }
  };

  const handleDisconnect = async () => {
    try {
      const disconnectButton = document.querySelector('.disconnect-button');
      if (disconnectButton) disconnectButton.classList.add('clicked');
      
      setTimeout(async () => {
        if (onDisconnect) {
          await onDisconnect();
          setFile(null);
          setTitle('');
          setDescription('');
          setStatus('');
          setError('');
          setUploadedCids(new Set());
          const fileInput = document.querySelector('input[type="file"]');
          if (fileInput) fileInput.value = '';
        }
        
        if (disconnectButton) disconnectButton.classList.remove('clicked');
      }, 300);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      setError('Error disconnecting wallet. Please try again.');
      
      const disconnectButton = document.querySelector('.disconnect-button');
      if (disconnectButton) disconnectButton.classList.remove('clicked');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Add button click animation
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) submitButton.classList.add('clicked');
    
    setStatus('Processing...');
    setError('');

    if (!account) {
      setError('Please connect your wallet first');
      setStatus('');
      if (submitButton) submitButton.classList.remove('clicked');
      return;
    }

    if (!file || !title || !description) {
      setError('Please fill in all fields');
      setStatus('');
      if (submitButton) submitButton.classList.remove('clicked');
      return;
    }

    if (!isIpfsAvailable) {
      const connected = await checkIpfsConnection();
      if (!connected) {
        if (submitButton) submitButton.classList.remove('clicked');
        return;
      }
    }

    try {
      // Upload to IPFS
      setStatus('Uploading to IPFS...');
      const result = await ipfs.add(file);
      const cid = result.path;
      console.log('File uploaded to IPFS with CID:', cid);
      
      // Check global CIDs
      if (globalCids.has(cid)) {
        setError('This file has already been registered by another wallet!');
        setStatus('');
        if (submitButton) submitButton.classList.remove('clicked');
        return;
      }

      // Check if already registered by this wallet
      if (uploadedCids.has(cid)) {
        setError('You have already registered this exact file!');
        setStatus('');
        if (submitButton) submitButton.classList.remove('clicked');
        return;
      }

      // Initialize contract
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);

      // Try to register the content
      setStatus('Please confirm the transaction in MetaMask...');
      setTxStatus('pending');
      setTxHash('');
      try {
        const tx = await contract.registerContent(cid, title, description, contentType);
        console.log('Transaction sent:', tx.hash);
        setTxHash(tx.hash);
        setStatus('Transaction submitted. Waiting for confirmation...');
        setTxStatus('pending');
        
        // Wait for transaction with timeout
        const receipt = await Promise.race([
          tx.wait(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction timeout. Check MetaMask for status.')), 60000)
          )
        ]);
        
        console.log('Transaction confirmed:', receipt);
        setTxStatus('confirmed');
        setStatus('Transaction confirmed!');
        
        // Add to both local and global tracking
        setUploadedCids(prev => new Set([...prev, cid]));
        
        // Update global CIDs
        const updatedGlobalCids = new Set(globalCids);
        updatedGlobalCids.add(cid);
        setGlobalCids(updatedGlobalCids);
        saveGlobalCids(updatedGlobalCids);
        
        // Show success message with animation
        setStatus(`Content registered successfully! IPFS CID: ${cid}`);
        
        // Create a confetti effect for success
        createConfetti();
        
        // Reset form with animation
        setTimeout(() => {
          const form = document.querySelector('form');
          if (form) form.classList.add('success-reset');
          
          setTimeout(() => {
            setFile(null);
            setTitle('');
            setDescription('');
            setTxStatus('');
            setTxHash('');
            
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) {
              fileInput.value = '';
            }
            
            if (form) form.classList.remove('success-reset');
            if (submitButton) submitButton.classList.remove('clicked');
          }, 500);
        }, 2000);
        
      } catch (txError) {
        console.error('Transaction error:', txError);
        setTxStatus('failed');
        if (txError.message.includes('execution reverted')) {
          setError('This file has already been registered!');
        } else if (txError.code === 'ACTION_REJECTED' || txError.message.includes('user rejected')) {
          setError('Transaction was rejected in MetaMask. Please try again.');
        } else if (txError.message.includes('timeout')) {
          setError('Transaction is taking too long. Check MetaMask - the transaction may still be processing. Transaction hash: ' + (txError.txHash || txHash || 'unknown'));
        } else {
          setError('Transaction error: ' + (txError.message || txError.toString()));
        }
        setStatus('');
        if (submitButton) submitButton.classList.remove('clicked');
      }
    } catch (err) {
      console.error('Detailed error:', err);
      if (err.message.includes('MetaMask is not installed')) {
        setError('Please install MetaMask to use this feature');
      } else if (err.message.includes('execution reverted')) {
        setError('This file has already been registered!');
      } else if (err.code === 'ACTION_REJECTED') {
        setError('Transaction was rejected in MetaMask. Please try again.');
      } else if (err.message.includes('user rejected transaction')) {
        setError('You rejected the transaction in MetaMask. Please try again.');
      } else {
        setError(`Error: ${err.message}`);
      }
      setStatus('');
      if (submitButton) submitButton.classList.remove('clicked');
    }
  };

  // Function to create a simple confetti effect
  const createConfetti = () => {
    const container = document.querySelector('.max-w-lg');
    if (!container) return;
    
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.animationDelay = Math.random() * 3 + 's';
      confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
      container.appendChild(confetti);
      
      // Remove confetti after animation
      setTimeout(() => {
        confetti.remove();
      }, 3000);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-lg shadow-xl transform transition-all duration-300 hover:shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-white text-center flex items-center justify-center gap-2">
        <span className="animate-bounce">📤</span> Upload Content
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="transition-all duration-300 hover:translate-x-1">
          <label className="block text-sm font-medium text-white mb-1">📁 File Type</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:ring-2 transition-all duration-300"
          >
            <option value="Document">📄 Document</option>
            <option value="Image">🖼️ Image</option>
            <option value="Video">🎬 Video</option>
            <option value="Audio">🎵 Audio</option>
          </select>
        </div>

        <div className="transition-all duration-300 hover:translate-x-1">
          <label className="block text-sm font-medium text-white mb-1">📂 File</label>
          <input
            type="file"
            onChange={handleFileChange}
            className="file-input mt-1 block w-full text-white"
            required
          />
        </div>

        <div className="transition-all duration-300 hover:translate-x-1">
          <label className="block text-sm font-medium text-white mb-1">📝 Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:ring-2 transition-all duration-300"
            placeholder="Enter a title for your content..."
            required
          />
        </div>

        <div className="transition-all duration-300 hover:translate-x-1">
          <label className="block text-sm font-medium text-white mb-1">📋 Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:ring-2 transition-all duration-300"
            rows="3"
            placeholder="Add a description of your content..."
            required
          />
        </div>

        <div className="button-group">
          <button
            type="submit"
            className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:-translate-y-1"
          >
            <span>🔒</span> Register Content
          </button>
          <button 
            type="button" 
            onClick={handleDisconnect} 
            className="disconnect-button text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-all duration-300 transform hover:-translate-y-1"
          >
            <span>🔌</span> Disconnect Wallet
          </button>
        </div>
      </form>

      {status && (
        <div className="mt-4 p-4 rounded-md bg-blue-500 bg-opacity-30 backdrop-filter backdrop-blur-sm text-white border border-blue-400 transition-all duration-500 animate-fadeIn">
          <div className="flex items-center gap-2">
            {txStatus === 'pending' && <span className="animate-spin">⚙️</span>}
            {txStatus === 'confirmed' && <span>✅</span>}
            {txStatus === 'failed' && <span>❌</span>}
            {!txStatus && <span className="animate-spin">⚙️</span>}
            <p>{status}</p>
          </div>
          {txHash && (
            <div className="mt-2 text-xs">
              <p>Tx Hash: <span className="font-mono break-all">{txHash}</span></p>
              {txStatus === 'pending' && <p className="text-yellow-300">Status: Pending confirmation...</p>}
              {txStatus === 'confirmed' && <p className="text-green-300">Status: Confirmed ✓</p>}
              {txStatus === 'failed' && <p className="text-red-300">Status: Failed ✗</p>}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-md bg-red-500 bg-opacity-30 backdrop-filter backdrop-blur-sm text-white border border-red-400 transition-all duration-500 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        </div>
      )}

      <style jsx>{`
        * {
          color: white !important;
          font-family: 'Roboto', sans-serif;
        }

        .max-w-lg {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
          border-radius: 10px;
          padding: 20px;
        }

        h2 {
          font-size: 2.5rem;
          margin-bottom: 20px;
          text-align: center;
        }

        label {
          font-size: 1rem;
          margin-bottom: 5px;
        }

        input[type="text"],
        textarea,
        select {
          color: black !important;
          background-color: #fff;
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 10px;
          width: 100%;
          margin-top: 5px;
          transition: border-color 0.3s ease;
        }

        input[type="text"]:focus,
        textarea:focus,
        select:focus {
          border-color: #764ba2;
          outline: none;
        }

        .file-input::file-selector-button {
          background-color: #4f46e5;
          color: white !important;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          margin-right: 1rem;
          transition: background-color 0.3s ease;
        }

        .file-input::file-selector-button:hover {
          background-color: #4338ca;
        }

        .button-group {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 20px;
        }

        button[type="submit"],
        .disconnect-button {
          background-color: #4f46e5;
          color: white !important;
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.3s ease, transform 0.3s ease;
        }

        button[type="submit"]:hover,
        .disconnect-button:hover {
          background-color: #4338ca;
          transform: translateY(-2px);
        }

        .disconnect-button {
          background-color: #f44336;
        }

        .disconnect-button:hover {
          background-color: #d32f2f;
        }

        .mt-4 {
          margin-top: 20px;
        }

        .p-4 {
          padding: 20px;
          border-radius: 5px;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }

        button[type="submit"].clicked,
        .disconnect-button.clicked {
          transform: scale(0.95);
          box-shadow: 0 0 15px rgba(79, 70, 229, 0.6);
        }
        
        form.success-reset {
          transform: scale(0.98);
          opacity: 0.8;
          transition: all 0.5s ease;
        }
        
        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          animation: confetti-fall 3s ease-in-out forwards;
          z-index: 10;
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(500px) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default UploadForm;