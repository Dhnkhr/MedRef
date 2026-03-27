// Run: node get-address.js YOUR_PRIVATE_KEY
const { Wallet } = require('ethers');

const pk = process.argv[2];
if (!pk) {
    console.log('Usage: node get-address.js YOUR_PRIVATE_KEY');
    console.log('Example: node get-address.js 0xabc123...');
    process.exit(1);
}

try {
    const wallet = new Wallet(pk.startsWith('0x') ? pk : '0x' + pk);
    console.log('\nWallet Address:', wallet.address);
    console.log('\nAdd this to your .env files:');
    console.log(`POLYGON_PRIVATE_KEY=${pk.startsWith('0x') ? pk : '0x' + pk}`);
    console.log(`DEPLOYER_PRIVATE_KEY=${pk.startsWith('0x') ? pk : '0x' + pk}`);
} catch (e) {
    console.log('Invalid private key format');
}
