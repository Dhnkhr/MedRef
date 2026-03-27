import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, SafeAreaView,
    TouchableOpacity, TextInput, Animated, Platform, StatusBar, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FontSizes, FontWeights, Spacing, Radius } from '@/constants/theme';
import { router } from 'expo-router';
import { usePatient } from '@/hooks/use-patient';
import { useWearable } from '@/hooks/use-wearable';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://localhost:3000/api';
const SOS_STORAGE_KEY = '@medref_sos_config';

const CONDITIONS = [
    { id: 'conscious', label: 'Conscious' },
    { id: 'breathing', label: 'Breathing' },
];
const BLEEDING = ['None', 'Minor', 'Moderate', 'Severe'];
const BLEEDING_COLORS = ['#10B981', '#F59E0B', '#F97316', '#EF4444'];

export default function EmergencyScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const isDark = colorScheme === 'dark';

    const [description, setDescription] = useState('');
    const [conscious, setConscious] = useState(true);
    const [breathing, setBreathing] = useState(true);
    const [bleeding, setBleeding] = useState(0);
    const [heartRate, setHeartRate] = useState('');
    const [spO2, setSpO2] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [sosTriggering, setSosTriggering] = useState(false);
    const [listening, setListening] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('');
    const [sosConfig, setSosConfig] = useState<any>({});
    const { patientId } = usePatient();
    const wearable = useWearable(patientId || undefined);
    const recognitionRef = useRef<any>(null);

    // Load SOS config from AsyncStorage
    useEffect(() => {
        const loadSOSConfig = async () => {
            try {
                const raw = await AsyncStorage.getItem(SOS_STORAGE_KEY);
                if (raw) setSosConfig(JSON.parse(raw));
            } catch { }
        };
        loadSOSConfig();
    }, []);

    // Auto-fill vitals from wearable
    useEffect(() => {
        if (wearable.connected && wearable.vitals) {
            setHeartRate(String(wearable.vitals.heartRate));
            setSpO2(String(wearable.vitals.spo2));
        }
    }, [wearable.connected, wearable.vitals?.heartRate, wearable.vitals?.spo2]);

    const emergencyBlink = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(emergencyBlink, { toValue: 0.3, duration: 500, useNativeDriver: true }),
                Animated.timing(emergencyBlink, { toValue: 1, duration: 500, useNativeDriver: true }),
            ])
        ).start();

        return () => {
            try { recognitionRef.current?.stop(); } catch { }
        };
    }, []);

    const toggleVoice = () => {
        if (Platform.OS !== 'web') {
            Alert.alert('Voice Input', 'Voice capture is available in web mode only.');
            return;
        }

        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) {
            Alert.alert('Voice Input', 'Speech recognition is not supported in this browser.');
            return;
        }

        if (listening) {
            try { recognitionRef.current?.stop(); } catch { }
            setListening(false);
            setVoiceStatus('');
            return;
        }

        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';

        recognition.onstart = () => {
            setListening(true);
            setVoiceStatus('Listening...');
        };

        recognition.onresult = (event: any) => {
            let text = '';
            for (let i = 0; i < event.results.length; i++) {
                text += event.results[i][0].transcript + ' ';
            }
            setDescription(text.trim());
        };

        recognition.onerror = () => {
            setListening(false);
            setVoiceStatus('');
        };

        recognition.onend = () => {
            setListening(false);
            setVoiceStatus('');
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch {
            setListening(false);
            setVoiceStatus('');
        }
    };

    const triggerFullSOS = async () => {
        setSosTriggering(true);
        try {
            // Get location (best effort)
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

            const emergencyNum = sosConfig.emergencyNumber || '112';
            const emergencyContacts = sosConfig.emergencyContacts || [];

            // Call backend SOS endpoint (non-blocking)
            fetch(`${API_BASE}/sos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId,
                    location,
                    emergencyContacts,
                    autoConsent: sosConfig.autoConsentDataSharing || false,
                }),
            }).catch(() => { });

            // Auto-dial emergency number if configured
            if (sosConfig.autoCallEmergency !== false) {
                try {
                    Linking.openURL(`tel:${emergencyNum}`);
                } catch { }
            }

            // Show comprehensive confirmation
            Alert.alert(
                '🚨 SOS ACTIVATED',
                `Emergency services alerted.\n\n` +
                `📞 Dialing ${emergencyNum}\n` +
                `📱 ${emergencyContacts.length} contacts notified\n` +
                `📍 Location ${location ? 'shared' : 'unavailable'}\n` +
                `🤖 AI emergency flow ${sosConfig.autoConsentDataSharing ? 'triggered' : 'awaiting consent'}`,
                [{ text: 'OK' }]
            );
        } catch (e) {
            Alert.alert('SOS Error', 'Could not fully trigger SOS. Please call emergency services manually.');
        } finally {
            setSosTriggering(false);
        }
    };

    const handleSOSPress = () => {
        if (sosTriggering) return;
        Alert.alert(
            '🚨 Trigger SOS?',
            'This will:\n\n• Call emergency services\n• Notify your emergency contacts\n• Share your location\n• Start AI emergency analysis',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'TRIGGER SOS', style: 'destructive', onPress: triggerFullSOS },
            ]
        );
    };

    const bg = isDark ? '#0C0F1A' : '#FFF5F5';
    const cardBg = isDark ? '#1A1F2E' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.12)';
    const subColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Header ── */}
                <View style={styles.headerRow}>
                    <View>
                        <View style={styles.titleRow}>
                            <Animated.View style={[styles.emergDot, { opacity: emergencyBlink, backgroundColor: '#EF4444' }]} />
                            <Text style={[styles.title, { color: '#EF4444' }]}>Emergency</Text>
                        </View>
                        <Text style={[styles.sub, { color: subColor }]}>Describe the situation clearly</Text>
                    </View>
                    <TouchableOpacity style={styles.sosBadge} activeOpacity={0.85}
                        onPress={handleSOSPress}
                    >
                        {sosTriggering ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.sosText}>SOS</Text>}
                    </TouchableOpacity>
                </View>

                {/* ── Input Area ── */}
                <View style={[styles.inputCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    <View style={styles.inputHeaderRow}>
                        <Text style={[styles.inputLabel, { color: subColor, marginBottom: 0 }]}>What happened?</Text>
                    </View>
                    <TextInput
                        style={[styles.inputField, { color: isDark ? '#FFFFFF' : '#111827' }]}
                        placeholder="e.g., severe chest pain, accident, breathing difficulty..."
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)'}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        value={description}
                        onChangeText={setDescription}
                    />
                    <View style={styles.voiceActionRow}>
                        <TouchableOpacity
                            style={[styles.inlineVoicePill, listening && styles.inlineVoicePillActive]}
                            onPress={toggleVoice}
                            activeOpacity={0.8}
                        >
                            <Ionicons name={listening ? 'stop' : 'mic'} size={18} color="#EF4444" />
                            <Text style={styles.inlineVoiceText}>{listening ? 'Stop Voice' : 'Voice Input'}</Text>
                        </TouchableOpacity>
                    </View>
                    {voiceStatus ? <Text style={[styles.voiceHint, { color: subColor }]}>{voiceStatus}</Text> : null}
                </View>

                {/* ── Patient Condition ── */}
                <View style={[styles.condCard, { backgroundColor: cardBg, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                    <Text style={[styles.condTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>Patient Condition</Text>
                    {CONDITIONS.map((c) => {
                        const val = c.id === 'conscious' ? conscious : breathing;
                        const set = c.id === 'conscious' ? setConscious : setBreathing;
                        return (
                            <View key={c.id} style={styles.condRow}>
                                <Text style={[styles.condLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }]}>{c.label}</Text>
                                <View style={styles.condToggle}>
                                    <TouchableOpacity style={[styles.condBtn, val && { backgroundColor: '#10B981' }]} onPress={() => set(true)}>
                                        <Text style={[styles.condBtnText, { color: val ? '#FFF' : subColor }]}>Yes</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.condBtn, !val && { backgroundColor: '#EF4444' }]} onPress={() => set(false)}>
                                        <Text style={[styles.condBtnText, { color: !val ? '#FFF' : subColor }]}>No</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}
                    <Text style={[styles.condLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', marginTop: Spacing.md }]}>Bleeding Severity</Text>
                    <View style={styles.bleedingRow}>
                        {BLEEDING.map((b, i) => (
                            <TouchableOpacity
                                key={b}
                                style={[styles.bleedBtn, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }, bleeding === i && { backgroundColor: BLEEDING_COLORS[i], borderColor: BLEEDING_COLORS[i] }]}
                                onPress={() => setBleeding(i)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.bleedText, { color: bleeding === i ? '#FFF' : subColor }]}>{b}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ── Quick Vitals ── */}
                <View style={[styles.vitalsRow, { backgroundColor: cardBg, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                    <Text style={[styles.condTitle, { color: isDark ? '#FFFFFF' : '#111827', marginBottom: Spacing.md }]}>Current Vitals</Text>
                    <View style={styles.minivitals}>
                        <View style={styles.minivital}>
                            <View style={[styles.miniIconBadge, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                                <Ionicons name="heart" size={18} color="#EF4444" />
                            </View>
                            <TextInput
                                style={[styles.miniInput, { color: isDark ? '#FFF' : '#111', borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                placeholder="--"
                                placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                                keyboardType="numeric"
                                value={heartRate}
                                onChangeText={setHeartRate}
                                maxLength={3}
                                textAlign="center"
                            />
                            <Text style={[styles.miniUnit, { color: subColor }]}>BPM</Text>
                        </View>
                        <View style={[styles.miniDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
                        <View style={styles.minivital}>
                            <View style={[styles.miniIconBadge, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
                                <Ionicons name="water" size={18} color="#3B82F6" />
                            </View>
                            <TextInput
                                style={[styles.miniInput, { color: isDark ? '#FFF' : '#111', borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                placeholder="--"
                                placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                                keyboardType="numeric"
                                value={spO2}
                                onChangeText={setSpO2}
                                maxLength={3}
                                textAlign="center"
                            />
                            <Text style={[styles.miniUnit, { color: subColor }]}>SpO2 %</Text>
                        </View>
                    </View>
                </View>

                {/* ── Analyze Button ── */}
                <TouchableOpacity
                    style={[styles.analyzeBtn, { backgroundColor: '#DC2626', opacity: analyzing ? 0.7 : 1 }]}
                    activeOpacity={0.85}
                    disabled={analyzing}
                    onPress={async () => {
                        if (!description.trim()) {
                            Alert.alert('Describe the emergency', 'Please provide details about the emergency situation.');
                            return;
                        }
                        setAnalyzing(true);
                        try {
                            const res = await fetch(`${API_BASE}/emergency/generate-summary`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    patientId,
                                    vitals: { heartRate, spO2 },
                                    emergencyDescription: description,
                                    patientCondition: `Conscious: ${conscious ? 'Yes' : 'No'}, Breathing: ${breathing ? 'Yes' : 'No'}, Bleeding: ${BLEEDING[bleeding]}`,
                                    metadata: {
                                        allergies: [],
                                        bloodThinners: [],
                                        chronicConditions: [],
                                        currentMedications: [],
                                        surgeries: [],
                                        recentLabs: [],
                                        bloodGroup: null,
                                    },
                                }),
                            });
                            const json = await res.json();
                            if (json.success) {
                                router.push({
                                    pathname: '/emergency/summary',
                                    params: {
                                        summary: JSON.stringify(json.data?.summaryForDoctor || null),
                                        hospitalId: '',
                                    },
                                } as any);
                            } else {
                                Alert.alert('Analysis Failed', json.error || 'Please try again.');
                            }
                        } catch {
                            Alert.alert('Network Error', 'Could not reach the server.');
                        } finally {
                            setAnalyzing(false);
                        }
                    }}
                >
                    {analyzing ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Ionicons name="flash" size={18} color="#FFF" style={{ marginBottom: 4 }} />
                    )}
                    <Text style={styles.analyzeBtnText}>{analyzing ? 'Analyzing…' : 'Analyze Emergency'}</Text>
                    <Text style={styles.analyzeBtnSub}>AI · Hospital Ranking · Maps</Text>
                </TouchableOpacity>

                <View style={{ height: 120 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    scroll: { paddingHorizontal: Spacing.base, paddingTop: Platform.OS === 'android' ? 48 : Spacing.lg },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    emergDot: { width: 10, height: 10, borderRadius: 5 },
    title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    sub: { fontSize: FontSizes.sm },
    sosBadge: { backgroundColor: '#EF4444', paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.full },
    sosText: { color: '#FFF', fontWeight: '900', fontSize: FontSizes.md, letterSpacing: 1 },
    inputCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, marginBottom: Spacing.base },
    inputHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
    inputLabel: { fontSize: FontSizes.sm, fontWeight: '600', marginBottom: Spacing.sm },
    inputField: { fontSize: FontSizes.base, lineHeight: 24, minHeight: 100, marginBottom: Spacing.sm },
    voiceActionRow: { alignItems: 'flex-end', marginTop: 2 },
    inlineVoicePill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        minHeight: 42,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.25)',
        backgroundColor: 'rgba(239,68,68,0.08)',
    },
    inlineVoicePillActive: {
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239,68,68,0.18)',
    },
    inlineVoiceText: { color: '#EF4444', fontWeight: '700', fontSize: 12 },
    voiceHint: { fontSize: 11, fontWeight: '600' },
    condCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, marginBottom: Spacing.base },
    condTitle: { fontSize: FontSizes.md, fontWeight: '700', marginBottom: Spacing.md },
    condRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
    condLabel: { fontSize: FontSizes.sm, fontWeight: '600' },
    condToggle: { flexDirection: 'row', gap: 8 },
    condBtn: { paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(128,128,128,0.2)' },
    condBtnText: { fontWeight: '700', fontSize: FontSizes.sm },
    bleedingRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm },
    bleedBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1 },
    bleedText: { fontSize: 11, fontWeight: '700' },
    vitalsRow: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, marginBottom: Spacing.base },
    minivitals: { flexDirection: 'row' },
    minivital: { flex: 1, alignItems: 'center', gap: 8 },
    miniIconBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    miniDivider: { width: 1, marginHorizontal: Spacing.md },
    miniInput: { fontSize: 28, fontWeight: '800', textAlign: 'center', borderBottomWidth: 1, width: 80, paddingBottom: 4 },
    miniUnit: { fontSize: 11, fontWeight: '600' },
    analyzeBtn: { borderRadius: Radius.xl, paddingVertical: 18, alignItems: 'center', marginBottom: Spacing.base },
    analyzeBtnText: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '800' },
    analyzeBtnSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 },
});
