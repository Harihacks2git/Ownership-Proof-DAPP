// indexer.js
const fs = require('fs');
const { ethers } = require('ethers');
require('dotenv').config();

const RPC = process.env.RPC_URL;
const CONTRACT_ADDR = process.env.CONTRACT_ADDR;
const CONTRACT_ABI = [
  "event ContentRegistered(string indexed contentId, address indexed owner, uint256 timestamp)",
  "event ContentTransferred(string indexed contentId, address indexed from, address indexed to, uint256 timestamp)",
  "event ContentAuthorityUpdated(string indexed contentId, string oldCid, string newCid, address indexed authority, uint256 timestamp)"
];

if(!RPC || !CONTRACT_ADDR){
  console.error("Please set RPC_URL and CONTRACT_ADDR in .env");
  process.exit(1);
}

const provider = new ethers.providers.JsonRpcProvider(RPC);
const contract = new ethers.Contract(CONTRACT_ADDR, CONTRACT_ABI, provider);
const DB_FILE = './event_db.json';
if(!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({registrations:[], transfers:[], updates:[]}, null, 2));

contract.on("ContentRegistered", (contentId, owner, ts) => {
  const db = JSON.parse(fs.readFileSync(DB_FILE));
  db.registrations.push({contentId, owner, ts: ts.toNumber()});
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  console.log("Registered:", contentId);
});

contract.on("ContentTransferred", (contentId, from, to, ts) => {
  const db = JSON.parse(fs.readFileSync(DB_FILE));
  db.transfers.push({contentId, from, to, ts: ts.toNumber()});
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  console.log("Transferred:", contentId);
});

contract.on("ContentAuthorityUpdated", (contentId, oldCid, newCid, authority, ts) => {
  const db = JSON.parse(fs.readFileSync(DB_FILE));
  db.updates.push({contentId, oldCid, newCid, authority, ts: ts.toNumber()});
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  console.log("AuthorityUpdated:", contentId);
});

console.log("Indexer listening to events...");
