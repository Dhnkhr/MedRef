import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius, FontSizes } from '@/constants/theme';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    isDark: boolean;
}

export default function VoiceInput({ onTranscript, isDark }: VoiceInputProps) {
    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [supported, setSupported] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const recognitionRef = useRef<any>(null);
    const onTranscriptRef = useRef(onTranscript);
    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const ring1 = useRef(new Animated.Value(0)).current;
    const ring2 = useRef(new Animated.Value(0)).current;
    const ring3 = useRef(new Animated.Value(0)).current;
    const glowOpacity = useRef(new Animated.Value(0)).current;
    const dotPulse = useRef(new Animated.Value(1)).current;

    const wantsToListenRef = useRef(false);
    const accumulatedRef = useRef('');

    useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

    useEffect(() => {
        if (Platform.OS === 'web') {
            const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SR) setSupported(true);
            else setStatusMessage('Speech Recognition not available');
        }
    }, []);

    const createRecognition = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) return null;
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => { setStatusMessage('Listening — speak now'); };
        recognition.onaudiostart = () => { setStatusMessage('Microphone active'); };
        recognition.onspeechstart = () => { setStatusMessage('Hearing your voice…'); };

        recognition.onresult = (event: any) => {
            let finalText = '', interimText = '';
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
                else interimText += event.results[i][0].transcript;
            }
            const currentText = (finalText + interimText).trim();
            const fullText = accumulatedRef.current ? `${accumulatedRef.current} ${currentText}`.trim() : currentText;
            if (fullText) {
                setTranscript(fullText);
                onTranscriptRef.current(fullText);
            }
            if (finalText) {
                accumulatedRef.current = accumulatedRef.current ? `${accumulatedRef.current} ${finalText.trim()}` : finalText.trim();
            }
        };

        recognition.onspeechend = () => { setStatusMessage('Waiting for speech…'); };

        recognition.onerror = (event: any) => {
            if (event.error === 'not-allowed') {
                setPermissionDenied(true);
                setStatusMessage('Microphone access denied');
                wantsToListenRef.current = false;
                setListening(false);
                return;
            }
            if (event.error === 'no-speech' || event.error === 'aborted') {
                setStatusMessage('Listening — speak now');
                return;
            }
            setStatusMessage(`Error: ${event.error}`);
        };

        recognition.onend = () => {
            if (wantsToListenRef.current) {
                setTimeout(() => {
                    if (wantsToListenRef.current && recognitionRef.current) {
                        try { recognitionRef.current.start(); } catch (e) { }
                    }
                }, 300);
            } else {
                setListening(false);
                setStatusMessage('');
            }
        };

        return recognition;
    };

    // ── Animations ──────────────────────────────────────────────────
    useEffect(() => {
        if (listening) {
            // Mic button gentle pulse
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            ).start();

            // Expanding rings (sonar effect)
            const createRingAnim = (anim: Animated.Value, delay: number) =>
                Animated.loop(
                    Animated.sequence([
                        Animated.delay(delay),
                        Animated.parallel([
                            Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
                        ]),
                        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
                    ])
                );
            createRingAnim(ring1, 0).start();
            createRingAnim(ring2, 600).start();
            createRingAnim(ring3, 1200).start();

            // Background glow
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowOpacity, { toValue: 0.15, duration: 1000, useNativeDriver: true }),
                    Animated.timing(glowOpacity, { toValue: 0.05, duration: 1000, useNativeDriver: true }),
                ])
            ).start();

            // Recording dot blink
            Animated.loop(
                Animated.sequence([
                    Animated.timing(dotPulse, { toValue: 0.2, duration: 500, useNativeDriver: true }),
                    Animated.timing(dotPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();
        } else {
            [pulseAnim, ring1, ring2, ring3, glowOpacity, dotPulse].forEach(a => {
                a.stopAnimation();
                a.setValue(a === pulseAnim || a === dotPulse ? 1 : 0);
            });
        }
    }, [listening]);

    const startListening = async () => {
        try {
            setStatusMessage('Requesting microphone…');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop());
        } catch {
            setPermissionDenied(true);
            setStatusMessage('Microphone access denied');
            return;
        }
        const recognition = createRecognition();
        if (!recognition) return;
        recognitionRef.current = recognition;
        wantsToListenRef.current = true;
        try {
            recognition.start();
            setListening(true);
        } catch (e: any) {
            setStatusMessage('Failed to start');
        }
    };

    const stopListening = () => {
        wantsToListenRef.current = false;
        try { recognitionRef.current?.stop(); } catch { }
        setListening(false);
        setStatusMessage('');
    };

    const toggleListening = () => { listening ? stopListening() : startListening(); };

    // ── Computed ring styles ────────────────────────────────────────
    const ringStyle = (anim: Animated.Value, size: number) => ({
        position: 'absolute' as const,
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 2,
        borderColor: 'rgba(239,68,68,0.3)',
        opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
    });

    const cardBg = isDark ? '#1A1F2E' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)';
    const textMain = isDark ? '#FFF' : '#111827';
    const textSub = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
    const statusColor = listening ? '#10B981' : (permissionDenied ? '#EF4444' : textSub);

    return (
        <View style={[styles.container, { backgroundColor: cardBg, borderColor: listening ? 'rgba(239,68,68,0.2)' : cardBorder }]}>

            {/* Background glow when active */}
            {listening && (
                <Animated.View style={[styles.bgGlow, { opacity: glowOpacity }]} />
            )}

            {/* Sonar rings */}
            {listening && (
                <View style={styles.ringContainer}>
                    <Animated.View style={ringStyle(ring1, 80)} />
                    <Animated.View style={ringStyle(ring2, 80)} />
                    <Animated.View style={ringStyle(ring3, 80)} />
                </View>
            )}

            {/* Mic button */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                    style={[
                        styles.micBtn,
                        listening ? styles.micBtnActive : styles.micBtnIdle,
                        permissionDenied && styles.micBtnDisabled,
                    ]}
                    activeOpacity={0.8}
                    onPress={toggleListening}
                >
                    <Ionicons name={listening ? 'stop' : 'mic'} size={30} color="#FFF" />
                </TouchableOpacity>
            </Animated.View>

            {/* Transcript text */}
            {transcript ? (
                <Text style={[styles.transcriptText, { color: textMain }]} numberOfLines={3}>
                    "{transcript}"
                </Text>
            ) : null}

            {/* Status message */}
            <Text style={[styles.statusText, { color: statusColor }]}>
                {statusMessage || (supported ? 'Tap the mic to start speaking' : 'Not supported in this browser')}
            </Text>

            {/* Recording indicator */}
            {listening && (
                <View style={styles.recordingBar}>
                    <Animated.View style={[styles.recordDot, { opacity: dotPulse }]} />
                    <Text style={styles.recordText}>REC</Text>
                    <View style={styles.recordDivider} />
                    <Ionicons name="mic" size={12} color="rgba(239,68,68,0.7)" />
                    <Text style={styles.recordLabel}>
                        {statusMessage.includes('Hearing') ? 'CAPTURING' : 'LISTENING'}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 24, borderWidth: 1.5,
        paddingVertical: 32, paddingHorizontal: 24,
        alignItems: 'center', justifyContent: 'center',
        minHeight: 210, marginBottom: Spacing.base,
        overflow: 'hidden',
    },
    bgGlow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#EF4444',
        borderRadius: 24,
    },
    ringContainer: {
        position: 'absolute',
        alignItems: 'center', justifyContent: 'center',
        width: 200, height: 200,
    },
    micBtn: {
        width: 72, height: 72, borderRadius: 36,
        alignItems: 'center', justifyContent: 'center',
        zIndex: 10,
    },
    micBtnIdle: {
        backgroundColor: '#EF4444',
        shadowColor: '#EF4444', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
    },
    micBtnActive: {
        backgroundColor: '#DC2626',
        shadowColor: '#EF4444', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4, shadowRadius: 20, elevation: 12,
    },
    micBtnDisabled: {
        backgroundColor: '#6B7280',
        shadowOpacity: 0,
    },
    transcriptText: {
        marginTop: 16, fontSize: 15,
        fontStyle: 'italic', textAlign: 'center',
        paddingHorizontal: 12, lineHeight: 22,
        maxWidth: '90%',
    },
    statusText: {
        marginTop: 10, fontSize: 13,
        fontWeight: '500', textAlign: 'center',
        letterSpacing: 0.2,
    },
    recordingBar: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: 14,
        backgroundColor: 'rgba(239,68,68,0.06)',
        paddingHorizontal: 14, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.12)',
    },
    recordDot: {
        width: 7, height: 7, borderRadius: 3.5,
        backgroundColor: '#EF4444',
    },
    recordText: {
        color: '#EF4444', fontSize: 11,
        fontWeight: '800', letterSpacing: 1.5,
    },
    recordDivider: {
        width: 1, height: 12,
        backgroundColor: 'rgba(239,68,68,0.2)',
        marginHorizontal: 2,
    },
    recordLabel: {
        color: 'rgba(239,68,68,0.6)', fontSize: 10,
        fontWeight: '600', letterSpacing: 0.8,
    },
});
