const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const ContentRegistry = await hre.ethers.getContractFactory("contracts/ownership.sol:ContentRegistry");
  const contentRegistry = await ContentRegistry.deploy(deployer.address); // pass authority address

  await contentRegistry.waitForDeployment();

  const deployedAddress = await contentRegistry.getAddress();
  console.log("ContentRegistry deployed to:", deployedAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});