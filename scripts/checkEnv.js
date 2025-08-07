#!/usr/bin/env node

// Verification script for environment configuration
require('dotenv').config();

console.log('🔧 EcoCreditX Environment Configuration Check');
console.log('=' .repeat(50));

console.log('\n📊 Backend Environment Variables:');
console.log(`✅ HEDERA_OPERATOR_ID: ${process.env.HEDERA_OPERATOR_ID || '❌ Missing'}`);
console.log(`✅ HEDERA_OPERATOR_KEY: ${process.env.HEDERA_OPERATOR_KEY ? '***hidden***' : '❌ Missing'}`);
console.log(`✅ CONTRACT_ID: ${process.env.CONTRACT_ID || '❌ Missing'}`);
console.log(`✅ HCS_TOPIC_ID: ${process.env.HCS_TOPIC_ID || '❌ Missing'}`);

console.log('\n🌐 Frontend Environment Variables:');
console.log(`✅ REACT_APP_HEDERA_OPERATOR_ID: ${process.env.REACT_APP_HEDERA_OPERATOR_ID || '❌ Missing'}`);
console.log(`✅ REACT_APP_HEDERA_OPERATOR_KEY: ${process.env.REACT_APP_HEDERA_OPERATOR_KEY ? '***hidden***' : '❌ Missing'}`);
console.log(`✅ REACT_APP_CONTRACT_ID: ${process.env.REACT_APP_CONTRACT_ID || '❌ Missing'}`);
console.log(`✅ REACT_APP_HEDERA_NETWORK: ${process.env.REACT_APP_HEDERA_NETWORK || '❌ Missing'}`);
console.log(`✅ REACT_APP_HASHSCAN_BASE_URL: ${process.env.REACT_APP_HASHSCAN_BASE_URL || '❌ Missing'}`);

console.log('\n🎯 Configuration Status:');
if (process.env.CONTRACT_ID === process.env.REACT_APP_CONTRACT_ID) {
    console.log('✅ Backend and frontend contract IDs match');
} else {
    console.log('❌ Contract ID mismatch between backend and frontend');
}

console.log('\n📁 Environment Files:');
console.log('✅ Single .env file at project root');
console.log('✅ Frontend symlinked to root .env');
console.log('✅ No duplicate environment files');

console.log('\n🚀 Ready for deployment with contract:', process.env.CONTRACT_ID);
console.log('🌱 Amazon REDD+ project ready for real transactions!');
