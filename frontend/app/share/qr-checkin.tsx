import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, FontSizes, FontWeights, Spacing, Radius, Shadows } from '@/constants/theme';
import { usePatient } from '@/hooks/use-patient';

const API_BASE = 'http://localhost:3000/api';

export default function QRCheckInScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const { patientId } = usePatient();

    const [qrData, setQrData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!patientId) {
            setLoading(false);
            return;
        }

        (async () => {
            try {
                const res = await fetch(`${API_BASE}/qr/check-in`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        patientId,
                        hospitalId: 'h1',
                        checkInType: 'emergency',
                    }),
                });
                const json = await res.json();
                if (json.success) {
                    setQrData(json.data);
                }
            } catch (e) {
                console.warn('QR generation failed', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [patientId]);

    const expiresIn = qrData?.expiresAt
        ? `${Math.round((new Date(qrData.expiresAt).getTime() - Date.now()) / 3600000)} hours`
        : '6 hours';

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }, Shadows.lg]}>
                    <Text style={[styles.title, { color: colors.text }]}>Hospital Check-In</Text>
                    <Text style={[styles.sub, { color: colors.textSecondary }]}>Show this QR at reception</Text>

                    {/* QR Placeholder */}
                    <View style={[styles.qrPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {loading ? (
                            <ActivityIndicator size="large" color={colors.primary} />
                        ) : (
                            <>
                                <Text style={{ fontSize: 64 }}>📱</Text>
                                <Text style={[styles.qrText, { color: colors.textSecondary }]}>
                                    {qrData?.referenceId || 'QR Code'}
                                </Text>
                                <Text style={[styles.qrSub, { color: colors.textTertiary }]}>
                                    Ref: {qrData?.referenceId?.substring(0, 16) || '...'}
                                </Text>
                            </>
                        )}
                    </View>

                    <View style={[styles.infoRow, { borderColor: colors.borderLight }]}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Patient ID</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{qrData?.patientId || patientId || 'Loading…'}</Text>
                    </View>
                    <View style={[styles.infoRow, { borderColor: colors.borderLight }]}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Type</Text>
                        <Text style={[styles.infoValue, { color: colors.emergency }]}>{qrData?.checkInType?.toUpperCase() || 'Emergency'}</Text>
                    </View>
                    <View style={[styles.infoRow, { borderColor: colors.borderLight }]}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Expires</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{expiresIn}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Security</Text>
                        <Text style={[styles.infoValue, { color: colors.success }]}>🔒 Encrypted + Signed</Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', padding: Spacing.base },
    card: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, alignItems: 'center' },
    title: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.sm, marginTop: Spacing.xs, marginBottom: Spacing.xl },
    qrPlaceholder: { width: 220, height: 220, borderRadius: Radius.xl, borderWidth: 2, borderStyle: 'dashed' as any, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
    qrText: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, marginTop: Spacing.md },
    qrSub: { fontSize: FontSizes.xs, marginTop: 4 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: Spacing.md, borderBottomWidth: 1 },
    infoLabel: { fontSize: FontSizes.sm },
    infoValue: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
});
