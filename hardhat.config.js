require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    testnet: {
      url: "https://testnet.hashio.io/api",
      accounts: process.env.HEDERA_OPERATOR_KEY ? [process.env.HEDERA_OPERATOR_KEY] : [],
      chainId: 296,
      timeout: 60000,
      gas: "auto",
      gasPrice: "auto"
    },
    mainnet: {
      url: "https://mainnet.hashio.io/api",
      accounts: process.env.HEDERA_OPERATOR_KEY ? [process.env.HEDERA_OPERATOR_KEY] : [],
      chainId: 295,
      timeout: 60000,
      gas: "auto",
      gasPrice: "auto"
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
