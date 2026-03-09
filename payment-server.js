// payment-server.js — Mock mode for local demo (no Stripe keys needed)
const express = require('express');
const { ethers } = require('ethers');
require('dotenv').config();

// --- Environment Variables ---
const RPC_URL = process.env.RPC_URL;
const AUTH_PRIVATE_KEY = process.env.AUTH_PRIVATE_KEY;
const CONTRACT_ADDR = process.env.CONTRACT_ADDR;
const PAYMENT_SERVER_PORT = process.env.PAYMENT_SERVER_PORT || 3002;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// --- Startup Validation ---
const required = { RPC_URL, AUTH_PRIVATE_KEY, CONTRACT_ADDR };
const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// --- Ethers / Contract Setup ---
const CONTRACT_ABI = [
  "function getApproval(string contentId) view returns (tuple(address requester, uint256 price, uint256 timestamp, bool isActive))",
  "function getTransferRequest(string contentId, address requester) view returns (tuple(address requester, uint256 price, bool isPending, uint256 timestamp))",
  "function finalizeTransfer(string contentId, address requester)",
  "function cooldownDuration() view returns (uint256)",
  "function getContent(string _cid) view returns (tuple(string cid, string title, string description, string contentType, address owner, uint256 timestamp, address[] ownerHistory, uint256[] timeHistory))"
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(AUTH_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDR, CONTRACT_ABI, signer);

// --- In-Memory State ---
const sessions = new Map();
const processedSessions = new Set();
let sessionCounter = 0;

// --- Express App ---
const app = express();

// Parse JSON for all routes except /mock-checkout (serves HTML)
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/mock-checkout')) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', FRONTEND_URL);
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ============================================================
// POST /create-checkout-session — validates on-chain, returns mock checkout URL
// ============================================================
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { contentId, requesterAddress } = req.body;
    if (!contentId || !requesterAddress) {
      return res.status(400).json({ error: 'Missing contentId or requesterAddress' });
    }

    const approval = await contract.getApproval(contentId);
    if (!approval.isActive) {
      return res.status(400).json({ error: 'No active approval found for this content' });
    }
    if (approval.requester.toLowerCase() !== requesterAddress.toLowerCase()) {
      return res.status(400).json({ error: 'Requester address does not match the approved requester' });
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const cooldownDuration = await contract.cooldownDuration();
    if (currentTimestamp > Number(approval.timestamp) + Number(cooldownDuration)) {
      return res.status(400).json({ error: 'Approval has expired (cooldown period elapsed)' });
    }

    const content = await contract.getContent(contentId);
    const contentTitle = content.title || contentId;
    const priceAmount = Number(approval.price);

    const sessionId = `mock_sess_${++sessionCounter}_${Date.now()}`;
    sessions.set(sessionId, {
      contentId,
      requester: requesterAddress,
      contentTitle,
      price: priceAmount,
      status: 'pending',
    });

    // Point to our local mock checkout page
    const checkoutUrl = `http://localhost:${PAYMENT_SERVER_PORT}/mock-checkout?session_id=${sessionId}`;
    console.log(`[MOCK] Created checkout session ${sessionId} for "${contentTitle}" — ₹${priceAmount}`);
    return res.json({ sessionId, checkoutUrl });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    return res.status(500).json({ error: 'Failed to create checkout session: ' + err.message });
  }
});

// ============================================================
// GET /mock-checkout — serves a local HTML payment page
// ============================================================
app.get('/mock-checkout', (req, res) => {
  const { session_id } = req.query;
  const session = sessions.get(session_id);

  if (!session) {
    return res.status(404).send('<h1>Session not found</h1>');
  }

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment — ${session.contentTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f0f3; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: white; border-radius: 16px; padding: 40px; max-width: 420px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
    .logo { text-align: center; font-size: 48px; margin-bottom: 16px; }
    h1 { text-align: center; font-size: 20px; color: #1a1a2e; margin-bottom: 8px; }
    .subtitle { text-align: center; color: #666; font-size: 14px; margin-bottom: 24px; }
    .item { display: flex; justify-content: space-between; padding: 16px; background: #f8f9fa; border-radius: 10px; margin-bottom: 20px; }
    .item-name { font-weight: 600; color: #333; }
    .item-price { font-weight: 700; color: #6366f1; font-size: 18px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 12px; color: #666; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .form-group input { width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 15px; transition: border-color 0.2s; }
    .form-group input:focus { outline: none; border-color: #6366f1; }
    .row { display: flex; gap: 12px; }
    .row .form-group { flex: 1; }
    .pay-btn { width: 100%; padding: 16px; background: linear-gradient(135deg, #6366f1, #818cf8); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 8px; transition: all 0.2s; }
    .pay-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(99,102,241,0.4); }
    .pay-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
    .cancel { display: block; text-align: center; margin-top: 16px; color: #666; text-decoration: none; font-size: 14px; }
    .cancel:hover { color: #333; }
    .badge { display: inline-block; background: #dbeafe; color: #3b82f6; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-bottom: 16px; text-align: center; width: 100%; }
    .processing { text-align: center; color: #6366f1; font-weight: 600; }
    .spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">💳</div>
    <h1>Complete Payment</h1>
    <p class="subtitle">Simulated payment gateway (Demo Mode)</p>
    <div class="badge">🔒 TEST MODE — No real money charged</div>
    <div class="item">
      <span class="item-name">${session.contentTitle}</span>
      <span class="item-price">₹${session.price}</span>
    </div>
    <div id="form-section">
      <div class="form-group">
        <label>Card Number</label>
        <input type="text" id="cardNumber" placeholder="4242 4242 4242 4242" maxlength="19" autocomplete="off" />
      </div>
      <div class="row">
        <div class="form-group">
          <label>Expiry</label>
          <input type="text" id="expiry" placeholder="MM/YY" maxlength="5" autocomplete="off" />
        </div>
        <div class="form-group">
          <label>CVC</label>
          <input type="text" id="cvc" placeholder="234" maxlength="4" autocomplete="off" />
        </div>
      </div>
      <div id="error-msg" style="display:none; background:#fef2f2; border:1px solid #fca5a5; color:#dc2626; padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:12px; text-align:center;"></div>
      <button class="pay-btn" id="payBtn" onclick="handlePay()">Pay ₹${session.price}</button>
      <a href="${FRONTEND_URL}?payment=cancelled&content_id=${session.contentId}" class="cancel">Cancel payment</a>
    </div>
    <div id="processing-section" style="display:none;">
      <p class="processing"><span class="spinner"></span> Processing payment & transferring ownership on-chain...</p>
    </div>
    <div id="declined-section" style="display:none;">
      <div style="text-align:center; padding:20px 0;">
        <div style="font-size:48px; margin-bottom:12px;">❌</div>
        <p style="color:#dc2626; font-weight:700; font-size:16px; margin-bottom:8px;">Payment Declined</p>
        <p style="color:#666; font-size:13px; margin-bottom:16px;">Your card was declined. Please check your card details and try again.</p>
        <button class="pay-btn" onclick="resetForm()" style="background:linear-gradient(135deg,#ef4444,#f87171);">Try Again</button>
      </div>
    </div>
  </div>
  <script>
    // Auto-format card number with spaces
    document.getElementById('cardNumber').addEventListener('input', function(e) {
      let v = e.target.value.replace(/\\s/g, '').replace(/\\D/g, '');
      v = v.match(/.{1,4}/g)?.join(' ') || v;
      e.target.value = v;
    });
    // Auto-format expiry
    document.getElementById('expiry').addEventListener('input', function(e) {
      let v = e.target.value.replace(/\\D/g, '');
      if (v.length >= 2) v = v.substring(0,2) + '/' + v.substring(2);
      e.target.value = v;
    });

    function showError(msg) {
      const el = document.getElementById('error-msg');
      el.textContent = msg;
      el.style.display = 'block';
      setTimeout(() => { el.style.display = 'none'; }, 4000);
    }

    function resetForm() {
      document.getElementById('declined-section').style.display = 'none';
      document.getElementById('form-section').style.display = 'block';
      document.getElementById('cardNumber').value = '';
      document.getElementById('expiry').value = '';
      document.getElementById('cvc').value = '';
      document.getElementById('payBtn').disabled = false;
    }

    async function handlePay() {
      const card = document.getElementById('cardNumber').value.replace(/\\s/g, '');
      const expiry = document.getElementById('expiry').value;
      const cvc = document.getElementById('cvc').value;

      // Validate fields are filled
      if (!card || !expiry || !cvc) { showError('Please fill in all card details.'); return; }
      if (card.length < 13) { showError('Card number is too short.'); return; }
      if (!/^\\d{2}\\/\\d{2}$/.test(expiry)) { showError('Expiry must be MM/YY format.'); return; }

      // Validate card: only 4242424242424242 with CVC 234 is accepted
      if (card !== '4242424242424242' || cvc !== '234') {
        document.getElementById('form-section').style.display = 'none';
        document.getElementById('declined-section').style.display = 'block';
        return;
      }

      document.getElementById('payBtn').disabled = true;
      document.getElementById('form-section').style.display = 'none';
      document.getElementById('processing-section').style.display = 'block';
      try {
        const resp = await fetch('http://localhost:${PAYMENT_SERVER_PORT}/mock-confirm?session_id=${session_id}', { method: 'POST' });
        const data = await resp.json();
        if (data.success) {
          window.location.href = '${FRONTEND_URL}?payment=success&session_id=${session_id}&content_id=${session.contentId}';
        } else {
          alert('Payment failed: ' + (data.error || 'Unknown error'));
          document.getElementById('form-section').style.display = 'block';
          document.getElementById('processing-section').style.display = 'none';
          document.getElementById('payBtn').disabled = false;
        }
      } catch (err) {
        alert('Error: ' + err.message);
        document.getElementById('form-section').style.display = 'block';
        document.getElementById('processing-section').style.display = 'none';
        document.getElementById('payBtn').disabled = false;
      }
    }
  </script>
</body>
</html>`);
});

// ============================================================
// POST /mock-confirm — simulates payment success + on-chain finalization
// ============================================================
app.post('/mock-confirm', express.json(), async (req, res) => {
  const { session_id } = req.query;
  const session = sessions.get(session_id);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (processedSessions.has(session_id)) {
    return res.json({ success: true, message: 'Already processed' });
  }

  try {
    console.log(`[MOCK] Payment confirmed for session ${session_id}, finalizing on-chain...`);
    const tx = await contract.finalizeTransfer(session.contentId, session.requester, { gasLimit: 500000 });
    await tx.wait();

    processedSessions.add(session_id);
    session.status = 'completed';
    console.log(`[MOCK] Transfer finalized! contentId=${session.contentId}, requester=${session.requester}`);
    return res.json({ success: true });
  } catch (err) {
    session.status = 'chain_failed';
    const reason = err.reason || err.message;
    console.error(`[MOCK] Chain finalization failed: ${reason}`);
    return res.json({ success: false, error: reason });
  }
});

// ============================================================
// GET /payment-status/:contentId/:requesterAddress
// ============================================================
app.get('/payment-status/:contentId/:requesterAddress', (req, res) => {
  const { contentId, requesterAddress } = req.params;
  let latestSession = null;
  let latestSessionId = null;

  for (const [sessionId, session] of sessions) {
    if (session.contentId === contentId && session.requester.toLowerCase() === requesterAddress.toLowerCase()) {
      latestSession = session;
      latestSessionId = sessionId;
    }
  }

  if (!latestSession) {
    return res.json({ status: 'not_found' });
  }

  return res.json({ status: latestSession.status, sessionId: latestSessionId });
});

// --- Start Server ---
app.listen(PAYMENT_SERVER_PORT, () => {
  console.log(`\n🎮 Payment server running in MOCK MODE on port ${PAYMENT_SERVER_PORT}`);
  console.log(`   No Stripe keys required — simulated checkout at localhost`);
  console.log(`   Frontend URL: ${FRONTEND_URL}\n`);
});
