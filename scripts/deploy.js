const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Deploy MicroCredit contract to Hedera Testnet
 * 
 * Prerequisites:
 * 1. Set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY in .env
 * 2. Fund your Hedera testnet account with HBAR
 * 3. Run: npx hardhat run scripts/deploy.js --network testnet
 * 
 * References:
 * - Hedera Docs: https://docs.hedera.com/
 * - HashScan Testnet: https://hashscan.io/testnet
 */

async function main() {
  console.log("🚀 Deploying EcoCreditX MicroCredit Contract to Hedera Testnet...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "HBAR\n");

  if (balance < ethers.parseEther("10")) {
    console.warn("⚠️  Warning: Low balance. You may need more HBAR for deployment.");
    console.log("   Get testnet HBAR from: https://portal.hedera.com/");
  }

  // Deploy contract
  console.log("📦 Deploying MicroCredit contract...");
  
  const MicroCredit = await ethers.getContractFactory("MicroCredit");
  
  // Contract constructor parameters
  const tokenName = "EcoCreditX Micro Carbon Credits";
  const tokenSymbol = "ECCX";
  
  const contract = await MicroCredit.deploy(tokenName, tokenSymbol);
  
  console.log("⏳ Waiting for contract deployment...");
  await contract.waitForDeployment();
  
  console.log("✅ Contract deployed successfully!\n");
  
  // Contract information
  console.log("📊 Contract Details:");
  console.log("   Address:", await contract.getAddress());
  console.log("   Transaction Hash:", contract.deploymentTransaction()?.hash);
  console.log("   Token Name:", tokenName);
  console.log("   Token Symbol:", tokenSymbol);
  console.log("   Decimals: 2 (micro-credits)");
  console.log("   Max Supply: 100,000,000 credits\n");

  // Verification links
  const contractAddress = await contract.getAddress();
  console.log("🔍 Verification Links:");
  console.log("   HashScan:", `https://hashscan.io/testnet/contract/${contractAddress}`);
  console.log("   Transaction:", `https://hashscan.io/testnet/transaction/${contract.deploymentTransaction()?.hash}\n`);

  // Save contract address to .env
  console.log("💾 Update your environment variables:");
  console.log(`   CONTRACT_ID=${contractAddress}`);
  console.log(`   Add this to your /frontend/.env.local file as:`);
  console.log(`   REACT_APP_CONTRACT_ID=${contractAddress}\n`);

  // Sample project registration (optional)
  console.log("🌱 Sample Project Registration:");
  console.log("   You can now register carbon projects using the registerProject function");
  console.log("   Integration with Guardian PWE will validate projects automatically");
  
  // Test basic contract functions
  try {
    console.log("🧪 Testing basic contract functions...");
    
    const name = await contract.name();
    const symbol = await contract.symbol();
    const decimals = await contract.decimals();
    const maxSupply = await contract.MAX_SUPPLY();
    
    console.log("   ✅ Name:", name);
    console.log("   ✅ Symbol:", symbol);
    console.log("   ✅ Decimals:", decimals.toString());
    console.log("   ✅ Max Supply:", ethers.formatUnits(maxSupply, decimals), "credits");
    
  } catch (error) {
    console.log("   ⚠️  Contract function test failed:", error.message);
  }

  console.log("\n🎉 Deployment Complete!");
  console.log("\nNext Steps:");
  console.log("1. Update your frontend/.env.local with the CONTRACT_ID");
  console.log("2. Start the React app: cd frontend && npm start");
  console.log("3. Register your first carbon project through the admin panel");
  console.log("4. Verify all transactions on HashScan testnet");
  
  return contractAddress;
}

main()
  .then((contractAddress) => {
    console.log(`\n📋 Contract Address: ${contractAddress}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
