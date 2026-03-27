// Run: node create-wallet.js
const { Wallet } = require('ethers');

const wallet = Wallet.createRandom();

console.log('\n=== NEW WALLET CREATED ===\n');
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('\n=== IMPORTANT ===');
console.log('1. Save the private key securely - you cannot recover it!');
console.log('2. Fund this address with testnet MATIC from: https://faucet.polygon.technology/');
console.log('3. Add to contracts/.env:');
console.log(`   DEPLOYER_PRIVATE_KEY=${wallet.privateKey}`);
console.log('4. Add to backend/.env:');
console.log(`   POLYGON_PRIVATE_KEY=${wallet.privateKey}`);
console.log('\n');
