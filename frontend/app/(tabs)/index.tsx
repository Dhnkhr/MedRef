import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, Animated, Platform, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, FontSizes, FontWeights, Spacing, Radius } from '@/constants/theme';
import { useWearable } from '@/hooks/use-wearable';

const API_BASE = 'http://localhost:3000/api';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const [heartRate, setHeartRate] = useState('');
  const [spO2, setSpO2] = useState('');
  const [age, setAge] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [listeningSymptoms, setListeningSymptoms] = useState(false);
  const [symptomVoiceStatus, setSymptomVoiceStatus] = useState('');
  const wearable = useWearable();
  const symptomRecognitionRef = useRef<any>(null);

  // Auto-fill vitals from wearable when connected
  useEffect(() => {
    if (wearable.connected && wearable.vitals) {
      setHeartRate(String(wearable.vitals.heartRate));
      setSpO2(String(wearable.vitals.spo2));
    }
  }, [wearable.connected, wearable.vitals?.heartRate, wearable.vitals?.spo2]);

  const pulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      try { symptomRecognitionRef.current?.stop(); } catch { }
    };
  }, []);

  const toggleSymptomVoice = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Voice Input', 'Voice capture is available in web mode only.');
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      Alert.alert('Voice Input', 'Speech recognition is not supported in this browser.');
      return;
    }

    if (listeningSymptoms) {
      try { symptomRecognitionRef.current?.stop(); } catch { }
      setListeningSymptoms(false);
      setSymptomVoiceStatus('');
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      setListeningSymptoms(true);
      setSymptomVoiceStatus('Listening...');
    };

    recognition.onresult = (event: any) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript + ' ';
      }
      setSymptoms(text.trim());
    };

    recognition.onerror = () => {
      setListeningSymptoms(false);
      setSymptomVoiceStatus('');
    };

    recognition.onend = () => {
      setListeningSymptoms(false);
      setSymptomVoiceStatus('');
    };

    symptomRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setListeningSymptoms(false);
      setSymptomVoiceStatus('');
    }
  };

  const hrNum = parseFloat(heartRate);
  const spo2Num = parseFloat(spO2);
  const hrStatus = !heartRate ? null : (hrNum < 60 || hrNum > 100) ? 'abnormal' : 'normal';
  const spo2Status = !spO2 ? null : spo2Num < 95 ? 'abnormal' : 'normal';

  const bg = isDark ? '#0A0F1A' : '#F0F4FF';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero Header ── */}
        <Animated.View style={[styles.heroHeader, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroGreeting, { color: subColor }]}>Good morning 👋</Text>
              <Text style={[styles.heroTitle, { color: textColor }]}>How are you{'\n'}feeling today?</Text>
            </View>
            <View style={styles.pulseWrap}>
              <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulse }] }]} />
              <View style={[styles.pulseCore, { backgroundColor: cardBg }]}>
                <Ionicons name="heart" size={26} color="#EF4444" />
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.wearableBanner, {
              backgroundColor: wearable.connected
                ? (isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.06)')
                : (isDark ? 'rgba(59,130,246,0.12)' : 'rgba(37,99,235,0.06)'),
              borderColor: wearable.connected
                ? (isDark ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.18)')
                : (isDark ? 'rgba(59,130,246,0.25)' : 'rgba(37,99,235,0.18)'),
            }]}
            activeOpacity={0.8}
            onPress={() => !wearable.connected && router.push('/profile')}
          >
            <View style={[styles.wearableDot, { backgroundColor: wearable.connected ? '#10B981' : '#F59E0B' }]} />
            <Text style={[styles.wearableText, { color: wearable.connected ? (isDark ? '#6EE7B7' : '#047857') : (isDark ? '#93C5FD' : '#1D4ED8') }]}>
              {wearable.connected ? `⌚ ${wearable.deviceName}` : '⌚ Wearable not connected'}
            </Text>
            {!wearable.connected && (
              <Text style={[styles.wearableLink, { color: isDark ? '#60A5FA' : '#2563EB' }]}>Connect →</Text>
            )}
            {wearable.connected && wearable.vitals && (
              <Text style={[styles.wearableLink, { color: isDark ? '#6EE7B7' : '#047857' }]}>
                {wearable.vitals.heartRate} bpm · {wearable.vitals.spo2}%
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* ── Vitals Grid ── */}
        <Text style={[styles.sectionLabel, { color: subColor }]}>YOUR VITALS</Text>
        <View style={styles.vitalsGrid}>
          <VitalCard
            iconName="heart-circle" iconColor="#EF4444" iconBg="rgba(239,68,68,0.12)"
            label="Heart Rate" unit="BPM"
            value={heartRate} onChange={setHeartRate}
            status={hrStatus} normalRange="60–100"
            isDark={isDark} accentColor="#EF4444"
            cardBg={cardBg} cardBorder={cardBorder} textColor={textColor}
          />
          <VitalCard
            iconName="water" iconColor="#3B82F6" iconBg="rgba(59,130,246,0.12)"
            label="SpO2" unit="%"
            value={spO2} onChange={setSpO2}
            status={spo2Status} normalRange="95–100"
            isDark={isDark} accentColor="#3B82F6"
            cardBg={cardBg} cardBorder={cardBorder} textColor={textColor}
          />
        </View>

        {/* ── Age Row ── */}
        <View style={[styles.ageCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={[styles.ageIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
            <Ionicons name="person" size={18} color="#F59E0B" />
          </View>
          <Text style={[styles.ageLabel, { color: subColor }]}>Age</Text>
          <TextInput
            style={[styles.ageInput, { color: textColor }]}
            placeholder="Enter age"
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
            maxLength={3}
          />
          <Text style={[styles.ageUnit, { color: subColor }]}>years</Text>
        </View>

        {/* ── Symptoms ── */}
        <Text style={[styles.sectionLabel, { color: subColor }]}>DESCRIBE SYMPTOMS</Text>
        <View style={[styles.symptomCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <TextInput
            style={[styles.symptomInput, { color: textColor }]}
            placeholder="Describe what you're experiencing — the more detail, the better the AI analysis..."
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={symptoms}
            onChangeText={setSymptoms}
          />
          <View style={styles.symptomActionsRow}>
            <Text style={[styles.charCount, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }]}>{symptoms.length}/500</Text>
            <TouchableOpacity
              style={[styles.symptomVoiceBtn, listeningSymptoms && styles.symptomVoiceBtnActive]}
              onPress={toggleSymptomVoice}
              activeOpacity={0.8}
            >
              <Ionicons name={listeningSymptoms ? 'stop' : 'mic'} size={16} color="#2563EB" />
              <Text style={styles.symptomVoiceText}>{listeningSymptoms ? 'Stop Voice' : 'Voice Input'}</Text>
            </TouchableOpacity>
          </View>
          {symptomVoiceStatus ? (
            <Text style={[styles.voiceStatusHint, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }]}>{symptomVoiceStatus}</Text>
          ) : null}
        </View>

        {/* ── Analyze Button ── always visible, dims when insufficient input ── */}
        <TouchableOpacity
          style={[styles.analyzeBtn, { backgroundColor: '#2563EB', opacity: analyzing ? 0.7 : 1 }]}
          activeOpacity={0.85}
          disabled={analyzing}
          onPress={async () => {
            if (!symptoms.trim()) {
              Alert.alert('Enter symptoms', 'Please describe your symptoms before analyzing.');
              return;
            }
            setAnalyzing(true);
            try {
              const res = await fetch(`${API_BASE}/analysis/symptoms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ heartRate, spO2, age, symptoms }),
              });
              const json = await res.json();
              if (json.success) {
                const { specialistType, urgencyLevel, reasoning } = json.data;
                router.push({
                  pathname: '/hospital/results',
                  params: { specialistType, urgencyLevel, reasoning },
                } as any);
              } else {
                Alert.alert('Analysis Failed', json.error || 'Please try again.');
              }
            } catch (e: any) {
              Alert.alert('Network Error', 'Could not reach the server. Is the backend running?');
            } finally {
              setAnalyzing(false);
            }
          }}
        >
          {analyzing ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.analyzeBtnText}>Analyze with AI</Text>
          )}
          <Text style={styles.analyzeBtnSub}>{analyzing ? 'Analyzing symptoms…' : 'Groq · Llama 3.3 70B'}</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function VitalCard({ iconName, iconColor, iconBg, label, unit, value, onChange, status, normalRange, isDark, accentColor, cardBg, cardBorder, textColor }: any) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isAbnormal = status === 'abnormal';

  const borderColor = focused ? accentColor : (isAbnormal ? '#EF444440' : cardBorder);

  return (
    // The entire card is a pressable that focuses the hidden-but-real input
    <TouchableOpacity
      style={[styles.vitalCard, { backgroundColor: cardBg, borderColor, borderWidth: focused ? 1.5 : 1 }]}
      activeOpacity={1}
      onPress={() => inputRef.current?.focus()}
    >
      <View style={styles.vitalCardTop}>
        <View style={[styles.vitalIconBadge, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        {status && (
          <View style={[styles.statusDot, { backgroundColor: isAbnormal ? '#EF4444' : '#10B981' }]} />
        )}
      </View>
      <Text style={[styles.vitalLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>{label}</Text>

      {/* Value display — show value or placeholder text, NOT a TextInput placeholder */}
      <View style={styles.vitalValueWrap}>
        {value ? (
          <Text style={[styles.vitalValueText, { color: isAbnormal ? '#EF4444' : textColor }]}>{value}</Text>
        ) : (
          <Text style={[styles.vitalValueText, { color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }]}>--</Text>
        )}
        {/* Real input is invisible, sits over the value */}
        <TextInput
          ref={inputRef}
          style={styles.vitalHiddenInput}
          keyboardType="numeric"
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={3}
          caretHidden={false}
        />
      </View>

      <Text style={[styles.vitalUnit, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }]}>{unit}</Text>
      <Text style={[styles.normalRange, { color: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)' }]}>Normal: {normalRange}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.base, paddingTop: Platform.OS === 'android' ? 48 : Spacing.lg },

  heroHeader: { marginBottom: Spacing.xl },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  heroGreeting: { fontSize: FontSizes.sm, fontWeight: '500', marginBottom: 4 },
  heroTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8, lineHeight: 36 },

  pulseWrap: { alignItems: 'center', justifyContent: 'center', width: 60, height: 60 },
  pulseRing: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(239,68,68,0.12)' },
  pulseCore: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 12px rgba(0,0,0,0.1)' },

  wearableBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: 10, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm },
  wearableDot: { width: 6, height: 6, borderRadius: 3 },
  wearableText: { flex: 1, fontSize: FontSizes.sm, fontWeight: '500' },
  wearableLink: { fontSize: FontSizes.sm, fontWeight: '700' },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: Spacing.md, marginTop: Spacing.sm },

  vitalsGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },

  vitalCard: { flex: 1, borderRadius: Radius.xl, padding: Spacing.base, alignItems: 'center' },
  vitalIconBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  vitalCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: Spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  vitalLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 12 },

  vitalValueWrap: { position: 'relative', height: 52, justifyContent: 'center', alignItems: 'center', width: '100%' },
  vitalValueText: { fontSize: 40, fontWeight: '800', letterSpacing: -1, textAlign: 'center' },
  vitalHiddenInput: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0,   // invisible — value is displayed by vitalValueText above
    fontSize: 40, fontWeight: '800', textAlign: 'center',
    color: 'transparent',
  },

  vitalUnit: { fontSize: 11, fontWeight: '600', marginTop: 6 },
  normalRange: { fontSize: 10, marginTop: 8 },

  ageCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.base, paddingVertical: 14, borderRadius: Radius.xl, borderWidth: 1, marginBottom: Spacing.xl },
  ageIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ageLabel: { fontSize: FontSizes.sm, fontWeight: '600' },
  ageInput: { flex: 1, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  ageUnit: { fontSize: FontSizes.sm },

  symptomCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, marginBottom: Spacing.sm },
  symptomInput: { fontSize: FontSizes.base, lineHeight: 24, minHeight: 100 },
  symptomActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  symptomVoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
    backgroundColor: 'rgba(37,99,235,0.08)',
  },
  symptomVoiceBtnActive: {
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37,99,235,0.18)',
  },
  symptomVoiceText: { color: '#2563EB', fontSize: 12, fontWeight: '700' },
  charCount: { fontSize: 11, textAlign: 'right' },
  voiceStatusHint: { fontSize: 11, fontWeight: '600', marginTop: 6 },

  analyzeBtn: { borderRadius: Radius.xl, paddingVertical: 18, alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.base },
  analyzeBtnText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: '800', letterSpacing: -0.3 },
  analyzeBtnSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 },
});
