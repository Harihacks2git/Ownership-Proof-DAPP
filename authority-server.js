// authority-server.js
const express = require('express');
const { ethers } = require('ethers');
require('dotenv').config();
const app = express();
app.use(express.json());

const RPC = process.env.RPC_URL;
const PRIVATE_KEY = process.env.AUTH_PRIVATE_KEY;
const CONTRACT_ADDR = process.env.CONTRACT_ADDR;
const CONTRACT_ABI = [
  "function authorityUpdateCID(string contentId, string newCid) public",
];

if(!RPC || !PRIVATE_KEY || !CONTRACT_ADDR){
  console.error("Please set RPC_URL, AUTH_PRIVATE_KEY, CONTRACT_ADDR in .env");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDR, CONTRACT_ABI, signer);

app.post('/authorize-update', async (req, res) => {
  try {
    const { contentId, newCid } = req.body;
    if(!contentId || !newCid) return res.status(400).json({ error: "contentId and newCid required" });
    const tx = await contract.authorityUpdateCID(contentId, newCid, { gasLimit: 300000 });
    const receipt = await tx.wait();
    res.json({ success: true, txHash: receipt.transactionHash });
  } catch (err) {
    res.status(500).json({ success: false, error: err.toString() });
  }
});

app.listen(3001, ()=> console.log("Authority service running on 3001"));
