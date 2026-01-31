// Test script to verify contract functionality
const { ethers } = require('hardhat');

async function main() {
  console.log('🔍 Testing ContentRegistry Contract...\n');

  // Get signers
  const [owner, user1, user2] = await ethers.getSigners();
  console.log('Owner:', owner.address);
  console.log('User1:', user1.address);
  console.log('User2:', user2.address);
  console.log('');

  // Get deployed contract address from config
  const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const ContentRegistry = await ethers.getContractFactory('contracts/ownership.sol:ContentRegistry');
  const contract = ContentRegistry.attach(contractAddress);

  console.log('Contract Address:', contractAddress);
  console.log('Authority:', await contract.authority());
  console.log('');

  // Test 1: Register content with User1
  console.log('📝 Test 1: Register content with User1');
  const testCID = 'QmTest123456789';
  try {
    const tx1 = await contract.connect(user1).registerContent(
      testCID,
      'Test Content',
      'This is a test',
      'Document'
    );
    await tx1.wait();
    console.log('✅ Content registered successfully');
    console.log('Transaction:', tx1.hash);
  } catch (err) {
    console.log('❌ Registration failed:', err.message);
  }
  console.log('');

  // Test 2: Check if content exists
  console.log('🔍 Test 2: Check if content is registered');
  const isRegistered = await contract.isContentRegistered(testCID);
  console.log('Is Registered:', isRegistered);
  console.log('');

  // Test 3: Get content details
  console.log('📄 Test 3: Get content details');
  try {
    const content = await contract.getContent(testCID);
    console.log('CID:', content.cid);
    console.log('Title:', content.title);
    console.log('Owner:', content.owner);
    console.log('Timestamp:', content.timestamp.toString());
  } catch (err) {
    console.log('❌ Failed to get content:', err.message);
  }
  console.log('');

  // Test 4: Get user contents
  console.log('📋 Test 4: Get User1 contents');
  const user1Contents = await contract.getUserContents(user1.address);
  console.log('User1 has', user1Contents.length, 'content(s)');
  console.log('CIDs:', user1Contents);
  console.log('');

  // Test 5: Try to register same content with User2 (should fail)
  console.log('⚠️  Test 5: Try to register duplicate with User2 (should fail)');
  try {
    const tx2 = await contract.connect(user2).registerContent(
      testCID,
      'Duplicate Content',
      'This should fail',
      'Document'
    );
    await tx2.wait();
    console.log('❌ ERROR: Duplicate registration succeeded (should have failed!)');
  } catch (err) {
    console.log('✅ Correctly rejected duplicate:', err.reason || err.message);
  }
  console.log('');

  // Test 6: Transfer ownership
  console.log('🔄 Test 6: Transfer ownership from User1 to User2');
  try {
    const tx3 = await contract.connect(user1).transferOwnership(testCID, user2.address);
    await tx3.wait();
    console.log('✅ Ownership transferred');
    
    const content = await contract.getContent(testCID);
    console.log('New owner:', content.owner);
    console.log('Owner history:', content.ownerHistory);
  } catch (err) {
    console.log('❌ Transfer failed:', err.message);
  }
  console.log('');

  console.log('✅ All tests completed!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
