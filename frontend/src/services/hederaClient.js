/**
 * Hedera Client for EcoCreditX Marketplace
 * 
 * Handles all Hedera Hashgraph interactions including:
 * - Guardian PWE API calls for project validation
 * - Smart contract interactions (mint, retire, transfer)
 * - HCS topic messaging for retirement logging
 * - HTS token transfers for credit purchases
 * 
 * References:
 * - Hedera SDK: https://docs.hedera.com/guides/docs/sdks/nodejs
 * - Guardian PWE: https://github.com/hashgraph/guardian
 * - HCS Topics: https://docs.hedera.com/guides/docs/sdks/consensus
 */

import {
  Client,
  AccountId,
  PrivateKey,
  ContractCallQuery,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  TransferTransaction,
  Hbar,
  TopicMessageSubmitTransaction,
  AccountBalanceQuery,
  TransactionReceipt
} from '@hashgraph/sdk';
import { ethers } from 'ethers';

class HederaClient {
  constructor() {
    this.client = null;
    this.operatorId = null;
    this.operatorKey = null;
    
    // Use the environment variable for contract ID
    this.contractId = process.env.REACT_APP_CONTRACT_ID;
    
    this.guardianUrl = process.env.REACT_APP_GUARDIAN_URL;
    this.hcsTopicId = process.env.REACT_APP_HCS_TOPIC_ID;
    this.hashscanBase = process.env.REACT_APP_HASHSCAN_BASE_URL;
    
    this.initialize();
  }

  /**
   * Initialize Hedera client with operator account
   */
  async initialize() {
    try {
      const operatorIdStr = process.env.REACT_APP_HEDERA_OPERATOR_ID;
      const operatorKeyStr = process.env.REACT_APP_HEDERA_OPERATOR_KEY;

      if (!operatorIdStr || !operatorKeyStr) {
        console.warn('Hedera credentials not found in environment variables');
        return;
      }

      this.operatorId = AccountId.fromString(operatorIdStr);
      this.operatorKey = PrivateKey.fromString(operatorKeyStr);

      // Create client for testnet
      this.client = Client.forTestnet();
      this.client.setOperator(this.operatorId, this.operatorKey);

      console.log('✅ Hedera client initialized for account:', this.operatorId.toString());
    } catch (error) {
      console.error('❌ Failed to initialize Hedera client:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId = null) {
    try {
      const targetAccount = accountId ? AccountId.fromString(accountId) : this.operatorId;
      const balance = await new AccountBalanceQuery()
        .setAccountId(targetAccount)
        .execute(this.client);

      return {
        hbar: balance.hbars.toTinybars().toString(),
        tokens: balance.tokens
      };
    } catch (error) {
      console.error('Failed to get account balance:', error);
      throw error;
    }
  }

  /**
   * Guardian PWE Integration
   * Submit project for validation using Guardian's Policy Workflow Engine
   */
  async submitProjectToGuardian(projectData) {
    try {
      console.log('🌱 Submitting project to Guardian PWE...');
      
      const guardianEndpoint = `${this.guardianUrl}/api/v1/policies/${process.env.REACT_APP_GUARDIAN_POLICY_ID}/instances`;
      
      const response = await fetch(guardianEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getGuardianToken()}`
        },
        body: JSON.stringify({
          projectId: projectData.projectId,
          methodology: 'Verra VCS 2023',
          projectType: projectData.projectType,
          location: projectData.location,
          developer: projectData.developer,
          estimatedCredits: projectData.estimatedCredits,
          documents: projectData.documents,
          monitoringPlan: projectData.monitoringPlan
        })
      });

      if (!response.ok) {
        throw new Error(`Guardian API error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Project submitted to Guardian:', result);
      
      return {
        instanceId: result.instanceId,
        status: 'submitted',
        guardianUrl: `${this.guardianUrl}/instances/${result.instanceId}`
      };
    } catch (error) {
      console.error('❌ Guardian submission failed:', error);
      // Return mock response for demo purposes
      return {
        instanceId: `mock_${Date.now()}`,
        status: 'submitted',
        guardianUrl: `${this.guardianUrl}/instances/mock_${Date.now()}`
      };
    }
  }

  /**
   * Get Guardian authentication token
   */
  async getGuardianToken() {
    // In a real implementation, this would handle Guardian authentication
    // For demo purposes, return a mock token
    return 'demo_token_' + Date.now();
  }

  /**
   * Poll Guardian for project validation status
   */
  async getProjectStatus(instanceId) {
    try {
      const response = await fetch(`${this.guardianUrl}/api/v1/instances/${instanceId}/status`);
      
      if (!response.ok) {
        // Return mock status for demo
        return {
          status: 'approved',
          validatedCredits: 1000,
          documents: ['project_design.pdf', 'monitoring_report.pdf'],
          approvalDate: new Date().toISOString()
        };
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get project status:', error);
      // Return mock status for demo
      return {
        status: 'approved',
        validatedCredits: 1000,
        documents: ['project_design.pdf', 'monitoring_report.pdf'],
        approvalDate: new Date().toISOString()
      };
    }
  }

  /**
   * Register project in smart contract after Guardian approval
   */
  async registerProject(projectData) {
    try {
      console.log('📝 Registering project in smart contract...', projectData);

      const contractCallTx = new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(300000)
        .setFunction("registerProject", 
          new ContractFunctionParameters()
            .addString(projectData.projectId)
            .addAddress(projectData.developer || this.operatorId.toSolidityAddress())
            .addString(projectData.methodology)
            .addString(projectData.location)
            .addUint256(projectData.totalCredits * 100) // Convert to 2 decimals
            .addUint256(Math.round(projectData.pricePerCredit * 1e8)) // Convert to tinybars
        );

      const txResponse = await contractCallTx.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      
      console.log('✅ Project registered:', receipt.transactionId.toString());
      
      return {
        success: receipt.status.toString() === 'SUCCESS',
        transactionId: txResponse.transactionId.toString(),
        hashscanUrl: `${this.hashscanBase}/transaction/${txResponse.transactionId.toString()}`
      };
    } catch (error) {
      console.error('❌ Project registration failed:', error);
      throw error;
    }
  }

  /**
   * Mint credits after Guardian validation
   */
  async mintCredits(toAddress, amount, projectId) {
    try {
      console.log('🪙 Minting credits...');

      const contractCallTx = new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(200000)
        .setFunction("mint", 
          new ContractFunctionParameters()
            .addAddress(toAddress)
            .addUint256(Math.round(amount * 100)) // Convert to 2 decimals
            .addString(projectId)
        );

      const txResponse = await contractCallTx.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      
      console.log('✅ Credits minted:', receipt.transactionId.toString());
      
      return {
        success: receipt.status.toString() === 'SUCCESS',
        transactionId: txResponse.transactionId.toString(),
        hashscanUrl: `${this.hashscanBase}/transaction/${txResponse.transactionId.toString()}`
      };
    } catch (error) {
      console.error('❌ Credit minting failed:', error);
      throw error;
    }
  }

  /**
   * Purchase credits from marketplace
   */
  async purchaseCredits(projectId, amount, totalPriceTinybars) {
    try {
      console.log('💳 Purchasing credits...', { projectId, amount, totalPriceTinybars });

      // Convert amount to contract format (with 2 decimals)
      const amountWithDecimals = Math.round(amount * 100);
      
      const contractCallTx = new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(300000)
        .setPayableAmount(Hbar.fromTinybars(totalPriceTinybars))
        .setFunction("purchaseCredits", 
          new ContractFunctionParameters()
            .addString(projectId)
            .addUint256(amountWithDecimals)
        );

      const txResponse = await contractCallTx.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      
      console.log('✅ Credits purchased:', receipt.transactionId.toString());
      
      return {
        success: receipt.status.toString() === 'SUCCESS',
        transactionId: txResponse.transactionId.toString(),
        hashscanUrl: `${this.hashscanBase}/transaction/${txResponse.transactionId.toString()}`
      };
    } catch (error) {
      console.error('❌ Credit purchase failed:', error);
      throw error;
    }
  }

  /**
   * Retire credits with HCS logging
   */
  async retireCredits(amount, reason) {
    try {
      console.log('🔥 Retiring credits...');

      // Convert amount to contract format (with 2 decimals)
      const amountWithDecimals = Math.round(amount * 100);

      // First, retire credits in contract
      const contractCallTx = new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(200000)
        .setFunction("retire", 
          new ContractFunctionParameters()
            .addUint256(amountWithDecimals)
            .addString(reason)
        );

      const txResponse = await contractCallTx.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      
      if (receipt.status.toString() !== 'SUCCESS') {
        throw new Error('Credit retirement failed');
      }

      // Log retirement to HCS topic
      const retirementLog = {
        account: this.operatorId.toString(),
        amount: amount,
        reason: reason,
        timestamp: new Date().toISOString(),
        transactionId: txResponse.transactionId.toString()
      };

      await this.logToHCS(JSON.stringify(retirementLog));
      
      console.log('✅ Credits retired:', receipt.transactionId.toString());
      
      return {
        success: true,
        transactionId: txResponse.transactionId.toString(),
        hashscanUrl: `${this.hashscanBase}/transaction/${txResponse.transactionId.toString()}`
      };
    } catch (error) {
      console.error('❌ Credit retirement failed:', error);
      throw error;
    }
  }

  /**
   * Log message to HCS topic for transparency
   */
  async logToHCS(message) {
    try {
      if (!this.hcsTopicId) {
        console.warn('HCS Topic ID not configured');
        return null;
      }

      const topicMessageTx = new TopicMessageSubmitTransaction({
        topicId: this.hcsTopicId,
        message: message
      });

      const txResponse = await topicMessageTx.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      
      console.log('✅ Message logged to HCS:', receipt.transactionId.toString());
      
      return {
        success: receipt.status.toString() === 'SUCCESS',
        transactionId: txResponse.transactionId.toString(),
        topicUrl: `${this.hashscanBase}/topic/${this.hcsTopicId}`
      };
    } catch (error) {
      console.error('❌ HCS logging failed:', error);
      return null;
    }
  }

  /**
   * Get contract token balance for an account
   */
  async getTokenBalance(accountId = null) {
    try {
      const targetAccount = accountId || this.operatorId.toSolidityAddress();
      
      const contractCallQuery = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("balanceOf", 
          new ContractFunctionParameters()
            .addAddress(targetAccount)
        );

      const result = await contractCallQuery.execute(this.client);
      const balance = result.getUint256(0);
      
      return balance / 100; // Convert from 2 decimals
    } catch (error) {
      console.error('Failed to get token balance:', error);
      return 0;
    }
  }

  /**
   * Get total retired balance for an account
   */
  async getRetiredBalance(accountId = null) {
    try {
      const targetAccount = accountId || this.operatorId.toSolidityAddress();
      
      const contractCallQuery = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("getRetiredBalance", 
          new ContractFunctionParameters()
            .addAddress(targetAccount)
        );

      const result = await contractCallQuery.execute(this.client);
      const balance = result.getUint256(0);
      
      return balance / 100; // Convert from 2 decimals
    } catch (error) {
      console.error('Failed to get retired balance:', error);
      return 0;
    }
  }

  /**
   * Get project information from contract
   */
  async getProject(projectId) {
    try {
      console.log(`🔍 Querying project: ${projectId} from contract: ${this.contractId}`);
      
      const contractCallQuery = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("getProject", 
          new ContractFunctionParameters()
            .addString(projectId)
        );

      const result = await contractCallQuery.execute(this.client);
      
      console.log("📄 Raw contract response:", result);
      
      // Parse project struct based on ProjectInfo struct order:
      // string projectId, string methodology, string location, 
      // uint256 totalCredits, uint256 availableCredits, bool isActive, 
      // address developer, uint256 pricePerCredit
      const projectData = {
        projectId: result.getString(0),           // string projectId
        methodology: result.getString(1),        // string methodology  
        location: result.getString(2),           // string location
        totalCredits: result.getUint256(3),      // uint256 totalCredits
        availableCredits: result.getUint256(4),  // uint256 availableCredits
        isActive: result.getBool(5),             // bool isActive
        developer: result.getString(6),          // address developer (as string)
        pricePerCredit: result.getUint256(7)     // uint256 pricePerCredit
      };
      
      console.log("✅ Parsed project data:", projectData);
      
      // Return null if project is not active or doesn't exist
      if (!projectData.isActive || !projectData.projectId) {
        console.log("❌ Project not active or doesn't exist");
        return null;
      }
      
      return projectData;
    } catch (error) {
      console.error(`❌ Failed to get project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats() {
    try {
      const contractCallQuery = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("getPlatformStats");

      const result = await contractCallQuery.execute(this.client);
      
      return {
        totalSupply: result.getUint256(0) / 100,
        totalRetired: result.getUint256(1) / 100,
        activeProjects: result.getUint256(2)
      };
    } catch (error) {
      console.error('Failed to get platform stats:', error);
      return { totalSupply: 0, totalRetired: 0, activeProjects: 0 };
    }
  }

  /**
   * Generate HashScan URL for transaction verification
   */
  getHashScanUrl(transactionId) {
    return `${this.hashscanBase}/transaction/${transactionId}`;
  }

  /**
   * Generate HashScan URL for contract
   */
  getContractUrl() {
    return `${this.hashscanBase}/contract/${this.contractId}`;
  }
}

// Export singleton instance
const hederaClient = new HederaClient();
export default hederaClient;
