import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Colors, FontSizes, FontWeights, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';

interface HospitalCardProps {
    id: string;
    name: string;
    score: number;
    dist: string;
    specialist?: string;
    available?: boolean;
    wait: number;
    icu: string;
    general: string;
    lat: number;
    lng: number;
    rating: number;
    rank: number;
}

export default function HospitalCard({
    id,
    name,
    score,
    dist,
    specialist,
    available,
    wait,
    icu,
    general,
    lat,
    lng,
    rating,
    rank
}: HospitalCardProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const router = useRouter();

    const navigateToMap = () => {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    };

    const navigateToDetail = () => {
        router.push(`/hospital/${id}`);
    };

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }, Shadows.md]}
            onPress={navigateToDetail}
            activeOpacity={0.8}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.rank, { backgroundColor: rank === 1 ? colors.primary : colors.surface }]}>
                    <Text style={[styles.rankText, { color: rank === 1 ? '#FFF' : colors.textSecondary }]}>#{rank}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <Text style={[styles.hName, { color: colors.text }]}>{name}</Text>
                    <Text style={[styles.hDist, { color: colors.textSecondary }]}>📍 {dist} • ⭐ {rating}</Text>
                </View>
                <View style={[styles.scoreBadge, { backgroundColor: score >= 80 ? colors.successLight : colors.warningLight }]}>
                    <Text style={[styles.scoreText, { color: score >= 80 ? colors.success : colors.warning }]}>{score}</Text>
                    <Text style={[styles.scoreLabel, { color: score >= 80 ? colors.success : colors.warning }]}>/100</Text>
                </View>
            </View>

            <View style={styles.metaRow}>
                {specialist && (
                    <View style={[styles.metaChip, { backgroundColor: available ? colors.successLight : colors.emergencyLight }]}>
                        <Text style={[styles.metaText, { color: available ? colors.success : colors.emergency }]}>
                            {specialist} {available ? '✓' : '✗'}
                        </Text>
                    </View>
                )}
                <View style={[styles.metaChip, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>⏱️ ~{wait} min</Text>
                </View>
            </View>

            <View style={styles.bedRow}>
                <View style={[styles.bedBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.bedText, { color: colors.primary }]}>🛏️ General: {general}</Text>
                </View>
                <View style={[styles.bedBadge, { backgroundColor: icu.startsWith('0') ? colors.emergencyLight : colors.warningLight }]}>
                    <Text style={[styles.bedText, { color: icu.startsWith('0') ? colors.emergency : colors.warning }]}>
                        🏥 ICU: {icu}
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.navBtn, { backgroundColor: colors.primary }]}
                onPress={navigateToMap}
                activeOpacity={0.85}
            >
                <Text style={styles.navBtnText}>📍 Navigate</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, marginBottom: Spacing.base },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    rank: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    rankText: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
    hName: { fontSize: FontSizes.md, fontWeight: FontWeights.bold },
    hDist: { fontSize: FontSizes.xs, marginTop: 2 },
    scoreBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.lg, alignItems: 'center' },
    scoreText: { fontSize: FontSizes.lg, fontWeight: FontWeights.extrabold },
    scoreLabel: { fontSize: FontSizes.xs },
    metaRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    metaChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full },
    metaText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
    bedRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    bedBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, flex: 1, alignItems: 'center' },
    bedText: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
    navBtn: { marginTop: Spacing.md, paddingVertical: Spacing.md, borderRadius: Radius.lg, alignItems: 'center' },
    navBtnText: { color: '#FFF', fontSize: FontSizes.base, fontWeight: FontWeights.bold },
});
