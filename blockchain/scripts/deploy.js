const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  // Use random deployer account each time (0, 1, 2, etc.)
  const deployerIndex = Math.floor(Math.random() * 3);
  const deployer = signers[deployerIndex];
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy TrustFlow contract
  const TrustFlow = await ethers.getContractFactory("TrustFlow");
  const trustFlow = await TrustFlow.deploy();

  await trustFlow.waitForDeployment();

  console.log("TrustFlow deployed to:", await trustFlow.getAddress());
  
  // Seed test data using the smart contract function
  console.log("Seeding clean test data...");
  await trustFlow.seedTestData();
  
  console.log("✅ Clean test data seeded successfully!");
  
  console.log("\n🎉 Platform ready with clean sample data:");
  console.log("👥 Companies:");
  console.log("   - TechCorp Industries (Account #0)");
  console.log("   - Supply Chain Solutions (Account #1)");
  console.log("\n📦 Products:");
  console.log("   - 2 products per company (4 total)");
  console.log("   - Realistic product descriptions and pricing");
  console.log("\n🤝 Business Relationships:");
  console.log("   - 1 active supplier-buyer relationship");
  console.log("\n🏪 Spot Market:");
  console.log("   - 2 active listings");
  console.log("\n📋 Contract Address:", await trustFlow.getAddress());
  console.log("🖼️  Images: https://apricot-academic-canid-70.mypinata.cloud/ipfs/");
  console.log("\n💰 Accounts for testing:");
  console.log("   Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  console.log("   Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });