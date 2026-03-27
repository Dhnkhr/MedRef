import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("TemporaryAccess", function () {
    let contract: any;

    beforeEach(async function () {
        const Factory = await ethers.getContractFactory("TemporaryAccess");
        contract = await Factory.deploy();
        await contract.waitForDeployment();
    });

    describe("grantAccess", function () {
        it("should grant temporary access and return access ID", async function () {
            const futureTime = (await time.latest()) + 3600;

            const tx = await contract.grantAccess(
                "MR-AAAA-BBBB",
                "HOSP-001",
                [1, 2, 3],
                futureTime,
                5
            );

            const receipt = await tx.wait();
            expect(receipt.status).to.equal(1);
        });

        it("should emit AccessGranted event", async function () {
            const futureTime = (await time.latest()) + 3600;

            await expect(
                contract.grantAccess("MR-AAAA-BBBB", "HOSP-001", [1], futureTime, 1)
            ).to.emit(contract, "AccessGranted");
        });

        it("should revert if expiresAt is in the past", async function () {
            const pastTime = (await time.latest()) - 1;

            await expect(
                contract.grantAccess("MR-AAAA-BBBB", "HOSP-001", [1], pastTime, 1)
            ).to.be.revertedWith("Expiry must be in the future");
        });

        it("should revert if maxUses is zero", async function () {
            const futureTime = (await time.latest()) + 3600;

            await expect(
                contract.grantAccess("MR-AAAA-BBBB", "HOSP-001", [1], futureTime, 0)
            ).to.be.revertedWith("Must allow at least one use");
        });
    });

    describe("verifyAccess", function () {
        let accessId: string;

        beforeEach(async function () {
            const futureTime = (await time.latest()) + 3600;
            const tx = await contract.grantAccess("MR-AAAA-BBBB", "HOSP-001", [1, 2], futureTime, 3);
            const receipt = await tx.wait();
            // Get the accessId from the event
            const event = receipt.logs.find((l: any) => l.fragment?.name === "AccessGranted");
            accessId = event?.args?.[0] || "";
        });

        it("should verify valid access returns true", async function () {
            const result = await contract.verifyAccess(accessId);
            expect(result.valid).to.equal(true);
            expect(result.patientId).to.equal("MR-AAAA-BBBB");
            expect(result.recordIds.length).to.equal(2);
            expect(result.usesLeft).to.equal(3);
        });

        it("should return false for non-existent access", async function () {
            const result = await contract.verifyAccess("NON-EXISTENT");
            expect(result.valid).to.equal(false);
        });
    });

    describe("useAccess", function () {
        let accessId: string;

        beforeEach(async function () {
            const futureTime = (await time.latest()) + 3600;
            const tx = await contract.grantAccess("MR-AAAA-BBBB", "HOSP-001", [1], futureTime, 2);
            const receipt = await tx.wait();
            const event = receipt.logs.find((l: any) => l.fragment?.name === "AccessGranted");
            accessId = event?.args?.[0] || "";
        });

        it("should consume one use", async function () {
            await contract.useAccess(accessId);

            const result = await contract.verifyAccess(accessId);
            expect(result.usesLeft).to.equal(1);
        });

        it("should emit AccessUsed event", async function () {
            await expect(contract.useAccess(accessId)).to.emit(contract, "AccessUsed");
        });

        it("should auto-deactivate after max uses", async function () {
            await contract.useAccess(accessId);
            await contract.useAccess(accessId);

            const result = await contract.verifyAccess(accessId);
            expect(result.valid).to.equal(false);
            expect(result.usesLeft).to.equal(0);
        });

        it("should revert when max uses exceeded", async function () {
            await contract.useAccess(accessId);
            await contract.useAccess(accessId);

            await expect(contract.useAccess(accessId)).to.be.revertedWith("Access not found or revoked");
        });
    });

    describe("revokeAccess", function () {
        let accessId: string;

        beforeEach(async function () {
            const futureTime = (await time.latest()) + 3600;
            const tx = await contract.grantAccess("MR-AAAA-BBBB", "HOSP-001", [1], futureTime, 5);
            const receipt = await tx.wait();
            const event = receipt.logs.find((l: any) => l.fragment?.name === "AccessGranted");
            accessId = event?.args?.[0] || "";
        });

        it("should revoke access immediately", async function () {
            await contract.revokeAccess(accessId);

            const result = await contract.verifyAccess(accessId);
            expect(result.valid).to.equal(false);
        });

        it("should emit AccessRevoked event", async function () {
            await expect(contract.revokeAccess(accessId)).to.emit(contract, "AccessRevoked");
        });

        it("should revert when revoking already revoked access", async function () {
            await contract.revokeAccess(accessId);
            await expect(contract.revokeAccess(accessId)).to.be.revertedWith("Access not found or already revoked");
        });
    });

    describe("getPatientGrants", function () {
        it("should return all grant IDs for a patient", async function () {
            const futureTime = (await time.latest()) + 3600;

            await contract.grantAccess("MR-AAAA-BBBB", "H1", [1], futureTime, 1);
            await contract.grantAccess("MR-AAAA-BBBB", "H2", [2], futureTime, 1);

            const grants = await contract.getPatientGrants("MR-AAAA-BBBB");
            expect(grants.length).to.equal(2);
        });

        it("should return empty for patient with no grants", async function () {
            const grants = await contract.getPatientGrants("MR-NONE-0000");
            expect(grants.length).to.equal(0);
        });
    });
});
