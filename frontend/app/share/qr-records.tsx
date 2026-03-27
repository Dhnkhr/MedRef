import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, FontSizes, FontWeights, Spacing, Radius, Shadows } from '@/constants/theme';
import { usePatient } from '@/hooks/use-patient';

const API_BASE = 'http://localhost:3000/api';

const DURATION_MAP: Record<string, number> = {
    '1h': 3600,
    '24h': 86400,
    '3d': 259200,
    '7d': 604800,
};

export default function QRRecordsScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const { patientId } = usePatient();

    const [duration, setDuration] = useState('24h');
    const [sharing, setSharing] = useState(false);
    const [accessId, setAccessId] = useState<string | null>(null);
    const [revoking, setRevoking] = useState(false);

    const handleGenerate = async () => {
        if (!patientId) {
            Alert.alert('Patient Required', 'Please register or log in before sharing records.');
            return;
        }

        setSharing(true);
        try {
            const res = await fetch(`${API_BASE}/qr/share-records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId,
                    documentIds: ['d1', 'd2'],
                    duration: DURATION_MAP[duration],
                    maxUses: 3,
                }),
            });
            const json = await res.json();
            if (json.success) {
                setAccessId(json.data.accessId);
                Alert.alert('✅ QR Generated', `Access ID: ${json.data.accessId}\nExpires: ${new Date(json.data.expiresAt).toLocaleString()}`);
            }
        } catch {
            Alert.alert('Error', 'Could not reach server.');
        } finally {
            setSharing(false);
        }
    };

    const handleRevoke = async () => {
        if (!accessId) return;
        setRevoking(true);
        try {
            const res = await fetch(`${API_BASE}/qr/revoke`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessId }),
            });
            const json = await res.json();
            if (json.success) {
                Alert.alert('🔒 Revoked', 'Access has been revoked successfully.');
                setAccessId(null);
            }
        } catch {
            Alert.alert('Error', 'Could not reach server.');
        } finally {
            setRevoking(false);
        }
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }, Shadows.lg]}>
                    <Text style={[styles.title, { color: colors.text }]}>Share Records</Text>
                    <Text style={[styles.sub, { color: colors.textSecondary }]}>Time-limited access via QR</Text>

                    <View style={[styles.qrPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {sharing ? (
                            <ActivityIndicator size="large" color={colors.primary} />
                        ) : (
                            <>
                                <Text style={{ fontSize: 64 }}>{accessId ? '✅' : '🔗'}</Text>
                                <Text style={[styles.qrText, { color: colors.textSecondary }]}>
                                    {accessId ? accessId.substring(0, 16) : 'Generate QR Below'}
                                </Text>
                            </>
                        )}
                    </View>

                    <Text style={[styles.durLabel, { color: colors.textSecondary }]}>ACCESS DURATION</Text>
                    <View style={styles.durRow}>
                        {['1h', '24h', '3d', '7d'].map((d) => (
                            <TouchableOpacity
                                key={d}
                                style={[styles.durBtn, { backgroundColor: duration === d ? colors.primary : colors.surface, borderColor: colors.border }]}
                                onPress={() => setDuration(d)}
                            >
                                <Text style={[styles.durText, { color: duration === d ? '#FFF' : colors.textSecondary }]}>{d}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.infoItem, { color: colors.textSecondary }]}>📄 2 documents selected</Text>
                        <Text style={[styles.infoItem, { color: colors.textSecondary }]}>🔒 Encrypted temporary key</Text>
                        <Text style={[styles.infoItem, { color: colors.textSecondary }]}>⏱️ Auto-revokes after {duration}</Text>
                        <Text style={[styles.infoItem, { color: colors.textSecondary }]}>🔗 Verified on Polygon blockchain</Text>
                    </View>

                    {!accessId ? (
                        <TouchableOpacity
                            style={[styles.generateBtn, { backgroundColor: colors.primary }]}
                            onPress={handleGenerate}
                            disabled={sharing}
                            activeOpacity={0.85}
                        >
                            {sharing ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Text style={styles.btnText}>Generate Share QR</Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.revokeBtn, { borderColor: colors.emergency }]}
                            onPress={handleRevoke}
                            disabled={revoking}
                        >
                            {revoking ? (
                                <ActivityIndicator color={colors.emergency} size="small" />
                            ) : (
                                <Text style={[styles.revokeText, { color: colors.emergency }]}>Revoke Access</Text>
                            )}
                        </TouchableOpacity>
                    )}
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
    qrPlaceholder: { width: 200, height: 200, borderRadius: Radius.xl, borderWidth: 2, borderStyle: 'dashed' as any, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
    qrText: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, marginTop: Spacing.md },
    durLabel: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold, letterSpacing: 1.2, marginBottom: Spacing.sm, alignSelf: 'flex-start' },
    durRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, width: '100%' },
    durBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1 },
    durText: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
    infoBox: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, width: '100%', marginBottom: Spacing.lg },
    infoItem: { fontSize: FontSizes.sm, marginBottom: Spacing.sm },
    generateBtn: { paddingVertical: Spacing.md, borderRadius: Radius.lg, width: '100%', alignItems: 'center' },
    btnText: { color: '#FFF', fontSize: FontSizes.base, fontWeight: FontWeights.bold },
    revokeBtn: { paddingVertical: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5, width: '100%', alignItems: 'center' },
    revokeText: { fontSize: FontSizes.base, fontWeight: FontWeights.bold },
});
