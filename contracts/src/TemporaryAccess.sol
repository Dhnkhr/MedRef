// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TemporaryAccess
 * @dev Manages time-limited, use-limited access to medical records on Polygon.
 *      Used for QR-based record sharing between patients and hospitals/doctors.
 */
contract TemporaryAccess {
    struct Access {
        string accessId;
        string patientId;
        string accessorId;
        uint256[] recordIds;
        uint256 grantedAt;
        uint256 expiresAt;
        uint256 maxUses;
        uint256 usesCount;
        bool active;
    }

    mapping(string => Access) private _accessGrants;  // accessId => Access
    mapping(string => string[]) private _patientGrants; // patientId => accessIds

    event AccessGranted(string accessId, string patientId, uint256 expiresAt);
    event AccessUsed(string accessId, uint256 usesRemaining);
    event AccessRevoked(string accessId);

    /**
     * @dev Grant temporary access to specific records
     * @param patientId Patient granting access
     * @param accessorId Hospital/doctor receiving access
     * @param recordIds Array of record IDs to share
     * @param expiresAt Unix timestamp when access expires
     * @param maxUses Maximum number of times access can be used
     */
    function grantAccess(
        string calldata patientId,
        string calldata accessorId,
        uint256[] calldata recordIds,
        uint256 expiresAt,
        uint256 maxUses
    ) external returns (string memory) {
        require(expiresAt > block.timestamp, "Expiry must be in the future");
        require(maxUses > 0, "Must allow at least one use");

        string memory accessId = string(
            abi.encodePacked("ACC-", _uint2str(block.timestamp), "-", _uint2str(recordIds.length))
        );

        Access storage g = _accessGrants[accessId];
        g.accessId = accessId;
        g.patientId = patientId;
        g.accessorId = accessorId;
        g.recordIds = recordIds;
        g.grantedAt = block.timestamp;
        g.expiresAt = expiresAt;
        g.maxUses = maxUses;
        g.usesCount = 0;
        g.active = true;

        _patientGrants[patientId].push(accessId);

        emit AccessGranted(accessId, patientId, expiresAt);
        return accessId;
    }

    /**
     * @dev Verify if access is still valid
     */
    function verifyAccess(string calldata accessId) external view returns (
        bool valid,
        string memory patientId,
        uint256[] memory recordIds,
        uint256 expiresAt,
        uint256 usesLeft
    ) {
        Access storage g = _accessGrants[accessId];
        bool isValid = g.active &&
                       block.timestamp < g.expiresAt &&
                       g.usesCount < g.maxUses;
        return (
            isValid,
            g.patientId,
            g.recordIds,
            g.expiresAt,
            g.maxUses - g.usesCount
        );
    }

    /**
     * @dev Use (consume) one access attempt
     */
    function useAccess(string calldata accessId) external returns (bool) {
        Access storage g = _accessGrants[accessId];
        require(g.active, "Access not found or revoked");
        require(block.timestamp < g.expiresAt, "Access expired");
        require(g.usesCount < g.maxUses, "Max uses exceeded");

        g.usesCount++;
        uint256 remaining = g.maxUses - g.usesCount;

        emit AccessUsed(accessId, remaining);

        if (remaining == 0) {
            g.active = false;
        }

        return true;
    }

    /**
     * @dev Revoke access immediately
     */
    function revokeAccess(string calldata accessId) external {
        Access storage g = _accessGrants[accessId];
        require(g.active, "Access not found or already revoked");
        g.active = false;
        emit AccessRevoked(accessId);
    }

    /**
     * @dev Get all access grants for a patient
     */
    function getPatientGrants(string calldata patientId) external view returns (string[] memory) {
        return _patientGrants[patientId];
    }

    // ── Internal helper ─────────────────────────────────────────────

    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 length;
        while (j != 0) { length++; j /= 10; }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (_i != 0) { k--; bstr[k] = bytes1(uint8(48 + _i % 10)); _i /= 10; }
        return string(bstr);
    }
}
