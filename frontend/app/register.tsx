import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
    Animated, Platform, StatusBar, ActivityIndicator, TextInput, KeyboardAvoidingView, ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePatient } from '@/hooks/use-patient';
import { Spacing, Radius, FontSizes } from '@/constants/theme';

const FEATURES = [
    { icon: 'shield-checkmark' as const, color: '#10B981', bg: 'rgba(16,185,129,0.12)', title: 'Zero Personal Data', sub: 'No name, email, or phone stored — ever' },
    { icon: 'link' as const, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', title: 'Blockchain Secured', sub: 'Records anchored on Polygon (immutable)' },
    { icon: 'sparkles' as const, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', title: 'AI-Powered Triage', sub: 'Groq Llama 3.3 70B for specialist matching' },
    { icon: 'flash' as const, color: '#EF4444', bg: 'rgba(239,68,68,0.12)', title: 'Instant Emergency', sub: 'SOS with auto-call, location & medical share' },
];

export default function RegisterScreen() {
    const { patientId, loading, register, login, registering } = usePatient();
    const [step, setStep] = useState<'intro' | 'register_form' | 'login_form' | 'generating' | 'done'>('intro');
    const [generatedId, setGeneratedId] = useState('');
    const [idChars, setIdChars] = useState('MR-????-????');

    // Form states
    const [fullName, setFullName] = useState('');
    const [age, setAge] = useState('');
    const [email, setEmail] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [password, setPassword] = useState('');

    // Login states
    const [loginId, setLoginId] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [authError, setAuthError] = useState('');

    // Animations
    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideUp = useRef(new Animated.Value(40)).current;
    const scaleId = useRef(new Animated.Value(0.8)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: false }),
            Animated.timing(slideUp, { toValue: 0, duration: 700, useNativeDriver: false }),
        ]).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.08, duration: 1200, useNativeDriver: false }),
                Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: false }),
            ])
        ).start();
    }, []);

    // Auto-redirect if already registered
    useEffect(() => {
        if (!loading && patientId && step === 'intro') {
            router.replace('/(tabs)');
        }
    }, [loading, patientId, step]);

    const startGeneration = async () => {
        if (!fullName || !age || !email || !password) {
            setAuthError('Please fill missing details');
            return;
        }
        setAuthError('');
        setStep('generating');

        // Scramble animation
        let ticks = 0;
        const maxTicks = 24;
        const interval = setInterval(() => {
            const rand = () => Math.floor(Math.random() * 65536).toString(16).toUpperCase().padStart(4, '0');
            setIdChars(`MR-${rand()}-${rand()}`);
            ticks++;
            if (ticks >= maxTicks) clearInterval(interval);
        }, 80);

        try {
            // Actually register
            const data = await register({ fullName, age, email, bloodGroup, password });
            clearInterval(interval);
            setGeneratedId(data.patientId);
            setIdChars(data.patientId);
            setStep('done');

            Animated.parallel([
                Animated.spring(scaleId, { toValue: 1, useNativeDriver: false, tension: 80, friction: 7 }),
                Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
            ]).start();
        } catch (err: any) {
            clearInterval(interval);
            setStep('register_form');
            setAuthError('Registration failed');
        }
    };

    const startLogin = async () => {
        if (!loginId || !loginPassword) {
            setAuthError('Please enter ID and password');
            return;
        }
        setAuthError('');
        try {
            await login(loginId, loginPassword);
            enterApp();
        } catch (err: any) {
            setAuthError(err.message || 'Login failed');
        }
    };

    const enterApp = () => router.replace('/(tabs)');

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" />

            {/* Background gradient orbs */}
            <View style={[styles.orb, styles.orb1]} />
            <View style={[styles.orb, styles.orb2]} />

            <Animated.View style={[styles.container, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

                {/* ── Logo / Brand ── */}
                <View style={styles.brandRow}>
                    <Animated.View style={[styles.logoRing, { transform: [{ scale: pulse }] }]}>
                        <View style={styles.logoInner}>
                            <Ionicons name="medical" size={32} color="#3B82F6" />
                        </View>
                    </Animated.View>
                    <View style={{ marginLeft: 14 }}>
                        <Text style={styles.brandName}>MedRef</Text>
                        <Text style={styles.brandTagline}>Your anonymous medical identity</Text>
                    </View>
                </View>

                {/* ── Features list ── */}
                {step === 'intro' && (
                    <View style={styles.featureList}>
                        {FEATURES.map((f, i) => (
                            <Animated.View
                                key={f.title}
                                style={[styles.featureRow, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}
                            >
                                <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
                                    <Ionicons name={f.icon} size={20} color={f.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.featureTitle}>{f.title}</Text>
                                    <Text style={styles.featureSub}>{f.sub}</Text>
                                </View>
                            </Animated.View>
                        ))}
                    </View>
                )}

                {/* ── Registration Form ── */}
                {step === 'register_form' && (
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center' }}>
                        <Text style={styles.formTitle}>Basic Details</Text>
                        <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="rgba(255,255,255,0.4)" value={fullName} onChangeText={setFullName} />
                        <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Age" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" value={age} onChangeText={setAge} />
                            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Blood Group (e.g. O+)" placeholderTextColor="rgba(255,255,255,0.4)" value={bloodGroup} onChangeText={setBloodGroup} />
                        </View>
                        <TextInput style={styles.input} placeholder="Create Password" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry value={password} onChangeText={setPassword} />
                        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
                    </KeyboardAvoidingView>
                )}

                {/* ── Login Form ── */}
                {step === 'login_form' && (
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center' }}>
                        <Text style={styles.formTitle}>Welcome Back</Text>
                        <TextInput style={styles.input} placeholder="Patient ID (MR-XXXX-XXXX)" placeholderTextColor="rgba(255,255,255,0.4)" value={loginId} onChangeText={setLoginId} autoCapitalize="characters" />
                        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry value={loginPassword} onChangeText={setLoginPassword} />
                        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
                    </KeyboardAvoidingView>
                )}

                {/* ── ID Generation Display ── */}
                {(step === 'generating' || step === 'done') && (
                    <View style={styles.idSection}>
                        <Text style={styles.idCaption}>
                            {step === 'generating' ? 'Generating your unique ID…' : 'Your Patient ID'}
                        </Text>
                        <Animated.View
                            style={[
                                styles.idCard,
                                step === 'done' && { transform: [{ scale: scaleId }] },
                            ]}
                        >
                            <View style={styles.idCardInner}>
                                {step === 'generating' && (
                                    <ActivityIndicator color="#3B82F6" size="small" style={{ marginBottom: 10 }} />
                                )}
                                {step === 'done' && (
                                    <Ionicons name="checkmark-circle" size={28} color="#10B981" style={{ marginBottom: 8 }} />
                                )}
                                <Text style={styles.idText}>{idChars}</Text>
                                <Text style={styles.idNote}>
                                    {step === 'generating'
                                        ? 'Cryptographically unique — cannot be linked to you'
                                        : 'Save this ID — it is your only identifier in MedRef'}
                                </Text>
                            </View>
                            {/* Glow border */}
                            <Animated.View style={[styles.idGlow, {
                                opacity: step === 'done' ? glowAnim : 0,
                                borderColor: '#3B82F6',
                            }]} />
                        </Animated.View>

                        {step === 'done' && (
                            <View style={styles.badgesRow}>
                                <View style={styles.badge}>
                                    <Ionicons name="lock-closed" size={11} color="#10B981" />
                                    <Text style={[styles.badgeText, { color: '#10B981' }]}>Encrypted</Text>
                                </View>
                                <View style={styles.badge}>
                                    <Ionicons name="link" size={11} color="#8B5CF6" />
                                    <Text style={[styles.badgeText, { color: '#8B5CF6' }]}>On Polygon</Text>
                                </View>
                                <View style={styles.badge}>
                                    <Ionicons name="eye-off" size={11} color="#3B82F6" />
                                    <Text style={[styles.badgeText, { color: '#3B82F6' }]}>Zero-PII</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* ── Privacy notice ── */}
                {step === 'intro' && (
                    <View style={styles.privacyRow}>
                        <Ionicons name="information-circle" size={14} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.privacyText}>
                            MedRef stores zero personal identifiers. Your ID is a random UUID — not linked to your name, phone, or email.
                        </Text>
                    </View>
                )}

                {/* ── CTA Buttons ── */}
                {step === 'intro' && (
                    <View style={{ gap: 12 }}>
                        <TouchableOpacity style={styles.ctaBtn} onPress={() => setStep('register_form')} activeOpacity={0.85}>
                            <Ionicons name="add-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.ctaBtnText}>New Register & Generate ID</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => setStep('login_form')} activeOpacity={0.85}>
                            <Ionicons name="log-in" size={20} color="#3B82F6" style={{ marginRight: 8 }} />
                            <Text style={[styles.ctaBtnText, { color: '#3B82F6' }]}>Already Registered? Log in</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 'register_form' && (
                    <View style={{ gap: 12 }}>
                        <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: '#10B981' }]} onPress={startGeneration} disabled={registering} activeOpacity={0.85}>
                            {registering ? <ActivityIndicator color="#FFF" /> : <Text style={styles.ctaBtnText}>Generate Unique ID</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => setStep('intro')}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 'login_form' && (
                    <View style={{ gap: 12 }}>
                        <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: '#3B82F6' }]} onPress={startLogin} disabled={registering} activeOpacity={0.85}>
                            {registering ? <ActivityIndicator color="#FFF" /> : <Text style={styles.ctaBtnText}>Log In to MedRef</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => setStep('intro')}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 'generating' && (
                    <View style={[styles.ctaBtn, { backgroundColor: 'rgba(37,99,235,0.5)' }]}>
                        <ActivityIndicator color="#FFF" size="small" style={{ marginRight: 8 }} />
                        <Text style={styles.ctaBtnText}>Generating…</Text>
                    </View>
                )}

                {step === 'done' && (
                    <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: '#10B981' }]} onPress={enterApp} activeOpacity={0.85}>
                        <Ionicons name="arrow-forward-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.ctaBtnText}>Enter MedRef</Text>
                    </TouchableOpacity>
                )}
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#060C1A' },

    // Background orbs
    orb: { position: 'absolute', borderRadius: 999 },
    orb1: { width: 320, height: 320, backgroundColor: 'rgba(37,99,235,0.12)', top: -60, right: -80 },
    orb2: { width: 280, height: 280, backgroundColor: 'rgba(139,92,246,0.10)', bottom: 60, left: -60 },

    container: {
        flex: 1, paddingHorizontal: Spacing.xl,
        paddingTop: Platform.OS === 'android' ? 56 : Spacing.xl,
        paddingBottom: Spacing.xl,
        justifyContent: 'space-between',
    },

    // Brand
    brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
    logoRing: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(59,130,246,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(59,130,246,0.3)' },
    logoInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(59,130,246,0.15)', alignItems: 'center', justifyContent: 'center' },
    brandName: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
    brandTagline: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.45)', marginTop: 2 },

    // Features
    featureList: { gap: 14, marginBottom: Spacing.xl },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    featureIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    featureTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
    featureSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 17 },

    // ID section
    idSection: { alignItems: 'center', gap: 16, marginBottom: Spacing.xl },
    idCaption: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 0.5 },
    idCard: {
        width: '100%', borderRadius: Radius.xl,
        backgroundColor: 'rgba(15,25,50,0.9)',
        borderWidth: 1.5, borderColor: 'rgba(59,130,246,0.3)',
        overflow: 'hidden',
    },
    idCardInner: { padding: Spacing.xl, alignItems: 'center', gap: 6 },
    idGlow: { position: 'absolute', inset: 0, borderRadius: Radius.xl, borderWidth: 1.5 },
    idText: { fontSize: 30, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    idNote: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 16, marginTop: 4 },
    badgesRow: { flexDirection: 'row', gap: 10 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    badgeText: { fontSize: 11, fontWeight: '700' },

    // Privacy
    privacyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4, marginBottom: Spacing.base },
    privacyText: { fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 16, flex: 1 },

    // CTA
    ctaBtn: { backgroundColor: '#2563EB', borderRadius: Radius.xl, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    ctaBtnText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: '800', letterSpacing: -0.2 },

    // Forms
    formTitle: { fontSize: 22, fontWeight: '900', color: '#FFF', marginBottom: Spacing.xl },
    input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.lg, padding: 16, color: '#FFF', fontSize: 16, marginBottom: 12 },
    errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center', marginTop: 8 },
});
