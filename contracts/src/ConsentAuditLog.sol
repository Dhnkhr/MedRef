// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ConsentAuditLog
 * @dev Immutable audit trail for patient consent events in MedRef.
 *      Records when patients grant/revoke consent for data access.
 *      No personal data stored - only anonymous IDs and consent metadata.
 */
contract ConsentAuditLog {

    // ── Enums ────────────────────────────────────────────────────────

    enum ConsentType {
        EMERGENCY_ACCESS,       // Patient allows emergency data access
        RECORD_SHARE_QR,        // Patient shares records via QR
        SOS_AUTO_CONSENT,       // Patient pre-consents to SOS data sharing
        HOSPITAL_CHECK_IN,      // Patient checks in at hospital
        REVOKE_ACCESS           // Patient revokes previously granted access
    }

    enum ConsentAction {
        GRANT,
        REVOKE,
        USE,        // When consent is exercised (e.g., doctor accesses data)
        EXPIRE      // When consent naturally expires
    }

    // ── Structs ──────────────────────────────────────────────────────

    struct ConsentEvent {
        uint256 id;
        string patientId;           // MR-xxxx-xxxx format
        string accessorId;          // Hospital/doctor ID (or "EMERGENCY")
        ConsentType consentType;
        ConsentAction action;
        string referenceId;         // QR session ID, SOS ID, or access grant ID
        uint256 timestamp;
        uint256 expiresAt;          // 0 if no expiration
        string ipHash;              // Hash of requester IP (for audit, not tracking)
        string metadataHash;        // IPFS hash of additional encrypted metadata
    }

    // ── State Variables ──────────────────────────────────────────────

    uint256 private _nextEventId = 1;

    // All consent events (append-only)
    ConsentEvent[] private _allEvents;

    // Patient-specific events index
    mapping(string => uint256[]) private _patientEventIds;

    // Reference-specific events (to track usage of a specific QR/access grant)
    mapping(string => uint256[]) private _referenceEventIds;

    // ── Events ───────────────────────────────────────────────────────

    event ConsentGranted(
        uint256 indexed eventId,
        string patientId,
        string accessorId,
        ConsentType consentType,
        string referenceId,
        uint256 expiresAt,
        uint256 timestamp
    );

    event ConsentRevoked(
        uint256 indexed eventId,
        string patientId,
        string referenceId,
        uint256 timestamp
    );

    event ConsentUsed(
        uint256 indexed eventId,
        string patientId,
        string accessorId,
        string referenceId,
        uint256 timestamp
    );

    // ── Public Functions ─────────────────────────────────────────────

    /**
     * @dev Log a consent grant event
     * @param patientId The patient's anonymous MedRef ID
     * @param accessorId The hospital/doctor/entity receiving access
     * @param consentType Type of consent being granted
     * @param referenceId Reference to QR session, SOS event, or access grant
     * @param expiresAt Unix timestamp when consent expires (0 for no expiry)
     * @param ipHash Hash of requester IP for audit purposes
     * @param metadataHash IPFS hash of additional metadata
     */
    function logConsentGrant(
        string calldata patientId,
        string calldata accessorId,
        ConsentType consentType,
        string calldata referenceId,
        uint256 expiresAt,
        string calldata ipHash,
        string calldata metadataHash
    ) external returns (uint256) {
        uint256 eventId = _nextEventId++;

        ConsentEvent memory newEvent = ConsentEvent({
            id: eventId,
            patientId: patientId,
            accessorId: accessorId,
            consentType: consentType,
            action: ConsentAction.GRANT,
            referenceId: referenceId,
            timestamp: block.timestamp,
            expiresAt: expiresAt,
            ipHash: ipHash,
            metadataHash: metadataHash
        });

        _allEvents.push(newEvent);
        _patientEventIds[patientId].push(eventId);
        _referenceEventIds[referenceId].push(eventId);

        emit ConsentGranted(
            eventId,
            patientId,
            accessorId,
            consentType,
            referenceId,
            expiresAt,
            block.timestamp
        );

        return eventId;
    }

    /**
     * @dev Log a consent revocation event
     * @param patientId The patient's anonymous MedRef ID
     * @param referenceId Reference to the consent being revoked
     * @param ipHash Hash of requester IP for audit purposes
     */
    function logConsentRevoke(
        string calldata patientId,
        string calldata referenceId,
        string calldata ipHash
    ) external returns (uint256) {
        uint256 eventId = _nextEventId++;

        ConsentEvent memory newEvent = ConsentEvent({
            id: eventId,
            patientId: patientId,
            accessorId: "",
            consentType: ConsentType.REVOKE_ACCESS,
            action: ConsentAction.REVOKE,
            referenceId: referenceId,
            timestamp: block.timestamp,
            expiresAt: 0,
            ipHash: ipHash,
            metadataHash: ""
        });

        _allEvents.push(newEvent);
        _patientEventIds[patientId].push(eventId);
        _referenceEventIds[referenceId].push(eventId);

        emit ConsentRevoked(eventId, patientId, referenceId, block.timestamp);

        return eventId;
    }

    /**
     * @dev Log when consent is used (e.g., doctor accesses patient data)
     * @param patientId The patient's anonymous MedRef ID
     * @param accessorId The entity using the consent
     * @param referenceId Reference to the consent being used
     * @param ipHash Hash of requester IP for audit purposes
     */
    function logConsentUse(
        string calldata patientId,
        string calldata accessorId,
        string calldata referenceId,
        string calldata ipHash
    ) external returns (uint256) {
        uint256 eventId = _nextEventId++;

        ConsentEvent memory newEvent = ConsentEvent({
            id: eventId,
            patientId: patientId,
            accessorId: accessorId,
            consentType: ConsentType.RECORD_SHARE_QR, // Default, actual type from original grant
            action: ConsentAction.USE,
            referenceId: referenceId,
            timestamp: block.timestamp,
            expiresAt: 0,
            ipHash: ipHash,
            metadataHash: ""
        });

        _allEvents.push(newEvent);
        _patientEventIds[patientId].push(eventId);
        _referenceEventIds[referenceId].push(eventId);

        emit ConsentUsed(eventId, patientId, accessorId, referenceId, block.timestamp);

        return eventId;
    }

    // ── View Functions ───────────────────────────────────────────────

    /**
     * @dev Get all consent events for a patient
     * @param patientId The patient's anonymous MedRef ID
     */
    function getPatientConsents(string calldata patientId)
        external view returns (ConsentEvent[] memory)
    {
        uint256[] storage ids = _patientEventIds[patientId];
        ConsentEvent[] memory events = new ConsentEvent[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            events[i] = _allEvents[ids[i] - 1]; // Events are 1-indexed
        }

        return events;
    }

    /**
     * @dev Get all events for a specific reference (QR session, access grant, etc.)
     * @param referenceId The reference ID to query
     */
    function getReferenceEvents(string calldata referenceId)
        external view returns (ConsentEvent[] memory)
    {
        uint256[] storage ids = _referenceEventIds[referenceId];
        ConsentEvent[] memory events = new ConsentEvent[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            events[i] = _allEvents[ids[i] - 1];
        }

        return events;
    }

    /**
     * @dev Get total event count
     */
    function getTotalEventCount() external view returns (uint256) {
        return _allEvents.length;
    }

    /**
     * @dev Get event by ID
     * @param eventId The event ID to retrieve
     */
    function getEvent(uint256 eventId) external view returns (ConsentEvent memory) {
        require(eventId > 0 && eventId <= _allEvents.length, "Event not found");
        return _allEvents[eventId - 1];
    }

    /**
     * @dev Get patient's consent event count
     * @param patientId The patient's anonymous MedRef ID
     */
    function getPatientEventCount(string calldata patientId) external view returns (uint256) {
        return _patientEventIds[patientId].length;
    }
}
