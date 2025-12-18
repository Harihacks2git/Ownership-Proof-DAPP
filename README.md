# Ownershipproof_DApp


This project demonstrates a Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```


## Added files
- backend/contracts/ownership.sol (updated with authority and history)
- authority-server.js (node authority service)
- indexer.js (event indexer writes to event_db.json)
- .env.example (env vars for services)

Follow README to deploy contract and run authority-service and indexer.
