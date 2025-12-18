import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractABI from '../abi/ContentRegistry.json';
import { CONTRACT_CONFIG, IPFS_CONFIG } from '../config';

const contractAddress = CONTRACT_CONFIG.address;

/**
 * ContentDetails Component
 * 
 * Displays detailed information about a registered content item including:
 * - Current owner
 * - CID (IPFS Content Identifier)
 * - Registration timestamp
 * - Ownership transfer history (timeline)
 * - Transfer ownership functionality (if user is the owner)
 * 
 * This component demonstrates the ownership proof and audit trail features
 * required by the base paper.
 */
export default function ContentDetails({ contentId, account, onClose }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferStatus, setTransferStatus] = useState('');
  const [transferTxHash, setTransferTxHash] = useState('');

  useEffect(() => {
    if (contentId) {
      loadContentDetails();
    }
  }, [contentId, account]);

  /**
   * Load content details from the smart contract
   * Fetches the Content struct which includes ownership history
   */
  const loadContentDetails = async () => {
    if (!window.ethereum || !contentId) return;

    try {
      setLoading(true);
      setError('');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);
      
      // Fetch content details from contract
      const contentData = await contract.getContent(contentId);
      
      // Parse the Content struct
      setContent({
        cid: contentData.cid,
        title: contentData.title,
        description: contentData.description,
        contentType: contentData.contentType,
        owner: contentData.owner,
        timestamp: Number(contentData.timestamp),
        ownerHistory: contentData.ownerHistory,
        timeHistory: contentData.timeHistory.map(t => Number(t))
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading content details:', err);
      setError('Failed to load content details. Make sure the content ID is valid.');
      setLoading(false);
    }
  };

  /**
   * Transfer ownership to a new address
   * Only the current owner can transfer ownership
   */
  const handleTransferOwnership = async (e) => {
    e.preventDefault();
    
    if (!account || !transferTo) {
      setError('Please provide a valid recipient address');
      return;
    }

    // Validate Ethereum address
    if (!ethers.isAddress(transferTo)) {
      setError('Invalid Ethereum address');
      return;
    }

    if (account.toLowerCase() !== content.owner.toLowerCase()) {
      setError('Only the current owner can transfer ownership');
      return;
    }

    try {
      setError('');
      setTransferStatus('Please confirm the transaction in MetaMask...');
      setTransferTxHash('');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);

      // Call transferContentToBuyer (this implements transferOwnership functionality)
      // Note: The contract has transferOwnership as an alias, but we use transferContentToBuyer
      // which is in the ABI. Both functions do the same thing.
      const tx = await contract.transferContentToBuyer(contentId, transferTo);
      setTransferTxHash(tx.hash);
      setTransferStatus('Transaction submitted. Waiting for confirmation...');

      const receipt = await tx.wait();
      
      setTransferStatus('Ownership transferred successfully!');
      
      // Reload content details to show updated ownership
      setTimeout(() => {
        loadContentDetails();
        setTransferTo('');
      }, 2000);

    } catch (err) {
      console.error('Transfer error:', err);
      if (err.code === 'ACTION_REJECTED' || err.message.includes('user rejected')) {
        setError('Transaction was rejected in MetaMask.');
      } else {
        setError('Transfer failed: ' + (err.message || err.toString()));
      }
      setTransferStatus('');
    }
  };

  /**
   * Format address for display (shortened version)
   */
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  /**
   * Format timestamp to readable date
   */
  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-black">Loading content details...</div>
      </div>
    );
  }

  if (error && !content) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-600 mb-4">{error}</div>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    );
  }

  if (!content) {
    return null;
  }

  const isOwner = account && account.toLowerCase() === content.owner.toLowerCase();

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-black">Content Details</h2>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Close
        </button>
      </div>

      {/* Basic Information */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-black mb-3">Basic Information</h3>
        <div className="space-y-2 text-black">
          <p><span className="font-semibold">Title:</span> {content.title}</p>
          <p><span className="font-semibold">Description:</span> {content.description}</p>
          <p><span className="font-semibold">Type:</span> {content.contentType}</p>
          <p><span className="font-semibold">CID:</span> <span className="font-mono text-sm break-all">{content.cid}</span></p>
          <p><span className="font-semibold">IPFS Link:</span> 
            <a 
              href={`${IPFS_CONFIG.gatewayUrl}/${content.cid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline ml-2"
            >
              View on IPFS
            </a>
          </p>
        </div>
      </div>

      {/* Ownership Information */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-black mb-3">Ownership Information</h3>
        <div className="space-y-2 text-black">
          <p><span className="font-semibold">Current Owner:</span> 
            <span className="font-mono ml-2">{formatAddress(content.owner)}</span>
            {isOwner && <span className="ml-2 text-green-600">(You)</span>}
          </p>
          <p><span className="font-semibold">Registration Time:</span> {formatDate(content.timestamp)}</p>
        </div>
      </div>

      {/* Ownership Transfer History Timeline */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-black mb-3">Ownership History</h3>
        {content.ownerHistory && content.ownerHistory.length > 0 ? (
          <div className="space-y-4">
            {content.ownerHistory.map((owner, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mt-1"></div>
                  {index < content.ownerHistory.length - 1 && (
                    <div className="w-0.5 h-8 bg-gray-300 ml-1.5"></div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-black">
                    <span className="font-semibold">Owner {index + 1}:</span>{' '}
                    <span className="font-mono">{formatAddress(owner)}</span>
                  </p>
                  {content.timeHistory[index] && (
                    <p className="text-sm text-gray-600">
                      {formatDate(content.timeHistory[index])}
                    </p>
                  )}
                  {index === 0 && (
                    <p className="text-xs text-gray-500 italic">Initial registration</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No ownership history available</p>
        )}
      </div>

      {/* Transfer Ownership Form (only if user is owner) */}
      {isOwner && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-black mb-3">Transfer Ownership</h3>
          <form onSubmit={handleTransferOwnership} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                New Owner Address
              </label>
              <input
                type="text"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                required
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              disabled={!!transferStatus}
            >
              Transfer Ownership
            </button>
          </form>
          
          {transferStatus && (
            <div className="mt-3 p-3 bg-blue-100 rounded">
              <p className="text-sm text-black">{transferStatus}</p>
              {transferTxHash && (
                <p className="text-xs text-gray-600 mt-1">
                  Tx Hash: <span className="font-mono break-all">{transferTxHash}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
