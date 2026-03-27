/**
 * Hospital Ranking Weights & Bed Availability Multipliers
 */

// ─── Normal (Specialist) Ranking Weights ─────────────────────────────────────

export const SPECIALIST_WEIGHTS = {
    specialistAvailability: 0.25,
    distance: 0.20,
    infrastructure: 0.20,
    waitTime: 0.15,
    rating: 0.10,
    cost: 0.10,
} as const;

// ─── Emergency Ranking Weights ───────────────────────────────────────────────

export const EMERGENCY_WEIGHTS = {
    icuAvailability: 0.30,
    surgeonAvailability: 0.25,
    distance: 0.20,
    equipment: 0.15,
    successRate: 0.10,
} as const;

// ─── Bed Availability Multipliers ────────────────────────────────────────────

export const BED_MULTIPLIERS = {
    high: 1.0,      // > 50% available
    medium: 0.8,    // 20-50% available
    low: 0.5,       // < 20% available
    none: 0.1,      // 0 available (still listed, but deprioritized)
} as const;

// ─── Bed Availability Thresholds ─────────────────────────────────────────────

export const BED_THRESHOLDS = {
    highPercentage: 50,    // > 50% = green
    mediumPercentage: 20,  // 20-50% = yellow
    // < 20% = red, 0 = black
} as const;

// ─── Abnormal Vital Thresholds ───────────────────────────────────────────────

export const VITAL_THRESHOLDS = {
    heartRate: {
        min: 45,
        max: 150,
        criticalMin: 40,
        criticalMax: 160,
        unit: 'BPM',
        normalRange: '60-100',
    },
    spO2: {
        min: 90,
        criticalMin: 85,
        unit: '%',
        normalRange: '95-100',
    },
} as const;

// ─── SOS Auto-Trigger Thresholds (from wearable) ────────────────────────────

export const AUTO_SOS_TRIGGERS = {
    heartRateHigh: 160,        // > 160 BPM for 2 min
    heartRateLow: 40,          // < 40 BPM for 2 min
    heartRateDurationMs: 120000,
    spO2Low: 85,               // < 85% for 1 min
    spO2DurationMs: 60000,
} as const;

// ─── QR Code Defaults ────────────────────────────────────────────────────────

export const QR_DEFAULTS = {
    checkInExpiryHours: 6,
    recordShareMinHours: 1,
    recordShareMaxDays: 7,
} as const;

// ─── Cache & Sync ────────────────────────────────────────────────────────────

export const SYNC_CONFIG = {
    hospitalCacheIntervalMs: 30 * 60 * 1000,   // 30 minutes
    locationChangeThresholdKm: 5,               // Re-sync if moved >5km
    locationShareIntervalMs: 10 * 1000,         // SOS location updates every 10s
} as const;
