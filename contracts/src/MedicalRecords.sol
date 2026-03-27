// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MedicalRecords
 * @dev Stores encrypted medical record references (IPFS hashes) on Polygon.
 *      No personal data is stored on-chain — only encrypted pointers.
 */
contract MedicalRecords {
    struct Record {
        uint256 id;
        string ipfsHash;
        string docType;
        string encKeyHash;
        uint256 timestamp;
        bool active;
    }

    uint256 private _nextId = 1;
    mapping(string => Record[]) private _patientRecords;  // patientId => records
    mapping(uint256 => string) private _recordOwner;       // recordId => patientId

    event RecordStored(uint256 indexed recordId, string patientId, string ipfsHash, uint256 timestamp);
    event RecordRevoked(uint256 indexed recordId, string patientId);

    /**
     * @dev Store a new medical record reference on-chain
     * @param patientId The patient's anonymous MedRef ID
     * @param ipfsHash The IPFS CID of the encrypted document
     * @param docType Type of document (lab_report, prescription, etc.)
     * @param encKeyHash Hash of the encryption key (for verification, not the key itself)
     */
    function storeRecord(
        string calldata patientId,
        string calldata ipfsHash,
        string calldata docType,
        string calldata encKeyHash
    ) external returns (uint256) {
        uint256 recordId = _nextId++;

        Record memory newRecord = Record({
            id: recordId,
            ipfsHash: ipfsHash,
            docType: docType,
            encKeyHash: encKeyHash,
            timestamp: block.timestamp,
            active: true
        });

        _patientRecords[patientId].push(newRecord);
        _recordOwner[recordId] = patientId;

        emit RecordStored(recordId, patientId, ipfsHash, block.timestamp);
        return recordId;
    }

    /**
     * @dev Get all records for a patient
     */
    function getRecords(string calldata patientId) external view returns (Record[] memory) {
        return _patientRecords[patientId];
    }

    /**
     * @dev Revoke (deactivate) a record
     */
    function revokeRecord(uint256 recordId) external {
        string memory patientId = _recordOwner[recordId];
        require(bytes(patientId).length > 0, "Record not found");

        Record[] storage records = _patientRecords[patientId];
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].id == recordId) {
                records[i].active = false;
                emit RecordRevoked(recordId, patientId);
                return;
            }
        }
        revert("Record not found");
    }

    /**
     * @dev Get total record count for a patient
     */
    function getRecordCount(string calldata patientId) external view returns (uint256) {
        return _patientRecords[patientId].length;
    }
}
