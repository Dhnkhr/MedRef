import { expect } from "chai";
import { ethers } from "hardhat";

describe("ConsentAuditLog", function () {
    let contract: any;

    beforeEach(async function () {
        const Factory = await ethers.getContractFactory("ConsentAuditLog");
        contract = await Factory.deploy();
        await contract.waitForDeployment();
    });

    describe("logConsentGrant", function () {
        it("should log a consent grant event and return event ID", async function () {
            const tx = await contract.logConsentGrant(
                "MR-AAAA-BBBB",
                "HOSP-001",
                0, // EMERGENCY_ACCESS
                "REF-001",
                Math.floor(Date.now() / 1000) + 3600,
                "iphash123",
                "QmMetadataHash"
            );

            const receipt = await tx.wait();
            expect(receipt.status).to.equal(1);

            const count = await contract.getTotalEventCount();
            expect(count).to.equal(1);
        });

        it("should emit ConsentGranted event", async function () {
            const expiresAt = Math.floor(Date.now() / 1000) + 3600;

            await expect(
                contract.logConsentGrant(
                    "MR-AAAA-BBBB", "HOSP-001", 0, "REF-002", expiresAt, "ip1", "meta1"
                )
            ).to.emit(contract, "ConsentGranted");
        });

        it("should increment event IDs", async function () {
            await contract.logConsentGrant("MR-1111-2222", "H1", 0, "R1", 0, "", "");
            await contract.logConsentGrant("MR-1111-2222", "H2", 1, "R2", 0, "", "");

            const count = await contract.getTotalEventCount();
            expect(count).to.equal(2);
        });
    });

    describe("logConsentRevoke", function () {
        it("should log a revocation event", async function () {
            await contract.logConsentGrant("MR-AAAA-BBBB", "HOSP-001", 0, "REF-001", 0, "", "");
            await contract.logConsentRevoke("MR-AAAA-BBBB", "REF-001", "iphash");

            const count = await contract.getTotalEventCount();
            expect(count).to.equal(2);
        });

        it("should emit ConsentRevoked event", async function () {
            await expect(
                contract.logConsentRevoke("MR-AAAA-BBBB", "REF-001", "ip")
            ).to.emit(contract, "ConsentRevoked");
        });
    });

    describe("logConsentUse", function () {
        it("should log a consent use event", async function () {
            await contract.logConsentGrant("MR-AAAA-BBBB", "HOSP-001", 0, "REF-001", 0, "", "");
            await contract.logConsentUse("MR-AAAA-BBBB", "DOC-001", "REF-001", "ip");

            const count = await contract.getTotalEventCount();
            expect(count).to.equal(2);
        });

        it("should emit ConsentUsed event", async function () {
            await expect(
                contract.logConsentUse("MR-AAAA-BBBB", "DOC-001", "REF-001", "ip")
            ).to.emit(contract, "ConsentUsed");
        });
    });

    describe("view functions", function () {
        beforeEach(async function () {
            await contract.logConsentGrant("MR-AAAA-BBBB", "H1", 0, "R1", 0, "", "");
            await contract.logConsentGrant("MR-AAAA-BBBB", "H2", 1, "R2", 0, "", "");
            await contract.logConsentGrant("MR-CCCC-DDDD", "H1", 2, "R1", 0, "", "");
        });

        it("getPatientConsents should return events for a specific patient", async function () {
            const events = await contract.getPatientConsents("MR-AAAA-BBBB");
            expect(events.length).to.equal(2);
        });

        it("getReferenceEvents should return events for a specific reference", async function () {
            const events = await contract.getReferenceEvents("R1");
            expect(events.length).to.equal(2); // Both patients used R1
        });

        it("getEvent should return a specific event by ID", async function () {
            const event = await contract.getEvent(1);
            expect(event.patientId).to.equal("MR-AAAA-BBBB");
            expect(event.accessorId).to.equal("H1");
        });

        it("getEvent should revert for invalid ID", async function () {
            await expect(contract.getEvent(999)).to.be.revertedWith("Event not found");
        });

        it("getPatientEventCount should return correct count", async function () {
            const count = await contract.getPatientEventCount("MR-AAAA-BBBB");
            expect(count).to.equal(2);
        });
    });
});
