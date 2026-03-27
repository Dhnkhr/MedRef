/**
 * MedRef Type Definitions
 */

// ─── Patient ─────────────────────────────────────────────────────────────────

export interface Patient {
    id: string;                   // MR-xxxx-xxxx
    createdAt: string;
    emergencyConsent: boolean;    // Auto-share in life-threatening emergencies
    emergencyContacts: EmergencyContact[];
    sosConfig: SOSConfig;
    wearableConnected: boolean;
    wearableSource?: 'apple_watch' | 'google_fit' | 'samsung_health';
}

export interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relation: string;
    notifyViaSMS: boolean;
    notifyViaPush: boolean;
}

export interface SOSConfig {
    emergencyContacts: EmergencyContact[];
    autoCallEmergency: boolean;
    emergencyNumber: string;
    autoConsentDataSharing: boolean;
    shareLocationUntilStopped: boolean;
}

// ─── Vitals ──────────────────────────────────────────────────────────────────

export interface Vitals {
    heartRate: number | null;
    spO2: number | null;
    age: number | null;
    source: 'manual' | 'apple_watch' | 'google_fit' | 'samsung_health';
    timestamp: string;
}

export interface SymptomInput {
    description: string;
    vitals: Vitals;
    location: LocationData | null;
}

// ─── Location ────────────────────────────────────────────────────────────────

export interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    timestamp: string;
}

// ─── AI Analysis ─────────────────────────────────────────────────────────────

export interface SpecialistRecommendation {
    specialistType: string;
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
    reasoning: string;
}

// ─── Hospital ────────────────────────────────────────────────────────────────

export interface Hospital {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    distance?: number;           // km from patient
    specialists: string[];
    totalBeds: number;
    availableBeds: number;
    icuBeds: number;
    availableIcu: number;
    nicuBeds: number;
    availableNicu: number;
    ventilators: number;
    availableVentilators: number;
    operationTheaters: number;
    availableOT: number;
    emergencyBeds: number;
    availableEmergency: number;
    avgWaitTime: number;         // minutes
    rating: number;
    emergencyRating: number;
    hasTraumaCenter: boolean;
    hasBloodBank: boolean;
    estimatedCost: number;
    phone?: string;
    address: string;
    lastUpdated: string;
}

export interface RankedHospital extends Hospital {
    score: number;
    bedMultiplier: number;
    finalScore: number;
}

// ─── Bed Availability ────────────────────────────────────────────────────────

export type BedStatus = 'available' | 'limited' | 'critical' | 'none';

export interface BedCategory {
    label: string;
    icon: string;
    total: number;
    available: number;
    status: BedStatus;
}

// ─── Emergency ───────────────────────────────────────────────────────────────

export interface EmergencyInput {
    description: string;
    patientCondition: {
        conscious: boolean;
        breathing: boolean;
        bleedingSeverity: 'none' | 'minor' | 'moderate' | 'severe';
    };
    vitals: Vitals;
    inputMethod: 'text' | 'voice';
}

export interface EmergencySummary {
    patientId: string;
    generatedAt: string;
    summaryForDoctor: {
        criticalAlerts: string[];
        chronicConditions: string[];
        currentMedications: string[];
        relevantSurgicalHistory: string[];
        recentLabHighlights: string[];
        bloodGroup: string;
        currentEmergency: {
            description: string;
            condition: string;
            heartRate: number | null;
            spO2: number | null;
            urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        };
        aiRecommendation: string;
        estimatedReadTime: string;
    };
}

// ─── Documents ───────────────────────────────────────────────────────────────

export type DocumentType =
    | 'lab_report'
    | 'prescription'
    | 'discharge_summary'
    | 'xray_report'
    | 'consultation_note'
    | 'vaccination_record'
    | 'insurance_claim'
    | 'other';

export interface MedicalDocument {
    id: string;
    patientId: string;
    documentType: DocumentType;
    date: string;
    tags: string[];
    summary: string;
    extractedMedications: Medication[];
    extractedDiagnosis: string[];
    ipfsHash: string;
    encryptionKey: string;
    scannedByAI: boolean;
    aiConfidenceScore: number;
    createdAt: string;
}

export interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
}

export interface DocumentScanResult {
    documentType: DocumentType;
    date: string | null;
    diagnosis: string[];
    medications: Medication[];
    labValues: LabValue[];
    doctorName: string | null;
    hospitalName: string | null;
    keyObservations: string[];
    tags: string[];
    summary: string;
    confidenceScore: number;
}

export interface LabValue {
    testName: string;
    value: string;
    unit: string;
    normalRange: string;
    status: 'normal' | 'abnormal';
}

// ─── QR Codes ────────────────────────────────────────────────────────────────

export interface CheckInQRPayload {
    patientId: string;
    checkInType: 'emergency' | 'appointment';
    referenceId: string;
    summaryAccess: boolean;
    summaryHash?: string;
    generatedAt: string;
    expiresAt: string;
    signature: string;
}

export interface RecordShareQRPayload {
    type: 'medref_record_share';
    accessId: string;
    patientId: string;
    documents: { ipfsHash: string; type: DocumentType; date: string }[];
    temporaryDecryptionKey: string;
    expiresAt: string;
    maxUses: number;
    verificationUrl: string;
}

// ─── Sync Queue ──────────────────────────────────────────────────────────────

export type SyncActionType = 'upload_document' | 'sync_vitals' | 'emergency_share';
export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed';

export interface SyncQueueItem {
    id: string;
    actionType: SyncActionType;
    payload: string;
    createdAt: string;
    status: SyncStatus;
}

// ─── Wearable ────────────────────────────────────────────────────────────────

export interface AbnormalAlert {
    alerts: string[];
    vitals: Vitals;
    severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
