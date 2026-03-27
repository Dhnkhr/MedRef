import { Router, Request, Response } from 'express';
import { RANKING_WEIGHTS, NORMALIZATION_CONSTANTS } from '../constants/ranking';

const router = Router();

interface HospitalData {
    id: string;
    name: string;
    lat: number;
    lng: number;
    specialists: string[];
    totalBeds: number;
    availableBeds: number;
    icuBeds: number;
    availableIcu: number;
    avgWaitTime: number;
    rating: number;
    emergencyRating: number;
    hasTraumaCenter: boolean;
    hasBloodBank: boolean;
    address?: string;
    imageUrl?: string;
}

function getHospitals(): HospitalData[] {
    const raw = process.env.HOSPITAL_DATA_JSON;
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed as HospitalData[];
    } catch {
        return [];
    }
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

// GET /api/hospitals/nearby
router.get('/nearby', async (req: Request, res: Response) => {
    try {
        const hospitals = getHospitals();
        res.json({ success: true, data: hospitals });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch hospitals' });
    }
});

// POST /api/hospitals/rank
router.post('/rank', async (req: Request, res: Response) => {
    try {
        const { specialistType, patientLat, patientLng, isEmergency } = req.body;
        const hospitals = getHospitals();

        if (hospitals.length === 0) {
            return res.json({
                success: true,
                data: {
                    specialistType,
                    isEmergency: Boolean(isEmergency),
                    rankedHospitals: [],
                },
            });
        }

        const rankedHospitals = hospitals.map((h) => {
            // Distance Calculation
            const distance = (patientLat && patientLng)
                ? getDistanceFromLatLonInKm(Number(patientLat), Number(patientLng), h.lat, h.lng)
                : NORMALIZATION_CONSTANTS.MAX_DISTANCE_KM;

            // Normalize values
            const normDist = Math.max(0, 1 - (distance / NORMALIZATION_CONSTANTS.MAX_DISTANCE_KM));
            const normWait = Math.max(0, 1 - (h.avgWaitTime / NORMALIZATION_CONSTANTS.MAX_WAIT_TIME_MINS));

            let finalScore = 0;

            if (isEmergency) {
                const w = RANKING_WEIGHTS.EMERGENCY;
                const normErRating = h.emergencyRating / NORMALIZATION_CONSTANTS.MAX_RATING;
                const normIcu = h.icuBeds > 0 ? h.availableIcu / h.icuBeds : 0;

                finalScore = (w.DISTANCE * normDist) +
                    (w.EMERGENCY_RATING * normErRating) +
                    (w.AVAILABLE_ICU * normIcu) +
                    (w.WAIT_TIME * normWait) +
                    (w.TRAUMA_CENTER * (h.hasTraumaCenter ? 1 : 0)) +
                    (w.BLOOD_BANK * (h.hasBloodBank ? 1 : 0));
            } else {
                const w = RANKING_WEIGHTS.STANDARD;
                const normRating = h.rating / NORMALIZATION_CONSTANTS.MAX_RATING;
                const hasSpecialist = (specialistType && h.specialists.includes(specialistType)) ? 1 : 0;
                const normBeds = h.totalBeds > 0 ? h.availableBeds / h.totalBeds : 0;

                finalScore = (w.SPECIALIST_MATCH * hasSpecialist) +
                    (w.DISTANCE * normDist) +
                    (w.RATING * normRating) +
                    (w.AVAILABLE_BEDS * normBeds) +
                    (w.WAIT_TIME * normWait);
            }

            const scorePercentage = Math.round(finalScore * 100);

            return {
                ...h,
                score: scorePercentage,
                bedMultiplier: isEmergency && h.availableIcu > 0 ? 1.2 : (h.availableBeds > 0 ? 1.0 : 0.8),
                finalScore: Math.round(scorePercentage * (isEmergency && h.availableIcu > 0 ? 1.2 : (h.availableBeds > 0 ? 1.0 : 0.8))),
                distance: distance.toFixed(1) + ' km',
            };
        }).sort((a, b) => b.finalScore - a.finalScore);

        res.json({
            success: true,
            data: {
                specialistType,
                isEmergency: isEmergency || false,
                rankedHospitals: rankedHospitals,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Ranking failed' });
    }
});

// GET /api/hospitals/:id
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const hospital = getHospitals().find((h) => h.id === req.params.id);
        if (!hospital) {
            return res.status(404).json({ success: false, error: 'Hospital not found' });
        }
        res.json({ success: true, data: hospital });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Hospital not found' });
    }
});

// GET /api/hospitals/:id/beds
router.get('/:id/beds', async (req: Request, res: Response) => {
    try {
        const hospital = getHospitals().find((h) => h.id === req.params.id);
        if (!hospital) {
            return res.status(404).json({ success: false, error: 'Hospital not found' });
        }
        res.json({
            success: true,
            data: {
                hospitalId: hospital.id,
                generalBeds: { total: hospital.totalBeds, available: hospital.availableBeds },
                icuBeds: { total: hospital.icuBeds, available: hospital.availableIcu },
                updatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch bed data' });
    }
});

export default router;
