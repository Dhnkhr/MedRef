/**
 * Wearable Integration Service
 * Simulates HealthKit (iOS) / Google Fit (Android) vital sign data.
 * On web, generates realistic synthetic data for demonstration.
 * On native, would connect via expo-health / react-native-health.
 */

export interface VitalSigns {
    heartRate: number;       // bpm
    spo2: number;            // %
    bloodPressure: { systolic: number; diastolic: number };
    temperature: number;     // °F
    steps: number;
    calories: number;
    sleepHours: number;
    respiratoryRate: number; // breaths/min
    timestamp: string;
}

export interface VitalAlert {
    id: string;
    type: 'critical' | 'warning' | 'info';
    vital: string;
    message: string;
    value: number;
    normalRange: string;
    timestamp: string;
}

// Normal ranges
const RANGES = {
    heartRate: { min: 60, max: 100, critLow: 40, critHigh: 150 },
    spo2: { min: 95, max: 100, critLow: 90, critHigh: 101 },
    systolic: { min: 90, max: 120, critLow: 70, critHigh: 180 },
    diastolic: { min: 60, max: 80, critLow: 40, critHigh: 120 },
    temperature: { min: 97.0, max: 99.5, critLow: 95.0, critHigh: 104.0 },
    respiratoryRate: { min: 12, max: 20, critLow: 8, critHigh: 30 },
};

function randomInRange(min: number, max: number): number {
    return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

/** Generate realistic simulated vitals */
export function generateVitals(): VitalSigns {
    const hour = new Date().getHours();
    // Heart rate varies by time of day — kept well within 60-100 range
    const hrBase = hour >= 22 || hour < 6 ? 65 : hour >= 6 && hour < 12 ? 74 : 78;
    return {
        heartRate: Math.round(hrBase + (Math.random() - 0.5) * 12),  // ±6, stays 59-84
        spo2: Math.round(96 + Math.random() * 2.5),                  // 96-98, always safe
        bloodPressure: {
            systolic: Math.round(112 + (Math.random() - 0.5) * 14),  // 105-119
            diastolic: Math.round(72 + (Math.random() - 0.5) * 10),  // 67-77
        },
        temperature: randomInRange(97.4, 98.8),                      // well within normal
        steps: Math.round(2000 + Math.random() * 8000),
        calories: Math.round(300 + Math.random() * 1500),
        sleepHours: randomInRange(5.5, 8.5),
        respiratoryRate: Math.round(15 + (Math.random() - 0.5) * 4), // 13-17, always safe
        timestamp: new Date().toISOString(),
    };
}

/** Check vitals and return any alerts */
export function checkVitalAlerts(vitals: VitalSigns): VitalAlert[] {
    const alerts: VitalAlert[] = [];
    const now = new Date().toISOString();

    const check = (name: string, value: number, range: typeof RANGES.heartRate, unit: string) => {
        if (value <= range.critLow || value >= range.critHigh) {
            alerts.push({
                id: `alert-${name}-${Date.now()}`,
                type: 'critical',
                vital: name,
                message: `${name} is critically ${value <= range.critLow ? 'low' : 'high'}: ${value}${unit}`,
                value,
                normalRange: `${range.min}–${range.max}${unit}`,
                timestamp: now,
            });
        } else if (value < range.min || value > range.max) {
            alerts.push({
                id: `alert-${name}-${Date.now()}`,
                type: 'warning',
                vital: name,
                message: `${name} is ${value < range.min ? 'below' : 'above'} normal: ${value}${unit}`,
                value,
                normalRange: `${range.min}–${range.max}${unit}`,
                timestamp: now,
            });
        }
    };

    check('Heart Rate', vitals.heartRate, RANGES.heartRate, ' bpm');
    check('SpO₂', vitals.spo2, RANGES.spo2, '%');
    check('Systolic BP', vitals.bloodPressure.systolic, RANGES.systolic, ' mmHg');
    check('Diastolic BP', vitals.bloodPressure.diastolic, RANGES.diastolic, ' mmHg');
    check('Temperature', vitals.temperature, RANGES.temperature, '°F');
    check('Respiratory Rate', vitals.respiratoryRate, RANGES.respiratoryRate, '/min');

    return alerts;
}

/** Simulate connecting to a wearable device */
export function connectWearable(deviceType: 'apple_watch' | 'google_fit' | 'fitbit'): {
    connected: boolean; deviceName: string; lastSync: string;
} {
    return {
        connected: true,
        deviceName: deviceType === 'apple_watch' ? 'Apple Watch Series 9'
            : deviceType === 'google_fit' ? 'Google Pixel Watch 2'
                : 'Fitbit Sense 2',
        lastSync: new Date().toISOString(),
    };
}
