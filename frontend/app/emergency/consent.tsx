import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, FontSizes, FontWeights, Spacing, Radius, Shadows } from '@/constants/theme';
import { router, useLocalSearchParams } from 'expo-router';
import { usePatient } from '@/hooks/use-patient';

const API_BASE = 'http://localhost:3000/api';

export default function ConsentScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const [approving, setApproving] = useState(false);
    const { patientId } = usePatient();
    const params = useLocalSearchParams<{ hospitalId?: string; summary?: string }>();

    let summary: any = null;
    try {
        summary = params.summary ? JSON.parse(params.summary) : null;
    } catch {
        summary = null;
    }

    const handleApprove = async () => {
        if (!patientId || !params.hospitalId || !summary) {
            Alert.alert('Missing Data', 'Patient ID, hospital ID, and summary are required.');
            return;
        }

        setApproving(true);
        try {
            const res = await fetch(`${API_BASE}/emergency/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId,
                    hospitalId: params.hospitalId,
                    summary: { ...summary, approved: true, approvedAt: new Date().toISOString() },
                }),
            });
            const json = await res.json();
            if (json.success) {
                Alert.alert(
                    '✅ Data Shared',
                    'Your anonymized emergency summary has been securely sent to the hospital.',
                    [{ text: 'OK', onPress: () => router.dismissAll() }]
                );
            }
        } catch {
            Alert.alert('Error', 'Could not share data. Please try again.');
        } finally {
            setApproving(false);
        }
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }, Shadows.lg]}>
                    <Text style={{ fontSize: 48, textAlign: 'center' }}>🔒</Text>
                    <Text style={[styles.title, { color: colors.text }]}>Confirm Data Sharing</Text>
                    <Text style={[styles.desc, { color: colors.textSecondary }]}>
                        You are about to share your anonymized emergency medical summary with the selected hospital.
                    </Text>

                    <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>What will be shared:</Text>
                        <Text style={[styles.infoItem, { color: colors.text }]}>• Your Patient ID (MR-xxxx-xxxx)</Text>
                        <Text style={[styles.infoItem, { color: colors.text }]}>• AI-generated medical summary</Text>
                        <Text style={[styles.infoItem, { color: colors.text }]}>• Current vitals & emergency details</Text>
                    </View>

                    <View style={[styles.infoBox, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
                        <Text style={[styles.infoLabel, { color: colors.success }]}>What will NOT be shared:</Text>
                        <Text style={[styles.infoItem, { color: colors.text }]}>• Your name, phone, or email</Text>
                        <Text style={[styles.infoItem, { color: colors.text }]}>• Full medical documents</Text>
                        <Text style={[styles.infoItem, { color: colors.text }]}>• Encryption keys</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.approveBtn, { backgroundColor: colors.success, opacity: approving ? 0.7 : 1 }]}
                        onPress={handleApprove}
                        activeOpacity={0.85}
                        disabled={approving}
                    >
                        {approving ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Text style={styles.btnText}>✓ Approve & Send</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.cancelBtn, { borderColor: colors.border }]}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', padding: Spacing.base },
    card: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl },
    title: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, textAlign: 'center', marginTop: Spacing.md },
    desc: { fontSize: FontSizes.sm, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 },
    infoBox: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, marginTop: Spacing.lg },
    infoLabel: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold, marginBottom: Spacing.sm },
    infoItem: { fontSize: FontSizes.sm, marginBottom: 4, lineHeight: 20 },
    approveBtn: { paddingVertical: Spacing.md, borderRadius: Radius.lg, alignItems: 'center', marginTop: Spacing.xl },
    btnText: { color: '#FFF', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
    cancelBtn: { paddingVertical: Spacing.md, borderRadius: Radius.lg, alignItems: 'center', marginTop: Spacing.md, borderWidth: 1 },
    cancelText: { fontSize: FontSizes.base, fontWeight: FontWeights.medium },
});
