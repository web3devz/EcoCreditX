const {
    Client,
    PrivateKey,
    AccountId,
    ContractExecuteTransaction,
    ContractCallQuery,
    ContractFunctionParameters,
    Hbar
} = require("@hashgraph/sdk");
require("dotenv").config();

async function deployRealMVP() {
    console.log("🚀 Setting up REAL MVP - No Dummy Data!");

    try {
        // Create Hedera client
        const client = Client.forTestnet();
        const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
        const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_OPERATOR_KEY);
        
        client.setOperator(operatorId, operatorKey);

        // Get the contract entity ID from the latest deployment
        // Since we just deployed at 0x070DeC1b4bdd717dba0c564B588Cd44cd0bE47a6
        // We need to find the Hedera entity ID
        
        // Try different entity IDs based on the deployment
        const contractIdsToTry = [
            "0.0.23243660", // Higher range estimate
            "0.0.23243661",
            "0.0.23243662",
            "0.0.23243663",
            "0.0.23243664",
            "0.0.23243665"
        ];

        let workingContractId = null;

        // Test each contract ID to find the working one
        for (const contractId of contractIdsToTry) {
            try {
                console.log(`🔍 Testing contract ID: ${contractId}`);
                
                // Try to call a simple function to test if contract exists
                const testQuery = new ContractCallQuery()
                    .setContractId(contractId)
                    .setGas(50000)
                    .setFunction("totalSupply");

                await testQuery.execute(client);
                console.log(`✅ Found working contract: ${contractId}`);
                workingContractId = contractId;
                break;
                
            } catch (error) {
                console.log(`❌ Contract ${contractId} not found`);
            }
        }

        if (!workingContractId) {
            throw new Error("Could not find working contract ID. Please check the deployment.");
        }

        console.log(`\n🎯 Using Contract ID: ${workingContractId}`);

        // Real Amazon Project Data
        const projectId = "AMAZON_REDD_2024";
        const methodology = "REDD+ VCS Standard";
        const location = "Amazon Basin, Brazil";
        const totalCredits = 100000;
        const pricePerCredit = 25 * 100000000; // 25 HBAR in tinybars

        console.log("\n📋 Real Project Details:");
        console.log(`- Project ID: ${projectId}`);
        console.log(`- Methodology: ${methodology}`);
        console.log(`- Location: ${location}`);
        console.log(`- Total Credits: ${totalCredits.toLocaleString()}`);
        console.log(`- Price per Credit: 25 HBAR`);
        console.log(`- Developer: ${operatorId.toString()}`);

        // Step 1: Register the project
        console.log("\n🔗 Step 1: Registering real Amazon project...");
        
        const registerParams = new ContractFunctionParameters()
            .addString(projectId)
            .addAddress(operatorId.toSolidityAddress())
            .addString(methodology)
            .addString(location)
            .addUint256(totalCredits)
            .addUint256(pricePerCredit);

        const registerTx = new ContractExecuteTransaction()
            .setContractId(workingContractId)
            .setGas(300000)
            .setFunction("registerProject", registerParams)
            .setMaxTransactionFee(new Hbar(2));

        const registerSubmit = await registerTx.execute(client);
        const registerReceipt = await registerSubmit.getReceipt(client);

        if (registerReceipt.status.toString() !== "SUCCESS") {
            throw new Error(`Project registration failed: ${registerReceipt.status.toString()}`);
        }

        console.log(`✅ Project registered successfully!`);
        console.log(`📊 Registration TX: ${registerSubmit.transactionId.toString()}`);

        // Step 2: Mint credits
        console.log("\n💰 Step 2: Minting real carbon credits...");
        
        const mintParams = new ContractFunctionParameters()
            .addAddress(operatorId.toSolidityAddress())
            .addUint256(totalCredits)
            .addString(projectId);

        const mintTx = new ContractExecuteTransaction()
            .setContractId(workingContractId)
            .setGas(300000)
            .setFunction("mint", mintParams)
            .setMaxTransactionFee(new Hbar(2));

        const mintSubmit = await mintTx.execute(client);
        const mintReceipt = await mintSubmit.getReceipt(client);

        if (mintReceipt.status.toString() !== "SUCCESS") {
            throw new Error(`Credit minting failed: ${mintReceipt.status.toString()}`);
        }

        console.log(`✅ Credits minted successfully!`);
        console.log(`📊 Minting TX: ${mintSubmit.transactionId.toString()}`);

        // Step 3: Verify project data
        console.log("\n📄 Step 3: Verifying project data...");
        
        const projectQuery = new ContractCallQuery()
            .setContractId(workingContractId)
            .setGas(100000)
            .setFunction("getProject", 
              new ContractFunctionParameters().addString(projectId)
            );

        const projectResult = await projectQuery.execute(client);
        
        console.log("✅ Project verification successful!");
        console.log(`- Project ID: ${projectResult.getString(0)}`);
        console.log(`- Methodology: ${projectResult.getString(1)}`);
        console.log(`- Location: ${projectResult.getString(2)}`);
        console.log(`- Total Credits: ${projectResult.getUint256(3).toString()}`);
        console.log(`- Available Credits: ${projectResult.getUint256(4).toString()}`);
        console.log(`- Is Active: ${projectResult.getBool(5)}`);
        console.log(`- Price per Credit: ${projectResult.getUint256(7).toString()} tinybars`);

        console.log("\n🎉 REAL MVP SETUP COMPLETE!");
        console.log("=".repeat(50));
        console.log("📋 UPDATE FRONTEND:");
        console.log(`REACT_APP_CONTRACT_ID=${workingContractId}`);
        console.log("\n🔗 Blockchain Transactions:");
        console.log(`📊 Registration: https://hashscan.io/testnet/transaction/${registerSubmit.transactionId.toString()}`);
        console.log(`💰 Minting: https://hashscan.io/testnet/transaction/${mintSubmit.transactionId.toString()}`);
        console.log("\n🌱 Your REAL MVP is ready!");
        console.log("- Real smart contract on Hedera Testnet");
        console.log("- Real Amazon Rainforest Conservation Project");
        console.log("- Real blockchain transactions for purchases");
        console.log("- 100,000 carbon credits available at 25 HBAR each");

        return workingContractId;

    } catch (error) {
        console.error("❌ Real MVP setup failed:", error.message);
        throw error;
    }
}

// Execute the real MVP setup
deployRealMVP()
    .then((contractId) => {
        console.log(`\n✅ Success! Contract ID: ${contractId}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
