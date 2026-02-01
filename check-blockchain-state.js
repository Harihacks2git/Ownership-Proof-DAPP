const { ethers } = require('ethers');
const contractABI = require('./frontend/src/abi/ContentRegistry.json');

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const RPC_URL = 'http://127.0.0.1:8545';

async function checkBlockchainState() {
  console.log('================================================');
  console.log('🔍 BLOCKCHAIN STATE CHECK');
  console.log('================================================\n');

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, provider);

    // Get all accounts
    const accounts = await provider.listAccounts();
    console.log(`📋 Found ${accounts.length} accounts\n`);

    // Check each account's registered content
    let totalContents = 0;
    for (let i = 0; i < Math.min(accounts.length, 5); i++) {
      const account = accounts[i].address;
      const contents = await contract.getUserContents(account);
      
      if (contents.length > 0) {
        console.log(`Account #${i}: ${account}`);
        console.log(`  Registered Contents: ${contents.length}`);
        
        for (const cid of contents) {
          const content = await contract.getContent(cid);
          console.log(`    - CID: ${cid.substring(0, 20)}...`);
          console.log(`      Title: ${content.title}`);
          console.log(`      Owner: ${content.owner}`);
        }
        console.log('');
        totalContents += contents.length;
      }
    }

    if (totalContents === 0) {
      console.log('✅ Blockchain is CLEAN - No content registered\n');
    } else {
      console.log(`📊 Total registered contents: ${totalContents}\n`);
    }

    // Get all ContentRegistered events
    console.log('📜 Checking ContentRegistered events...');
    const filter = contract.filters.ContentRegistered();
    const events = await contract.queryFilter(filter, 0, 'latest');
    console.log(`   Found ${events.length} registration events\n`);

    if (events.length > 0) {
      console.log('Recent registrations:');
      events.slice(-5).forEach((event, idx) => {
        console.log(`  ${idx + 1}. CID: ${event.args.contentId.substring(0, 20)}...`);
        console.log(`     Owner: ${event.args.owner}`);
        console.log(`     Block: ${event.blockNumber}\n`);
      });
    }

    console.log('================================================');
    console.log('✅ Check complete!');
    console.log('================================================');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBlockchainState();
