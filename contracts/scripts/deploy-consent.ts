import { ethers, network } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying ConsentAuditLog...");
    console.log("Deployer:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "MATIC\n");

    const ConsentAuditLog = await ethers.getContractFactory("ConsentAuditLog");
    const consentAuditLog = await ConsentAuditLog.deploy();
    await consentAuditLog.waitForDeployment();
    const address = await consentAuditLog.getAddress();

    console.log("✅ ConsentAuditLog deployed to:", address);
    console.log("\nAdd to backend/.env:");
    console.log(`CONSENT_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
