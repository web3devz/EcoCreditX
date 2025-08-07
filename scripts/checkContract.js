const hre = require("hardhat");

async function checkContract() {
    try {
        // Get the deployed contract
        const contractAddress = "0x805D4a5C2421532227fab096B74Dc8daec810101";
        const MicroCredit = await hre.ethers.getContractFactory("MicroCredit");
        const contract = MicroCredit.attach(contractAddress);

        console.log("📋 Testing Contract Functions:");
        
        try {
            const name = await contract.name();
            console.log(`Token Name: ${name}`);
        } catch (e) {
            console.log("name() failed:", e.message);
        }
        
        try {
            const symbol = await contract.symbol();
            console.log(`Token Symbol: ${symbol}`);
        } catch (e) {
            console.log("symbol() failed:", e.message);
        }
        
        try {
            const totalSupply = await contract.totalSupply();
            console.log(`Total Supply: ${totalSupply.toString()}`);
        } catch (e) {
            console.log("totalSupply() failed:", e.message);
        }
        
        // Try to call a project directly to see if any exist
        try {
            const project = await contract.projects("TEST_PROJECT");
            console.log("Test project result:", project);
        } catch (e) {
            console.log("projects() failed:", e.message);
        }
        
        // Get the signer address
        const [signer] = await hre.ethers.getSigners();
        const signerAddress = await signer.getAddress();
        console.log(`Signer Address: ${signerAddress}`);
        
    } catch (error) {
        console.error("Error:", error.message);
    }
}

checkContract();
