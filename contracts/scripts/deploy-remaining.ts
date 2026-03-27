import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Already deployed MedicalRecords
const MEDICAL_RECORDS_ADDRESS = "0xa0190B97FE58F76CC4D8Ce93A4845Ff0f84044DE";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("═══════════════════════════════════════════════════════════");
    console.log("    MedRef - Deploy Remaining Contracts");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("");
    console.log("Network:", network.name);
    console.log("Deployer:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "MATIC");
    console.log("");
    console.log("MedicalRecords (already deployed):", MEDICAL_RECORDS_ADDRESS);
    console.log("");

    // ─── Deploy TemporaryAccess ──────────────────────────────────────

    console.log("[1/2] Deploying TemporaryAccess...");
    const TemporaryAccess = await ethers.getContractFactory("TemporaryAccess");
    const temporaryAccess = await TemporaryAccess.deploy();
    await temporaryAccess.waitForDeployment();
    const temporaryAccessAddress = await temporaryAccess.getAddress();
    console.log("      TemporaryAccess deployed to:", temporaryAccessAddress);

    // ─── Deploy ConsentAuditLog ──────────────────────────────────────

    console.log("[2/2] Deploying ConsentAuditLog...");
    const ConsentAuditLog = await ethers.getContractFactory("ConsentAuditLog");
    const consentAuditLog = await ConsentAuditLog.deploy();
    await consentAuditLog.waitForDeployment();
    const consentAuditLogAddress = await consentAuditLog.getAddress();
    console.log("      ConsentAuditLog deployed to:", consentAuditLogAddress);

    // ─── Save Deployment Info ────────────────────────────────────────

    const chainId = (await ethers.provider.getNetwork()).chainId;

    const deployment = {
        network: network.name,
        chainId: Number(chainId),
        deployedAt: new Date().toISOString(),
        contracts: {
            MedicalRecords: MEDICAL_RECORDS_ADDRESS,
            TemporaryAccess: temporaryAccessAddress,
            ConsentAuditLog: consentAuditLogAddress,
        },
        deployer: deployer.address,
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));

    console.log("");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("                 Deployment Complete!");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("");
    console.log("Contract Addresses:");
    console.log("  MedicalRecords:   ", MEDICAL_RECORDS_ADDRESS);
    console.log("  TemporaryAccess:  ", temporaryAccessAddress);
    console.log("  ConsentAuditLog:  ", consentAuditLogAddress);
    console.log("");
    console.log("─────────────────────────────────────────────────────────────");
    console.log("Update your backend/.env with these values:");
    console.log("─────────────────────────────────────────────────────────────");
    console.log("");
    console.log(`RECORDS_CONTRACT_ADDRESS=${MEDICAL_RECORDS_ADDRESS}`);
    console.log(`ACCESS_CONTRACT_ADDRESS=${temporaryAccessAddress}`);
    console.log(`CONSENT_CONTRACT_ADDRESS=${consentAuditLogAddress}`);
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
