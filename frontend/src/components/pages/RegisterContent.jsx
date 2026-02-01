import { useState } from 'react';
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';
import contractABI from '../../abi/ContentRegistry.json';
import { IPFS_CONFIG, CONTRACT_CONFIG } from '../../config';

const contractAddress = CONTRACT_CONFIG.address;

// Initialize IPFS client
let ipfs;
try {
  ipfs = create({ 
    host: IPFS_CONFIG.host, 
    port: IPFS_CONFIG.port, 
    protocol: IPFS_CONFIG.protocol 
  });
} catch (err) {
  console.error('Failed to create IPFS client:', err);
}

/**
 * RegisterContent Page Component
 * 
 * Allows users to:
 * 1. Upload a file to IPFS
 * 2. Register the content on the blockchain with metadata
 */
function RegisterContent({ account, isIpfsConnected, isContractConnected, onSuccess }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('Document');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [txStatus, setTxStatus] = useState(''); // 'pending' | 'confirmed' | 'failed'
  const [error, setError] = useState('');
  const [lastRegisteredCid, setLastRegisteredCid] = useState('');

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!file || !title.trim()) {
      setError('Please select a file and enter a title');
      return;
    }

    if (!isIpfsConnected) {
      setError('IPFS is not connected. Please start your local IPFS daemon (run: ipfs daemon)');
      return;
    }

    if (!isContractConnected) {
      setError('Smart contract is not connected. Please start Hardhat node and deploy the contract.');
      return;
    }

    setIsUploading(true);
    setError('');
    setTxStatus('');
    setUploadStatus('');
    setLastRegisteredCid('');

    try {
      // Step 1: Upload to IPFS
      setUploadStatus('📤 Uploading to IPFS...');
      const result = await ipfs.add(file);
      const cid = result.path;
      setUploadStatus(`✅ Uploaded to IPFS! CID: ${cid}`);

      // Step 2: Check if content exists (NO WALLET CONFIRMATION)
      setUploadStatus('🔍 Checking if content already exists...');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);
      const currentAccount = await signer.getAddress();

      // Check if content already exists (read-only, instant, no gas)
      const exists = await contract.checkContentExists(cid);
      
      if (exists) {
        // Content exists - get the owner to check if it's the same user
        const content = await contract.getContent(cid);
        const owner = content.owner;
        
        if (owner.toLowerCase() === currentAccount.toLowerCase()) {
          // Same user trying to register their own content again
          setTxStatus('failed');
          setError('You have already registered this content');
          setUploadStatus('');
          setIsUploading(false);
          return;
        } else {
          // Different user trying to register someone else's content
          // Show error immediately WITHOUT any transaction
          setTxStatus('failed');
          setError(`This content is already registered by another user (${owner.substring(0, 10)}...)`);
          setUploadStatus('');
          setIsUploading(false);
          return;
        }
      }

      // Content doesn't exist, proceed with registration
      setUploadStatus('🔐 Waiting for wallet confirmation...');
      setTxStatus('pending');
      const tx = await contract.registerContent(cid, title.trim(), description.trim() || '', contentType);
      setUploadStatus(`⏳ Transaction submitted. Waiting for confirmation...`);

      // Wait for confirmation
      await tx.wait();
      setTxStatus('confirmed');
      setUploadStatus('🎉 Content registered successfully on blockchain!');
      setLastRegisteredCid(cid);

      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      const fileInput = document.getElementById('register-file-input');
      if (fileInput) fileInput.value = '';

      // Notify parent to refresh data
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }

    } catch (err) {
      console.error('Registration error:', err);
      setTxStatus('failed');
      if (err.code === 'ACTION_REJECTED') {
        setError('Transaction rejected by user');
      } else if (err.message?.includes('already registered')) {
        setError('This content is already registered');
      } else {
        setError('Registration failed: ' + (err.shortMessage || err.message || 'Unknown error'));
      }
      setUploadStatus('');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="page-header">
        <h1>📤 Register Digital Content</h1>
        <p>Upload your content to IPFS and register ownership on the blockchain</p>
      </div>

      <div className="register-container">
        <div className="register-form-section">
          <form onSubmit={handleRegister} className="register-form">
            {/* File Upload */}
            <div className="form-group">
              <label>📁 Select File <span className="required">*</span></label>
              <div className="file-upload-area">
                <input
                  id="register-file-input"
                  type="file"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="file-input"
                />
                {file ? (
                  <div className="file-preview">
                    <span className="file-icon">📄</span>
                    <div className="file-details">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{(file.size / 1024).toFixed(2)} KB</span>
                    </div>
                  </div>
                ) : (
                  <div className="file-placeholder">
                    <span className="upload-icon">⬆️</span>
                    <span>Click to select a file or drag & drop</span>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="form-group">
              <label>📝 Content Title <span className="required">*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title for your content"
                disabled={isUploading}
                required
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label>📋 Description <span className="optional">(optional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description to help identify this content..."
                disabled={isUploading}
                rows={4}
              />
            </div>

            {/* Content Type */}
            <div className="form-group">
              <label>🏷️ Content Type</label>
              <div className="type-selector">
                {['Document', 'Image', 'Video', 'Audio'].map(type => (
                  <button
                    key={type}
                    type="button"
                    className={`type-btn ${contentType === type ? 'active' : ''}`}
                    onClick={() => setContentType(type)}
                    disabled={isUploading}
                  >
                    {type === 'Document' && '📄'}
                    {type === 'Image' && '🖼️'}
                    {type === 'Video' && '🎬'}
                    {type === 'Audio' && '🎵'}
                    <span>{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              className="register-btn"
              disabled={isUploading || !file || !title.trim() || !isIpfsConnected || !isContractConnected}
            >
              {isUploading ? '⏳ Processing...' : '🔒 Register Content'}
            </button>
          </form>
        </div>

        {/* Status Panel */}
        <div className="status-panel">
          <h3>Registration Status</h3>
          
          {!uploadStatus && !txStatus && (
            <div className="status-idle">
              <div className="idle-icon">📋</div>
              <p>Fill in the form and click "Register Content" to begin</p>
            </div>
          )}

          {uploadStatus && (
            <div className={`status-step ${txStatus}`}>
              <div className="status-icon">
                {txStatus === 'confirmed' ? '✅' : txStatus === 'failed' ? '❌' : '⏳'}
              </div>
              <p>{uploadStatus}</p>
            </div>
          )}

          {lastRegisteredCid && txStatus === 'confirmed' && (
            <div className="success-details">
              <h4>🎉 Registration Complete!</h4>
              <div className="cid-display">
                <label>Content ID (CID):</label>
                <code>{lastRegisteredCid}</code>
              </div>
              <a 
                href={`${IPFS_CONFIG.gatewayUrl}/${lastRegisteredCid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="view-btn"
              >
                🔗 View on IPFS
              </a>
            </div>
          )}

          {/* Info Cards */}
          <div className="info-cards">
            <div className="info-card">
              <span className="info-icon">💡</span>
              <div>
                <strong>What happens?</strong>
                <p>Your file is uploaded to IPFS and its unique identifier (CID) is stored on the blockchain with your wallet as the owner.</p>
              </div>
            </div>
            <div className="info-card">
              <span className="info-icon">🔒</span>
              <div>
                <strong>Proof of Ownership</strong>
                <p>The blockchain timestamp proves when you registered this content, establishing your ownership claim.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .register-page {
          padding: 30px;
          max-width: 1200px;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-header h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          color: var(--text-primary);
        }

        .page-header p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 15px;
        }

        .register-container {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 30px;
        }

        .register-form-section {
          background: var(--bg-secondary);
          border-radius: 16px;
          padding: 30px;
          border: 1px solid var(--border-color);
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form-group label {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 14px;
        }

        .required {
          color: #ef4444;
        }

        .optional {
          color: var(--text-muted);
          font-weight: 400;
        }

        .file-upload-area {
          position: relative;
          border: 2px dashed var(--border-color);
          border-radius: 12px;
          padding: 30px;
          text-align: center;
          transition: all 0.2s;
          background: var(--bg-tertiary);
        }

        .file-upload-area:hover {
          border-color: var(--accent-color);
        }

        .file-input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }

        .file-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: var(--text-secondary);
        }

        .upload-icon {
          font-size: 32px;
        }

        .file-preview {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 10px;
          background: var(--success-bg);
          border-radius: 8px;
        }

        .file-icon {
          font-size: 32px;
        }

        .file-details {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .file-name {
          color: var(--text-primary);
          font-weight: 600;
        }

        .file-size {
          color: var(--text-secondary);
          font-size: 12px;
        }

        .form-group input[type="text"],
        .form-group textarea {
          padding: 14px 16px;
          border: 2px solid var(--input-border);
          border-radius: 10px;
          font-size: 14px;
          color: var(--text-primary);
          background: var(--input-bg);
          transition: border-color 0.2s;
        }

        .form-group input[type="text"]::placeholder,
        .form-group textarea::placeholder {
          color: var(--text-muted);
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--accent-color);
        }

        .type-selector {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .type-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px 10px;
          border: 2px solid var(--border-color);
          border-radius: 10px;
          background: var(--bg-tertiary);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 24px;
          color: var(--text-primary);
        }

        .type-btn span {
          font-size: 12px;
          font-weight: 500;
        }

        .type-btn:hover {
          border-color: var(--accent-color);
        }

        .type-btn.active {
          border-color: var(--accent-color);
          background: var(--badge-bg);
        }

        .error-message {
          padding: 14px;
          background: var(--error-bg);
          border: 1px solid var(--error-text);
          color: var(--error-text);
          border-radius: 10px;
          font-size: 14px;
        }

        .register-btn {
          padding: 18px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .register-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .register-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Status Panel */
        .status-panel {
          background: var(--bg-secondary);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid var(--border-color);
          height: fit-content;
        }

        .status-panel h3 {
          margin: 0 0 20px 0;
          color: var(--text-primary);
          font-size: 18px;
        }

        .status-idle {
          text-align: center;
          padding: 30px;
          color: var(--text-secondary);
        }

        .idle-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }

        .status-step {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border-radius: 10px;
          margin-bottom: 16px;
        }

        .status-step.pending {
          background: rgba(251, 191, 36, 0.15);
          border: 1px solid rgba(251, 191, 36, 0.3);
        }

        .status-step.confirmed {
          background: var(--success-bg);
          border: 1px solid var(--success-text);
        }

        .status-step.failed {
          background: var(--error-bg);
          border: 1px solid var(--error-text);
        }

        .status-icon {
          font-size: 24px;
        }

        .status-step p {
          margin: 0;
          color: var(--text-primary);
          font-size: 14px;
        }

        .success-details {
          background: var(--bg-tertiary);
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .success-details h4 {
          margin: 0 0 15px 0;
          color: var(--success-text);
        }

        .cid-display {
          margin-bottom: 15px;
        }

        .cid-display label {
          display: block;
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }

        .cid-display code {
          display: block;
          padding: 10px;
          background: var(--cid-bg);
          border-radius: 6px;
          font-size: 11px;
          word-break: break-all;
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        .view-btn {
          display: inline-block;
          padding: 10px 16px;
          background: var(--accent-color);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        .view-btn:hover {
          opacity: 0.9;
        }

        .info-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 20px;
        }

        .info-card {
          display: flex;
          gap: 12px;
          padding: 14px;
          background: var(--bg-tertiary);
          border-radius: 10px;
          border: 1px solid var(--border-color);
        }

        .info-icon {
          font-size: 20px;
        }

        .info-card strong {
          display: block;
          color: var(--text-primary);
          font-size: 13px;
          margin-bottom: 4px;
        }

        .info-card p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.5;
        }

        @media (max-width: 1024px) {
          .register-container {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .type-selector {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

export default RegisterContent;
