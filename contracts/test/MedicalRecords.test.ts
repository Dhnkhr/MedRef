import { expect } from "chai";
import { ethers } from "hardhat";

describe("MedicalRecords", function () {
    let contract: any;

    beforeEach(async function () {
        const Factory = await ethers.getContractFactory("MedicalRecords");
        contract = await Factory.deploy();
        await contract.waitForDeployment();
    });

    describe("storeRecord", function () {
        it("should store a medical record and return record ID", async function () {
            const tx = await contract.storeRecord(
                "MR-AAAA-BBBB",
                "QmIPFSHash123",
                "lab_report",
                "encKeyHash456"
            );

            const receipt = await tx.wait();
            expect(receipt.status).to.equal(1);

            const count = await contract.getRecordCount("MR-AAAA-BBBB");
            expect(count).to.equal(1);
        });

        it("should emit RecordStored event", async function () {
            await expect(
                contract.storeRecord("MR-AAAA-BBBB", "QmHash", "prescription", "key")
            ).to.emit(contract, "RecordStored");
        });

        it("should store multiple records for same patient", async function () {
            await contract.storeRecord("MR-1111-2222", "QmHash1", "lab_report", "key1");
            await contract.storeRecord("MR-1111-2222", "QmHash2", "prescription", "key2");
            await contract.storeRecord("MR-1111-2222", "QmHash3", "imaging", "key3");

            const count = await contract.getRecordCount("MR-1111-2222");
            expect(count).to.equal(3);
        });
    });

    describe("getRecords", function () {
        it("should return all records for a patient", async function () {
            await contract.storeRecord("MR-AAAA-BBBB", "QmHash1", "lab_report", "key1");
            await contract.storeRecord("MR-AAAA-BBBB", "QmHash2", "prescription", "key2");

            const records = await contract.getRecords("MR-AAAA-BBBB");
            expect(records.length).to.equal(2);
            expect(records[0].ipfsHash).to.equal("QmHash1");
            expect(records[0].docType).to.equal("lab_report");
            expect(records[0].active).to.equal(true);
            expect(records[1].ipfsHash).to.equal("QmHash2");
        });

        it("should return empty array for patient with no records", async function () {
            const records = await contract.getRecords("MR-NONE-0000");
            expect(records.length).to.equal(0);
        });
    });

    describe("revokeRecord", function () {
        it("should deactivate a record", async function () {
            await contract.storeRecord("MR-AAAA-BBBB", "QmHash1", "lab_report", "key1");

            await contract.revokeRecord(1);

            const records = await contract.getRecords("MR-AAAA-BBBB");
            expect(records[0].active).to.equal(false);
        });

        it("should emit RecordRevoked event", async function () {
            await contract.storeRecord("MR-AAAA-BBBB", "QmHash1", "lab_report", "key1");

            await expect(contract.revokeRecord(1)).to.emit(contract, "RecordRevoked");
        });

        it("should revert when revoking non-existent record", async function () {
            await expect(contract.revokeRecord(999)).to.be.revertedWith("Record not found");
        });

        it("should not affect other records when revoking one", async function () {
            await contract.storeRecord("MR-AAAA-BBBB", "QmHash1", "lab_report", "key1");
            await contract.storeRecord("MR-AAAA-BBBB", "QmHash2", "prescription", "key2");

            await contract.revokeRecord(1);

            const records = await contract.getRecords("MR-AAAA-BBBB");
            expect(records[0].active).to.equal(false);
            expect(records[1].active).to.equal(true);
        });
    });

    describe("getRecordCount", function () {
        it("should return 0 for unknown patient", async function () {
            const count = await contract.getRecordCount("MR-NONE-0000");
            expect(count).to.equal(0);
        });

        it("should track count including revoked records", async function () {
            await contract.storeRecord("MR-AAAA-BBBB", "QmHash1", "lab_report", "key1");
            await contract.revokeRecord(1);

            const count = await contract.getRecordCount("MR-AAAA-BBBB");
            expect(count).to.equal(1); // Revoked records still count
        });
    });
});
