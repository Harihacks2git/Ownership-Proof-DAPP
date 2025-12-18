import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import contractABI from '../abi/ContentRegistry.json';
import { CONTRACT_CONFIG, AUTHORITY_CONFIG, IPFS_CONFIG } from '../config';
import { create } from 'ipfs-http-client';

const contractAddress = CONTRACT_CONFIG.address;
const ipfs = create({ 
  host: IPFS_CONFIG.host, 
  port: IPFS_CONFIG.port, 
  protocol: IPFS_CONFIG.protocol 
});

/**
 * AuthorityUpdate Component
 * 
 * Provides a UI for authority-controlled CID updates.
 * This implements the "controlled modification" concept from the base paper,
 * where only an authorized authority can update the CID of registered content
 * while maintaining a transparent audit trail.
 * 
 * Features:
 * - Upload new file to IPFS
 * - Update CID for existing content
 * - Display audit trail of CID changes
 */
export default function AuthorityUpdate({ account }) {
  const [contentId, setContentId] = useState('');
  const [newCid, setNewCid] = useState('');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [authorityAddress, setAuthorityAddress] = useState('');
  const [isAuthority, setIsAuthority] = useState(false);
  const [updateHistory, setUpdateHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuthorityStatus();
    loadUpdateHistory();
  }, [account]);

  /**
   * Check if the connected account is the authority
   * This verifies authorization before allowing CID updates
   */
  const checkAuthorityStatus = async () => {
    if (!window.ethereum || !account) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);
      
      const authAddress = await contract.authority();
      setAuthorityAddress(authAddress);
      
      // Check if current account is authority
      setIsAuthority(account.toLowerCase() === authAddress.toLowerCase());
    } catch (err) {
      console.error('Error checking authority:', err);
    }
  };

  /**
   * Load CID update history from contract events
   * This shows the audit trail of all authority updates
   */
  const loadUpdateHistory = async () => {
    if (!window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);
      
      // Get past ContentAuthorityUpdated events
      const filter = contract.filters.ContentAuthorityUpdated();
      const events = await contract.queryFilter(filter, 0, 'latest');
      
      const history = events.map(event => ({
        contentId: event.args.contentId,
        oldCid: event.args.oldCid,
        newCid: event.args.newCid,
        authority: event.args.authority,
        timestamp: Number(event.args.timestamp),
        txHash: event.transactionHash
      }));

      // Sort by timestamp (newest first)
      history.sort((a, b) => b.timestamp - a.timestamp);
      setUpdateHistory(history);
    } catch (err) {
      console.error('Error loading update history:', err);
    }
  };

  /**
   * Handle file selection for new CID upload
   */
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    try {
      setStatus('Uploading file to IPFS...');
      setError('');
      
      // Upload to IPFS
      const result = await ipfs.add(selectedFile);
      const cid = result.path;
      
      setNewCid(cid);
      setFile(selectedFile);
      setStatus(`File uploaded! CID: ${cid}`);
    } catch (err) {
      console.error('IPFS upload error:', err);
      setError('Failed to upload file to IPFS: ' + err.message);
      setStatus('');
    }
  };

  /**
   * Update CID using authority server endpoint
   * This calls the backend authority service which has the authority private key
   */
  const handleUpdateViaServer = async (e) => {
    e.preventDefault();
    
    if (!contentId || !newCid) {
      setError('Please provide both content ID and new CID');
      return;
    }

    try {
      setError('');
      setStatus('Sending update request to authority server...');
      setLoading(true);

      // Call authority server API
      const response = await axios.post(`${AUTHORITY_CONFIG.apiUrl}/authorize-update`, {
        contentId,
        newCid
      });

      if (response.data.success) {
        setStatus(`CID updated successfully! Transaction: ${response.data.txHash}`);
        setContentId('');
        setNewCid('');
        setFile(null);
        
        // Reload update history
        setTimeout(() => {
          loadUpdateHistory();
        }, 2000);
      } else {
        setError('Update failed: ' + (response.data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Authority update error:', err);
      setError('Failed to update CID: ' + (err.response?.data?.error || err.message));
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update CID directly from frontend (if account is authority)
   * Alternative method: direct contract call if authority wallet is connected
   */
  const handleUpdateDirect = async (e) => {
    e.preventDefault();
    
    if (!contentId || !newCid) {
      setError('Please provide both content ID and new CID');
      return;
    }

    if (!isAuthority) {
      setError('Only the authority address can update CIDs');
      return;
    }

    try {
      setError('');
      setStatus('Please confirm the transaction in MetaMask...');
      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);

      const tx = await contract.authorityUpdateCID(contentId, newCid);
      setStatus(`Transaction submitted: ${tx.hash}. Waiting for confirmation...`);

      const receipt = await tx.wait();
      
      setStatus(`CID updated successfully! Transaction confirmed.`);
      setContentId('');
      setNewCid('');
      setFile(null);
      
      // Reload update history
      setTimeout(() => {
        loadUpdateHistory();
      }, 2000);
    } catch (err) {
      console.error('Direct update error:', err);
      if (err.code === 'ACTION_REJECTED' || err.message.includes('user rejected')) {
        setError('Transaction was rejected in MetaMask.');
      } else {
        setError('Update failed: ' + (err.message || err.toString()));
      }
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (!account) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-black">Please connect your wallet to access authority features.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-black">Authority-Controlled CID Update</h2>
      
      {/* Authority Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-black mb-2">Authority Status</h3>
        <div className="space-y-2 text-black">
          <p><span className="font-semibold">Authority Address:</span> 
            <span className="font-mono ml-2">{formatAddress(authorityAddress)}</span>
          </p>
          <p>
            {isAuthority ? (
              <span className="text-green-600 font-semibold">✓ You are the authority</span>
            ) : (
              <span className="text-red-600">✗ You are not the authority</span>
            )}
          </p>
          <p className="text-sm text-gray-600">
            {isAuthority 
              ? "You can update CIDs directly from this interface."
              : "Use the authority server API endpoint to update CIDs."}
          </p>
        </div>
      </div>

      {/* CID Update Form */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-black mb-3">Update Content CID</h3>
        <form onSubmit={isAuthority ? handleUpdateDirect : handleUpdateViaServer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Content ID (existing CID)
            </label>
            <input
              type="text"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              placeholder="Enter the content ID to update"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Upload New File (to get new CID)
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              New CID (or enter manually)
            </label>
            <input
              type="text"
              value={newCid}
              onChange={(e) => setNewCid(e.target.value)}
              placeholder="Enter new CID or upload file above"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-black font-mono text-sm"
              required
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            disabled={loading || !contentId || !newCid}
          >
            {isAuthority ? 'Update CID (Direct)' : 'Update CID (via Server)'}
          </button>
        </form>

        {status && (
          <div className="mt-4 p-3 bg-blue-100 rounded">
            <p className="text-sm text-black">{status}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Audit Trail - CID Update History */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-black mb-3">CID Update Audit Trail</h3>
        {updateHistory.length > 0 ? (
          <div className="space-y-4">
            {updateHistory.map((update, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2 bg-white rounded">
                <div className="space-y-1 text-black">
                  <p><span className="font-semibold">Content ID:</span> 
                    <span className="font-mono text-sm ml-2">{update.contentId}</span>
                  </p>
                  <p><span className="font-semibold">Old CID:</span> 
                    <span className="font-mono text-sm ml-2 break-all">{update.oldCid}</span>
                  </p>
                  <p><span className="font-semibold">New CID:</span> 
                    <span className="font-mono text-sm ml-2 break-all">{update.newCid}</span>
                  </p>
                  <p><span className="font-semibold">Updated by:</span> 
                    <span className="font-mono text-sm ml-2">{formatAddress(update.authority)}</span>
                  </p>
                  <p><span className="font-semibold">Time:</span> {formatDate(update.timestamp)}</p>
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Tx Hash:</span>{' '}
                    <span className="font-mono break-all">{update.txHash}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No CID updates recorded yet</p>
        )}
      </div>
    </div>
  );
}
