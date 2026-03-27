export const RANKING_WEIGHTS = {
    EMERGENCY: {
        DISTANCE: 0.35,
        EMERGENCY_RATING: 0.25,
        AVAILABLE_ICU: 0.20,
        WAIT_TIME: 0.10,
        TRAUMA_CENTER: 0.05,
        BLOOD_BANK: 0.05
    },
    STANDARD: {
        SPECIALIST_MATCH: 0.30,
        DISTANCE: 0.25,
        RATING: 0.20,
        AVAILABLE_BEDS: 0.15,
        WAIT_TIME: 0.10
    }
};

export const NORMALIZATION_CONSTANTS = {
    MAX_DISTANCE_KM: 50,
    MAX_WAIT_TIME_MINS: 120,
    MAX_RATING: 5.0
};
