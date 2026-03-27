import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius, FontSizes } from '@/constants/theme';
import { useWearable } from '@/hooks/use-wearable';

interface WearableStatusProps {
    patientId: string;
    isDark: boolean;
}

export default function WearableStatus({ patientId, isDark }: WearableStatusProps) {
    const { connected, deviceName, vitals, connect, refresh } = useWearable(patientId);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Heart rate synced pulse
    useEffect(() => {
        if (connected && vitals) {
            const bpm = vitals.heartRate;
            const duration = (60 / bpm) * 1000 / 2;
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.15, duration, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration, useNativeDriver: true }),
                ])
            ).start();
        }
        return () => { pulseAnim.stopAnimation(); pulseAnim.setValue(1); };
    }, [connected, vitals?.heartRate]);

    const cardBg = isDark ? '#1A1F2E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#111827';
    const subColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
    const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    if (!connected) {
        return (
            <TouchableOpacity
                style={[styles.connectCard, { backgroundColor: cardBg, borderColor: border }]}
                activeOpacity={0.7}
                onPress={() => connect()}
            >
                <View style={styles.connectIcon}>
                    <Ionicons name="watch-outline" size={28} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.connectTitle, { color: textColor }]}>Connect Wearable</Text>
                    <Text style={[styles.connectSub, { color: subColor }]}>Apple Watch · Fitbit · Google Fit</Text>
                </View>
                <View style={styles.connectBtn}>
                    <Text style={styles.connectBtnText}>Connect</Text>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: cardBg, borderColor: border }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.deviceInfo}>
                    <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.deviceName, { color: textColor }]}>{deviceName}</Text>
                </View>
                <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={16} color={subColor} />
                </TouchableOpacity>
            </View>

            {/* Vital Grid */}
            {vitals && (
                <View style={styles.vitalGrid}>
                    <View style={[styles.vitalCardLarge, { backgroundColor: isDark ? '#1E1028' : '#FDF2F8' }]}>
                        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                            <Ionicons name="heart" size={24} color="#EF4444" />
                        </Animated.View>
                        <Text style={[styles.vitalValue, { color: '#EF4444' }]}>{vitals.heartRate}</Text>
                        <Text style={[styles.vitalUnit, { color: subColor }]}>bpm</Text>
                    </View>

                    <View style={[styles.vitalCardLarge, { backgroundColor: isDark ? '#0F1D2E' : '#EFF6FF' }]}>
                        <Ionicons name="water" size={24} color="#3B82F6" />
                        <Text style={[styles.vitalValue, { color: '#3B82F6' }]}>{vitals.spo2}%</Text>
                        <Text style={[styles.vitalUnit, { color: subColor }]}>SpO₂</Text>
                    </View>

                    <View style={[styles.vitalCard, { backgroundColor: isDark ? '#1A1F16' : '#F0FDF4' }]}>
                        <Ionicons name="fitness" size={18} color="#10B981" />
                        <Text style={[styles.vitalValueSm, { color: textColor }]}>{vitals.bloodPressure.systolic}/{vitals.bloodPressure.diastolic}</Text>
                        <Text style={[styles.vitalUnitSm, { color: subColor }]}>mmHg</Text>
                    </View>

                    <View style={[styles.vitalCard, { backgroundColor: isDark ? '#1F1A16' : '#FFF7ED' }]}>
                        <Ionicons name="thermometer" size={18} color="#F97316" />
                        <Text style={[styles.vitalValueSm, { color: textColor }]}>{vitals.temperature}°</Text>
                        <Text style={[styles.vitalUnitSm, { color: subColor }]}>°F</Text>
                    </View>

                    <View style={[styles.vitalCard, { backgroundColor: isDark ? '#161A1F' : '#F5F3FF' }]}>
                        <Ionicons name="footsteps" size={18} color="#8B5CF6" />
                        <Text style={[styles.vitalValueSm, { color: textColor }]}>{vitals.steps.toLocaleString()}</Text>
                        <Text style={[styles.vitalUnitSm, { color: subColor }]}>steps</Text>
                    </View>

                    <View style={[styles.vitalCard, { backgroundColor: isDark ? '#161F1A' : '#ECFDF5' }]}>
                        <Ionicons name="leaf" size={18} color="#14B8A6" />
                        <Text style={[styles.vitalValueSm, { color: textColor }]}>{vitals.respiratoryRate}</Text>
                        <Text style={[styles.vitalUnitSm, { color: subColor }]}>br/min</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    connectCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12,
    },
    connectIcon: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: 'rgba(59,130,246,0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    connectTitle: { fontSize: 15, fontWeight: '600' },
    connectSub: { fontSize: 12, marginTop: 2 },
    connectBtn: {
        backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20,
    },
    connectBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    container: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    deviceInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    deviceName: { fontSize: 13, fontWeight: '600' },
    refreshBtn: { padding: 6 },
    vitalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    vitalCardLarge: {
        width: '48%', borderRadius: 16, padding: 16,
        alignItems: 'center', justifyContent: 'center', minHeight: 90,
    },
    vitalCard: {
        width: '31%', borderRadius: 12, padding: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    vitalValue: { fontSize: 28, fontWeight: '800', marginTop: 4 },
    vitalUnit: { fontSize: 11, fontWeight: '500', marginTop: 2 },
    vitalValueSm: { fontSize: 18, fontWeight: '700', marginTop: 4 },
    vitalUnitSm: { fontSize: 10, fontWeight: '500', marginTop: 1 },
});
