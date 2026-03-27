import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Platform, ActivityIndicator, Alert } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, FontSizes, FontWeights, Spacing, Radius } from '@/constants/theme';
import { router, useLocalSearchParams } from 'expo-router';
import EmergencySummaryCard from '@/components/EmergencySummaryCard';
import { usePatient } from '@/hooks/use-patient';

const API_BASE = 'http://localhost:3000/api';

export default function EmergencySummaryScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const [sharing, setSharing] = useState(false);
    const { patientId } = usePatient();
    const params = useLocalSearchParams<{ summary?: string; hospitalId?: string }>();

    let summary: any = null;
    try {
        summary = params.summary ? JSON.parse(params.summary) : null;
    } catch {
        summary = null;
    }

    const handleApproveAndSend = async () => {
        router.push({
            pathname: '/emergency/consent',
            params: {
                hospitalId: params.hospitalId || '',
                summary: summary ? JSON.stringify(summary) : '',
            },
        } as any);
    };

    const handleShareToHospital = async () => {
        if (!patientId || !summary || !params.hospitalId) {
            Alert.alert('Missing Data', 'Patient ID, hospital, and summary are required before sharing.');
            return;
        }

        setSharing(true);
        try {
            const res = await fetch(`${API_BASE}/emergency/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId,
                    hospitalId: params.hospitalId,
                    summary,
                }),
            });
            const json = await res.json();
            if (json.success) {
                Alert.alert('✅ Shared', 'Summary sent to hospital successfully.');
            }
        } catch {
            Alert.alert('Error', 'Could not share summary with hospital.');
        } finally {
            setSharing(false);
        }
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {summary ? (
                    <EmergencySummaryCard summary={summary} />
                ) : (
                    <View style={[styles.shareBtn, { borderColor: colors.cardBorder }]}> 
                        <Text style={[styles.shareBtnText, { color: colors.textSecondary }]}>No emergency summary available.</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.approveBtn, { backgroundColor: colors.success }]}
                    onPress={handleApproveAndSend}
                    activeOpacity={0.85}
                    disabled={!summary}
                >
                    <Text style={styles.approveBtnText}>✓ Approve & Send to Hospital</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.shareBtn, { borderColor: colors.primary }]}
                    onPress={handleShareToHospital}
                    activeOpacity={0.85}
                    disabled={sharing}
                >
                    {sharing ? (
                        <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                        <Text style={[styles.shareBtnText, { color: colors.primary }]}>📤 Quick Share via WebSocket</Text>
                    )}
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    scroll: { padding: Spacing.base },
    approveBtn: { paddingVertical: Spacing.lg, borderRadius: Radius.xl, alignItems: 'center' },
    approveBtnText: { color: '#FFF', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
    shareBtn: { paddingVertical: Spacing.md, borderRadius: Radius.xl, alignItems: 'center', marginTop: Spacing.md, borderWidth: 1.5 },
    shareBtnText: { fontSize: FontSizes.base, fontWeight: FontWeights.bold },
});
