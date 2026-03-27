import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import HospitalCard from '@/components/HospitalCard';

const API_BASE = 'http://localhost:3000/api';

const URGENCY_EMOJI: Record<string, string> = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    critical: '🔴',
};

const SPECIALIST_EMOJI: Record<string, string> = {
    cardiologist: '🫀',
    pulmonologist: '🫁',
    neurologist: '🧠',
    orthopedic: '🦴',
    general_physician: '🩺',
    oncologist: '🔬',
    default: '🏥',
};

export default function HospitalResults() {
    const params = useLocalSearchParams<{ specialistType?: string; urgencyLevel?: string; reasoning?: string }>();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    const specialistType = params.specialistType || 'Cardiologist';
    const urgencyLevel = params.urgencyLevel || 'medium';
    const reasoning = params.reasoning || '';

    const specEmoji = SPECIALIST_EMOJI[specialistType.toLowerCase()] || SPECIALIST_EMOJI.default;
    const urgEmoji = URGENCY_EMOJI[urgencyLevel.toLowerCase()] || '⚠️';

    const [hospitals, setHospitals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/hospitals/rank`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        specialistType,
                        isEmergency: urgencyLevel === 'critical' || urgencyLevel === 'high',
                    }),
                });
                const json = await res.json();
                if (json.success) {
                    setHospitals(json.data.rankedHospitals);
                }
            } catch (e) {
                console.warn('Failed to fetch ranked hospitals', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [specialistType, urgencyLevel]);

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={[styles.recLabel, { color: colors.primary }]}>AI Recommended</Text>
                    <Text style={[styles.specType, { color: colors.text }]}>{specEmoji} {specialistType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
                    <Text style={[styles.urgency, { color: urgencyLevel === 'critical' ? colors.emergency : colors.warning }]}>
                        {urgEmoji} Urgency: {urgencyLevel.toUpperCase()}
                    </Text>
                    {reasoning ? (
                        <Text style={[styles.reasoning, { color: colors.textSecondary }]}>{reasoning}</Text>
                    ) : null}
                </View>

                {loading ? (
                    <View style={styles.loaderWrap}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Ranking hospitals…</Text>
                    </View>
                ) : (
                    hospitals.map((h: any, i: number) => (
                        <HospitalCard
                            key={h.id}
                            id={h.id}
                            name={h.name}
                            score={h.finalScore}
                            dist={h.distance}
                            specialist={specialistType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            available={h.specialists?.includes(specialistType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}
                            wait={h.avgWaitTime}
                            icu={`${h.availableIcu}/${h.icuBeds}`}
                            general={`${h.availableBeds}/${h.totalBeds}`}
                            lat={h.lat}
                            lng={h.lng}
                            rating={h.rating}
                            rank={i + 1}
                        />
                    ))
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    scroll: { padding: Spacing.base, paddingTop: Platform.OS === 'android' ? Spacing['2xl'] : Spacing.base },
    header: { marginBottom: Spacing.xl },
    recLabel: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold, letterSpacing: 1.2 },
    specType: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, marginTop: Spacing.xs },
    urgency: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, marginTop: Spacing.xs },
    reasoning: { fontSize: FontSizes.sm, marginTop: Spacing.sm, lineHeight: 20, fontStyle: 'italic' },
    loaderWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
    loadingText: { fontSize: FontSizes.sm },
});
