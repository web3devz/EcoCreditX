const { Client, TopicCreateTransaction, PrivateKey, AccountId } = require('@hashgraph/sdk');
require('dotenv').config();

async function createHCSTopic() {
  try {
    console.log('🔗 Creating HCS Topic for EcoCreditX Retirement Logging...');
    
    const client = Client.forTestnet();
    const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_OPERATOR_KEY);
    
    client.setOperator(
      AccountId.fromString(process.env.HEDERA_OPERATOR_ID),
      privateKey
    );

    const transaction = new TopicCreateTransaction()
      .setTopicMemo('EcoCreditX Carbon Credit Retirement Logging Topic');

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    
    const topicId = receipt.topicId.toString();
    
    console.log('✅ HCS Topic Created Successfully!');
    console.log('📋 Topic ID:', topicId);
    console.log('🔍 HashScan:', `https://hashscan.io/testnet/topic/${topicId}`);
    console.log('💾 Update your environment variables:');
    console.log(`   HCS_TOPIC_ID=${topicId}`);
    console.log(`   Add this to your /frontend/.env.local file as:`);
    console.log(`   REACT_APP_HCS_TOPIC_ID=${topicId}`);
    
    return topicId;
  } catch (error) {
    console.error('❌ Failed to create HCS topic:', error);
    throw error;
  }
}

createHCSTopic()
  .then((topicId) => {
    console.log(`\n🎉 HCS Topic ready: ${topicId}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Topic creation failed:', error);
    process.exit(1);
  });
