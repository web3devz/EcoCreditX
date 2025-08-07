const hre = require("hardhat");

async function checkOwner() {
    try {
        // Get the deployed contract
        const contractAddress = "0xBEB1633C38Dc6a31fe6de754B133c17E10e0b4dd";
        const MicroCredit = await hre.ethers.getContractFactory("MicroCredit");
        const contract = MicroCredit.attach(contractAddress);

        // Get the signer address
        const [signer] = await hre.ethers.getSigners();
        const signerAddress = await signer.getAddress();
        
        // Check contract owner
        const owner = await contract.owner();
        
        console.log("📋 Contract Information:");
        console.log(`Contract Address: ${contractAddress}`);
        console.log(`Contract Owner: ${owner}`);
        console.log(`Signer Address: ${signerAddress}`);
        console.log(`Is Signer Owner: ${owner.toLowerCase() === signerAddress.toLowerCase()}`);
        
        // Check if contract is paused
        const paused = await contract.paused();
        console.log(`Contract Paused: ${paused}`);
        
    } catch (error) {
        console.error("Error checking owner:", error.message);
    }
}

checkOwner();
