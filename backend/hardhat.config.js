// Hardhat config (CommonJS, compatible with Hardhat 2.x)
// #region agent log
fetch('http://127.0.0.1:7242/ingest/87f6bed8-7b5f-4689-9009-5582e45e6915', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'debug-session',
    runId: 'hardhat-config',
    hypothesisId: 'H1',
    location: 'hardhat.config.js:1',
    message: 'Hardhat config file loaded (CJS)',
    data: {},
    timestamp: Date.now()
  })
}).catch(() => {});
// #endregion agent log

require('@nomicfoundation/hardhat-toolbox');

/** @type import("hardhat/config").HardhatUserConfig */
module.exports = {
  solidity: '0.8.28',
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545'
    }
  }
};