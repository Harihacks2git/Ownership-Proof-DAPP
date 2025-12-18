const hre = require("hardhat");

async function main() {
  const ContentRegistry = await hre.ethers.getContractFactory("ContentRegistry");
  const contentRegistry = await ContentRegistry.deploy();

  await contentRegistry.deployed();

  console.log("ContentRegistry deployed to:", contentRegistry.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 