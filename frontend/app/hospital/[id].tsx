import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Linking, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, FontSizes, FontWeights, Spacing, Radius, Shadows } from '@/constants/theme';

const API_BASE = 'http://localhost:3000/api';

export default function HospitalDetail() {
    const { id } = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    const [hospital, setHospital] = useState<any>(null);
    const [beds, setBeds] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [hRes, bRes] = await Promise.all([
                    fetch(`${API_BASE}/hospitals/${id}`),
                    fetch(`${API_BASE}/hospitals/${id}/beds`),
                ]);
                const hJson = await hRes.json();
                const bJson = await bRes.json();
                if (hJson.success) setHospital(hJson.data);
                if (bJson.success) setBeds(bJson.data);
            } catch (e) {
                console.warn('Failed to fetch hospital details', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    if (loading) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
                <View style={styles.loaderWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[{ color: colors.textSecondary, marginTop: 12 }]}>Loading hospital details…</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!hospital) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
                <View style={styles.loaderWrap}>
                    <Text style={[{ color: colors.textSecondary, fontSize: FontSizes.md }]}>Hospital not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const bedRows = [
        { label: '🛏️ General', a: beds?.generalBeds?.available ?? hospital.availableBeds, t: beds?.generalBeds?.total ?? hospital.totalBeds },
        { label: '🏥 ICU', a: beds?.icuBeds?.available ?? hospital.availableIcu, t: beds?.icuBeds?.total ?? hospital.icuBeds },
    ];

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={[styles.headerCard, { backgroundColor: colors.primary }, Shadows.lg]}>
                    <Text style={styles.hName}>🏥 {hospital.name}</Text>
                    <Text style={styles.hAddr}>{hospital.address}</Text>
                    <View style={styles.hBadges}>
                        <View style={styles.hBadge}><Text style={styles.hBadgeText}>⭐ {hospital.rating}</Text></View>
                        <View style={styles.hBadge}><Text style={styles.hBadgeText}>⏱️ ~{hospital.avgWaitTime} min</Text></View>
                        {hospital.hasTraumaCenter && <View style={styles.hBadge}><Text style={styles.hBadgeText}>🚑 Trauma</Text></View>}
                        {hospital.hasBloodBank && <View style={styles.hBadge}><Text style={styles.hBadgeText}>🩸 Blood</Text></View>}
                    </View>
                </View>

                <Text style={[styles.section, { color: colors.textSecondary }]}>SPECIALISTS</Text>
                <View style={styles.specRow}>
                    {(hospital.specialists || []).map((s: string) => (
                        <View key={s} style={[styles.specChip, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.specText, { color: colors.primary }]}>{s}</Text>
                        </View>
                    ))}
                </View>

                <Text style={[styles.section, { color: colors.textSecondary }]}>BED AVAILABILITY</Text>
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }, Shadows.sm]}>
                    {bedRows.map((b) => (
                        <View key={b.label} style={styles.bedRow}>
                            <Text style={[styles.bedLabel, { color: colors.textSecondary }]}>{b.label}</Text>
                            <View style={[styles.barBg, { backgroundColor: colors.border }]}>
                                <View style={[styles.barFill, {
                                    width: `${b.t > 0 ? (b.a / b.t) * 100 : 0}%`,
                                    backgroundColor: b.a === 0 ? colors.bedNone : (b.a / b.t) > 0.5 ? colors.bedAvailable : (b.a / b.t) > 0.2 ? colors.bedLimited : colors.bedCritical
                                }]} />
                            </View>
                            <Text style={[styles.bedCount, { color: colors.text }]}>{b.a}/{b.t}</Text>
                        </View>
                    ))}
                    {beds?.updatedAt && (
                        <Text style={[styles.updatedAt, { color: colors.textSecondary }]}>
                            Updated: {new Date(beds.updatedAt).toLocaleTimeString()}
                        </Text>
                    )}
                </View>

                <View style={styles.btnRow}>
                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: colors.primary }]}
                        onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`)}
                    >
                        <Text style={styles.btnText}>📍 Navigate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: colors.accent }]}
                        onPress={() => Linking.openURL(`tel:${hospital.phone || '+91-44-28290200'}`)}
                    >
                        <Text style={styles.btnText}>📞 Call</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    scroll: { padding: Spacing.base },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerCard: { borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.xl },
    hName: { color: '#FFF', fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
    hAddr: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.sm, marginTop: Spacing.xs },
    hBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
    hBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full },
    hBadgeText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
    section: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold, letterSpacing: 1.2, marginBottom: Spacing.md },
    specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
    specChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
    specText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
    card: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, marginBottom: Spacing.xl },
    bedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
    bedLabel: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, width: 100 },
    barBg: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 5 },
    bedCount: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold, minWidth: 40, textAlign: 'right' },
    updatedAt: { fontSize: FontSizes.xs, textAlign: 'right', marginTop: Spacing.xs },
    btnRow: { flexDirection: 'row', gap: Spacing.md },
    btn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.lg, alignItems: 'center' },
    btnText: { color: '#FFF', fontSize: FontSizes.base, fontWeight: FontWeights.bold },
});
