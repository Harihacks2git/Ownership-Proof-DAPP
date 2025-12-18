import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import contractABI from '../abi/ContentRegistry.json';
import { CONTRACT_CONFIG, IPFS_CONFIG } from '../config';
import ContentDetails from './ContentDetails';

const contractAddress = CONTRACT_CONFIG.address;

function UserGallery({ account }) {
  const [userContents, setUserContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadedCids, setUploadedCids] = useState(new Set());
  const [selectedContent, setSelectedContent] = useState(null);

  const loadUserContents = useCallback(async () => {
    try {
      if (!window.ethereum) {
        setLoading(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Use full ABI for proper struct handling
      const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);

      // Try to get user contents
      const cids = await contract.getUserContents(account).catch((err) => {
        console.error('Error fetching user contents:', err);
        return [];
      });
      
      if (!cids || cids.length === 0) {
        setUserContents([]);
        setLoading(false);
        return;
      }

      const contents = await Promise.all(
        cids.map(async (cid) => {
          try {
            // Get full Content struct which includes owner and ownership history
            const contentData = await contract.getContent(cid).catch((err) => {
              console.error(`Error fetching content for CID ${cid}:`, err);
              return null;
            });
            
            if (contentData && contentData.cid) {
              return {
                cid: contentData.cid || cid,
                title: contentData.title || 'Untitled',
                description: contentData.description || '',
                contentType: contentData.contentType || 'Document',
                owner: contentData.owner || '',
                timestamp: contentData.timestamp 
                  ? new Date(Number(contentData.timestamp) * 1000).toLocaleString()
                  : 'Unknown',
                timestampRaw: contentData.timestamp ? Number(contentData.timestamp) : 0
              };
            }
            return null;
          } catch (err) {
            console.error(`Error processing content ${cid}:`, err);
            return null;
          }
        })
      );

      const validContents = contents.filter(content => content !== null);
      setUserContents(validContents);
      setLoading(false);

    } catch (err) {
      console.error('Error in loadUserContents:', err);
      setUserContents([]);
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      loadUserContents();
    } else {
      setLoading(false);
    }
  }, [account, loadUserContents]);

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

  if (loading) {
    return <div className="text-center text-white">Loading your content...</div>;
  }

  if (selectedContent) {
    return (
      <ContentDetails 
        contentId={selectedContent} 
        account={account}
        onClose={() => setSelectedContent(null)}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {userContents.length > 0 ? (
        <>
          <h2 className="text-2xl font-bold mb-6 text-black">Your Content</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userContents.map((content) => (
              <div 
                key={content.cid} 
                className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedContent(content.cid)}
              >
                <h3 className="font-bold text-black mb-2">{content.title}</h3>
                <p className="text-sm text-black mb-2 line-clamp-2">{content.description}</p>
                <div className="space-y-1 text-xs text-black">
                  <p><span className="font-semibold">Type:</span> {content.contentType}</p>
                  <p><span className="font-semibold">Registered:</span> {content.timestamp}</p>
                  <p><span className="font-semibold">Owner:</span> 
                    <span className="font-mono ml-1">
                      {content.owner ? `${content.owner.substring(0, 6)}...${content.owner.substring(content.owner.length - 4)}` : 'N/A'}
                    </span>
                  </p>
                  <p className="font-mono mt-2 break-all text-gray-600">
                    <span className="font-semibold">CID:</span> {content.cid}
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <a
                    href={`${IPFS_CONFIG.gatewayUrl}/${content.cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View on IPFS →
                  </a>
                </div>
                <button
                  className="mt-2 w-full px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedContent(content.cid);
                  }}
                >
                  View Details & History
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center text-gray-600">
          <p>No content registered yet. Upload content to get started!</p>
        </div>
      )}
    </div>
  );
}

export default UserGallery; 