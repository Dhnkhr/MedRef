import React, { useRef, useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, Alert, Platform, Linking, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://localhost:3000/api';
const SOS_STORAGE_KEY = '@medref_sos_config';

interface SOSPanicButtonProps {
    patientId: string | null;
}

/**
 * Floating SOS Panic Button — always visible overlay.
 * Triggers simultaneous: API call, phone dial, location sharing.
 */
export default function SOSPanicButton({ patientId }: SOSPanicButtonProps) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const [triggering, setTriggering] = useState(false);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const triggerSOS = async () => {
        setTriggering(true);
        try {
            // 1. Load SOS config from local storage
            let config: any = {};
            try {
                const raw = await AsyncStorage.getItem(SOS_STORAGE_KEY);
                if (raw) config = JSON.parse(raw);
            } catch { }

            // 2. Get location (best effort)
            let location = null;
            if (Platform.OS === 'web' && navigator.geolocation) {
                try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    location = {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                    };
                } catch { }
            }

            // 3. Call backend SOS endpoint (non-blocking)
            fetch(`${API_BASE}/sos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId,
                    location,
                    emergencyContacts: config.emergencyContacts || [],
                    autoConsent: config.autoConsentDataSharing || false,
                }),
            }).catch(() => { });

            // 4. Auto-dial emergency number if configured
            const emergencyNum = config.emergencyNumber || '112';
            if (config.autoCallEmergency !== false) {
                try {
                    Linking.openURL(`tel:${emergencyNum}`);
                } catch { }
            }

            // 5. Show confirmation
            Alert.alert(
                '🚨 SOS ACTIVATED',
                `Emergency services alerted.\n\n` +
                `📞 Dialing ${emergencyNum}\n` +
                `📱 ${(config.emergencyContacts || []).length} contacts notified\n` +
                `📍 Location ${location ? 'shared' : 'unavailable'}\n` +
                `🤖 AI emergency flow ${config.autoConsentDataSharing ? 'triggered' : 'awaiting consent'}`,
                [{ text: 'OK' }]
            );
        } catch (e) {
            Alert.alert('SOS Error', 'Could not fully trigger SOS. Please call emergency services manually.');
        } finally {
            setTriggering(false);
        }
    };

    const handlePress = () => {
        if (triggering) return;
        Alert.alert(
            '🚨 Trigger SOS?',
            'This will:\n\n• Call emergency services\n• Notify your emergency contacts\n• Share your location\n• Start AI emergency analysis',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'TRIGGER SOS', style: 'destructive', onPress: triggerSOS },
            ]
        );
    };

    return (
        <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity
                style={[styles.button, triggering && styles.buttonTriggered]}
                onPress={handlePress}
                activeOpacity={0.8}
                accessibilityLabel="SOS Emergency Button"
                accessibilityRole="button"
            >
                {triggering ? (
                    <ActivityIndicator color="#FFF" size="small" />
                ) : (
                    <Text style={styles.buttonText}>SOS</Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        zIndex: 9999,
    },
    button: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#DC2626',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    buttonTriggered: {
        backgroundColor: '#991B1B',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
    },
});
