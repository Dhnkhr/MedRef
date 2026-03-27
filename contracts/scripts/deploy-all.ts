import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentResult {
    network: string;
    chainId: number;
    deployedAt: string;
    contracts: {
        MedicalRecords: string;
        TemporaryAccess: string;
        ConsentAuditLog: string;
    };
    deployer: string;
}

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("═══════════════════════════════════════════════════════════");
    console.log("         MedRef Smart Contracts Deployment");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("");
    console.log("Network:", network.name);
    console.log("Deployer:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "MATIC");
    console.log("");

    if (balance === 0n && network.name !== "hardhat") {
        console.error("ERROR: Deployer has no funds. Get testnet MATIC from:");
        console.error("https://faucet.polygon.technology/");
        process.exit(1);
    }

    // ─── Deploy MedicalRecords ───────────────────────────────────────

    console.log("[1/3] Deploying MedicalRecords...");
    const MedicalRecords = await ethers.getContractFactory("MedicalRecords");
    const medicalRecords = await MedicalRecords.deploy();
    await medicalRecords.waitForDeployment();
    const medicalRecordsAddress = await medicalRecords.getAddress();
    console.log("      MedicalRecords deployed to:", medicalRecordsAddress);

    // ─── Deploy TemporaryAccess ──────────────────────────────────────

    console.log("[2/3] Deploying TemporaryAccess...");
    const TemporaryAccess = await ethers.getContractFactory("TemporaryAccess");
    const temporaryAccess = await TemporaryAccess.deploy();
    await temporaryAccess.waitForDeployment();
    const temporaryAccessAddress = await temporaryAccess.getAddress();
    console.log("      TemporaryAccess deployed to:", temporaryAccessAddress);

    // ─── Deploy ConsentAuditLog ──────────────────────────────────────

    console.log("[3/3] Deploying ConsentAuditLog...");
    const ConsentAuditLog = await ethers.getContractFactory("ConsentAuditLog");
    const consentAuditLog = await ConsentAuditLog.deploy();
    await consentAuditLog.waitForDeployment();
    const consentAuditLogAddress = await consentAuditLog.getAddress();
    console.log("      ConsentAuditLog deployed to:", consentAuditLogAddress);

    // ─── Save Deployment Info ────────────────────────────────────────

    const chainId = (await ethers.provider.getNetwork()).chainId;

    const deployment: DeploymentResult = {
        network: network.name,
        chainId: Number(chainId),
        deployedAt: new Date().toISOString(),
        contracts: {
            MedicalRecords: medicalRecordsAddress,
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
    console.log("  MedicalRecords:   ", medicalRecordsAddress);
    console.log("  TemporaryAccess:  ", temporaryAccessAddress);
    console.log("  ConsentAuditLog:  ", consentAuditLogAddress);
    console.log("");
    console.log("Deployment saved to:", deploymentFile);
    console.log("");
    console.log("─────────────────────────────────────────────────────────────");
    console.log("Update your backend/.env with these values:");
    console.log("─────────────────────────────────────────────────────────────");
    console.log("");
    console.log(`RECORDS_CONTRACT_ADDRESS=${medicalRecordsAddress}`);
    console.log(`ACCESS_CONTRACT_ADDRESS=${temporaryAccessAddress}`);
    console.log(`CONSENT_CONTRACT_ADDRESS=${consentAuditLogAddress}`);
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
