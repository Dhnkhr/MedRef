import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, SafeAreaView,
    TouchableOpacity, Platform, Switch, TextInput, StatusBar, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, FontSizes, FontWeights, Spacing, Radius } from '@/constants/theme';
import { usePatient, getAuthHeaders } from '@/hooks/use-patient';

import { router } from 'expo-router';
import WearableStatus from '@/components/WearableStatus';

const API_BASE = 'http://localhost:3000/api';
const SOS_STORAGE_KEY = '@medref_sos_config';

const CONTACT_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F97316', '#EF4444', '#EC4899'];

interface Contact {
    name: string;
    relation: string;
    phone: string;
    initial: string;
    color: string;
}

const DEFAULT_CONTACTS: Contact[] = [
    { name: 'Mom', relation: 'Mother', phone: '+91-98XXXXXXXX', initial: 'M', color: '#3B82F6' },
    { name: 'Dad', relation: 'Father', phone: '+91-97XXXXXXXX', initial: 'D', color: '#8B5CF6' },
];

export default function ProfileScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const isDark = colorScheme === 'dark';
    const bg = isDark ? '#0A0F1A' : '#F0F4FF';
    const { patientId, clearPatient } = usePatient();

    const [autoCall, setAutoCall] = useState(true);
    const [autoConsent, setAutoConsent] = useState(false);
    const [liveLocation, setLiveLocation] = useState(true);
    const [emergencyNumber, setEmergencyNumber] = useState('112');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [contacts, setContacts] = useState<Contact[]>(DEFAULT_CONTACTS);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [formName, setFormName] = useState('');
    const [formRelation, setFormRelation] = useState('');
    const [formPhone, setFormPhone] = useState('');

    const cardBg = isDark ? '#1A2035' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#FFF' : '#111827';
    const subColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
    const divColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    // Load saved SOS config from AsyncStorage on mount
    useEffect(() => {
        AsyncStorage.getItem(SOS_STORAGE_KEY).then((raw) => {
            if (!raw) return;
            try {
                const cfg = JSON.parse(raw);
                if (cfg.autoCallEmergency !== undefined) setAutoCall(cfg.autoCallEmergency);
                if (cfg.autoConsentDataSharing !== undefined) setAutoConsent(cfg.autoConsentDataSharing);
                if (cfg.shareLocationUntilStopped !== undefined) setLiveLocation(cfg.shareLocationUntilStopped);
                if (cfg.emergencyNumber) setEmergencyNumber(cfg.emergencyNumber);
                if (cfg.contacts && cfg.contacts.length > 0) setContacts(cfg.contacts);
            } catch { }
        });
    }, []);

    // Debounced save to backend + AsyncStorage whenever a setting changes
    const saveSosConfig = useCallback(
        (ac: boolean, consent: boolean, loc: boolean, num: string) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(async () => {
                setSaveStatus('saving');
                const payload = {
                    patientId,
                    emergencyContacts: contacts.map((c) => ({ name: c.name, phone: c.phone, relation: c.relation })),
                    contacts,
                    autoCallEmergency: ac,
                    emergencyNumber: num,
                    autoConsentDataSharing: consent,
                    shareLocationUntilStopped: loc,
                };
                // Persist locally always
                await AsyncStorage.setItem(SOS_STORAGE_KEY, JSON.stringify(payload));
                try {
                    const headers = await getAuthHeaders();
                    const res = await fetch(`${API_BASE}/patient/sos-config`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify(payload),
                    });
                    if (res.ok) {
                        setSaveStatus('saved');
                    } else {
                        setSaveStatus('error');
                    }
                } catch {
                    // Offline — still saved locally
                    setSaveStatus('saved');
                }
                setTimeout(() => setSaveStatus('idle'), 2000);
            }, 600);
        },
        [patientId],
    );

    // Wrapped setters that trigger save
    const handleAutoCall = (v: boolean) => { setAutoCall(v); saveSosConfig(v, autoConsent, liveLocation, emergencyNumber); };
    const handleAutoConsent = (v: boolean) => { setAutoConsent(v); saveSosConfig(autoCall, v, liveLocation, emergencyNumber); };
    const handleLiveLocation = (v: boolean) => { setLiveLocation(v); saveSosConfig(autoCall, autoConsent, v, emergencyNumber); };
    const handleEmergencyNumber = (v: string) => { setEmergencyNumber(v); saveSosConfig(autoCall, autoConsent, liveLocation, v); };

    const handleLogout = async () => {
        await clearPatient();
        router.replace('/register');
    };

    const openAddContact = () => {
        setEditingIndex(null);
        setFormName('');
        setFormRelation('');
        setFormPhone('');
        setShowAddModal(true);
    };

    const openEditContact = (idx: number) => {
        setEditingIndex(idx);
        setFormName(contacts[idx].name);
        setFormRelation(contacts[idx].relation);
        setFormPhone(contacts[idx].phone);
        setShowAddModal(true);
    };

    const saveContact = () => {
        if (!formName.trim() || !formPhone.trim()) {
            Alert.alert('Missing Info', 'Please enter a name and phone number.');
            return;
        }
        // Strip non-digit characters and validate exactly 10 digits
        const digitsOnly = formPhone.replace(/\D/g, '');
        if (digitsOnly.length !== 10) {
            Alert.alert('Invalid Number', 'Phone number must be exactly 10 digits.');
            return;
        }
        const newContact: Contact = {
            name: formName.trim(),
            relation: formRelation.trim() || 'Other',
            phone: digitsOnly,
            initial: formName.trim()[0].toUpperCase(),
            color: CONTACT_COLORS[(editingIndex ?? contacts.length) % CONTACT_COLORS.length],
        };
        let updated: Contact[];
        if (editingIndex !== null) {
            updated = [...contacts];
            updated[editingIndex] = newContact;
        } else {
            updated = [...contacts, newContact];
        }
        setContacts(updated);
        setShowAddModal(false);
        saveSosConfig(autoCall, autoConsent, liveLocation, emergencyNumber);
    };

    const deleteContact = (idx: number) => {
        const updated = contacts.filter((_, i) => i !== idx);
        setContacts(updated);
        saveSosConfig(autoCall, autoConsent, liveLocation, emergencyNumber);
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Patient ID Card ── */}
                <View style={[styles.idCard, { backgroundColor: isDark ? '#1A2035' : '#1D4ED8' }]}>
                    <Text style={styles.idSmallLabel}>PATIENT ID</Text>
                    <Text style={styles.idValue}>{patientId ?? 'Loading…'}</Text>
                    <Text style={styles.idNote}>Your anonymous identifier — no personal data stored</Text>
                    <View style={styles.idBadgesRow}>
                        <View style={styles.idBadge}>
                            <Ionicons name="lock-closed" size={11} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.idBadgeText}>Encrypted</Text>
                        </View>
                        <View style={styles.idBadge}>
                            <Ionicons name="link" size={11} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.idBadgeText}>Polygon</Text>
                        </View>
                        <View style={styles.idBadge}>
                            <Ionicons name="shield-checkmark" size={11} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.idBadgeText}>Zero-PII</Text>
                        </View>
                    </View>
                </View>

                {/* ── SOS Configuration ── */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm, marginBottom: Spacing.sm }}>
                    <Text style={[styles.sectionLabel, { color: subColor, marginBottom: 0, marginTop: 0 }]}>
                        <Ionicons name="warning" size={11} color={subColor} />{'  '}SOS CONFIG
                    </Text>
                    {saveStatus !== 'idle' && (
                        <View style={[styles.saveBadge, {
                            backgroundColor: saveStatus === 'saving' ? 'rgba(59,130,246,0.12)' : saveStatus === 'saved' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        }]}>
                            <Ionicons
                                name={saveStatus === 'saving' ? 'sync' : saveStatus === 'saved' ? 'checkmark-circle' : 'alert-circle'}
                                size={11}
                                color={saveStatus === 'saving' ? '#3B82F6' : saveStatus === 'saved' ? '#10B981' : '#EF4444'}
                            />
                            <Text style={[styles.saveBadgeText, {
                                color: saveStatus === 'saving' ? '#3B82F6' : saveStatus === 'saved' ? '#10B981' : '#EF4444',
                            }]}>
                                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Error'}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    <ToggleRow label="Auto-call emergency" sub={`Dial ${emergencyNumber} on SOS`} value={autoCall} onChange={handleAutoCall} isDark={isDark} textColor={textColor} subColor={subColor} />
                    <View style={[styles.div, { backgroundColor: divColor }]} />
                    <ToggleRow label="Auto-consent data share" sub="Share data when unconscious" value={autoConsent} onChange={handleAutoConsent} isDark={isDark} textColor={textColor} subColor={subColor} />
                    <View style={[styles.div, { backgroundColor: divColor }]} />
                    <ToggleRow label="Live location sharing" sub="GPS streamed until stopped" value={liveLocation} onChange={handleLiveLocation} isDark={isDark} textColor={textColor} subColor={subColor} />
                    <View style={[styles.div, { backgroundColor: divColor }]} />
                    <View style={styles.row}>
                        <Text style={[styles.rowLabel, { color: textColor }]}>Emergency number</Text>
                        <TextInput
                            style={[styles.numInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}
                            value={emergencyNumber}
                            onChangeText={handleEmergencyNumber}
                            keyboardType="phone-pad"
                            maxLength={5}
                        />
                    </View>
                </View>

                {/* ── Emergency Contacts ── */}
                <Text style={[styles.sectionLabel, { color: subColor }]}>EMERGENCY CONTACTS</Text>
                <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    {contacts.map((c, i) => (
                        <React.Fragment key={`${c.name}-${i}`}>
                            <View style={styles.contactRow}>
                                <View style={[styles.avatar, { backgroundColor: c.color + '22' }]}>
                                    <Text style={[styles.avatarText, { color: c.color }]}>{c.initial}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.rowLabel, { color: textColor }]}>{c.name}</Text>
                                    <Text style={[styles.contactSub, { color: subColor }]}>{c.relation} · {c.phone}</Text>
                                </View>
                                <TouchableOpacity style={[styles.editBtn, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} onPress={() => openEditContact(i)}>
                                    <Text style={[styles.editBtnText, { color: subColor }]}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.deleteBtn]} onPress={() => deleteContact(i)}>
                                    <Text style={styles.deleteBtnText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            {i < contacts.length - 1 && <View style={[styles.div, { backgroundColor: divColor }]} />}
                        </React.Fragment>
                    ))}
                    <View style={[styles.div, { backgroundColor: divColor }]} />
                    <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={openAddContact}>
                        <Text style={{ color: '#2563EB', fontSize: FontSizes.sm, fontWeight: '600' }}>+ Add Contact</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Wearable ── */}
                <Text style={[styles.sectionLabel, { color: subColor }]}>⌚ WEARABLE</Text>
                {patientId ? (
                    <WearableStatus patientId={patientId} isDark={isDark} />
                ) : (
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <Text style={[styles.contactSub, { color: subColor }]}>Register or log in to connect wearable data.</Text>
                    </View>
                )}

                {/* ── App Info ── */}
                <Text style={[styles.sectionLabel, { color: subColor }]}>APP INFO</Text>
                <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    {[
                        ['Version', '1.0.0'],
                        ['AI Engine', 'Groq · Llama 3.3 70B'],
                        ['Blockchain', 'Polygon (Mainnet)'],
                        ['Storage', 'IPFS via Pinata'],
                    ].map(([k, v], i, arr) => (
                        <React.Fragment key={k}>
                            <View style={styles.row}>
                                <Text style={[styles.rowLabel, { color: textColor }]}>{k}</Text>
                                <Text style={[styles.rowVal, { color: subColor }]}>{v}</Text>
                            </View>
                            {i < arr.length - 1 && <View style={[styles.div, { backgroundColor: divColor }]} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* ── Logout Button ── */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                    <Ionicons name="log-out" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={styles.logoutBtnText}>Log Out from MedRef</Text>
                </TouchableOpacity>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* ── Add/Edit Contact Modal ── */}
            <Modal visible={showAddModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: isDark ? '#1A2035' : '#FFFFFF' }]}>
                        <Text style={[styles.modalTitle, { color: textColor }]}>{editingIndex !== null ? 'Edit Contact' : 'Add Contact'}</Text>
                        <TextInput
                            style={[styles.modalInput, { color: textColor, borderColor: divColor, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}
                            placeholder="Name"
                            placeholderTextColor={subColor}
                            value={formName}
                            onChangeText={setFormName}
                        />
                        <TextInput
                            style={[styles.modalInput, { color: textColor, borderColor: divColor, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}
                            placeholder="Relation (e.g., Sister, Friend)"
                            placeholderTextColor={subColor}
                            value={formRelation}
                            onChangeText={setFormRelation}
                        />
                        <TextInput
                            style={[styles.modalInput, { color: textColor, borderColor: divColor, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}
                            placeholder="Phone number"
                            placeholderTextColor={subColor}
                            value={formPhone}
                            onChangeText={setFormPhone}
                            keyboardType="phone-pad"
                        />
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={[styles.modalBtn, { borderColor: divColor, borderWidth: 1 }]} onPress={() => setShowAddModal(false)}>
                                <Text style={[{ color: subColor, fontWeight: '600' }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#2563EB' }]} onPress={saveContact}>
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>{editingIndex !== null ? 'Save' : 'Add'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function ToggleRow({ label, sub, value, onChange, isDark, textColor, subColor }: any) {
    return (
        <View style={styles.row}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
                <Text style={[styles.rowSub, { color: subColor }]}>{sub}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ true: '#2563EB', false: isDark ? '#374151' : '#D1D5DB' }}
                thumbColor="#FFFFFF"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    scroll: { paddingHorizontal: Spacing.base, paddingTop: Platform.OS === 'android' ? 48 : Spacing.lg },
    idCard: { borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.xl },
    idSmallLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
    idValue: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 2, marginTop: 6 },
    idNote: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 8, lineHeight: 18 },
    idBadgesRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
    idBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, flexDirection: 'row', alignItems: 'center', gap: 5 },
    idBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: Spacing.sm, marginTop: Spacing.sm },
    card: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, marginBottom: Spacing.base },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
    rowLabel: { fontSize: FontSizes.sm, fontWeight: '600' },
    rowSub: { fontSize: 11, marginTop: 2 },
    rowVal: { fontSize: FontSizes.sm },
    div: { height: 1 },
    numInput: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 7, fontSize: FontSizes.base, fontWeight: '800', textAlign: 'center', width: 70 },
    contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 16, fontWeight: '800' },
    contactSub: { fontSize: 11, marginTop: 2 },
    editBtn: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md },
    editBtnText: { fontSize: 12, fontWeight: '600' },
    addBtn: { paddingVertical: 10, alignItems: 'center' },
    wearIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    connectBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.md },
    connectBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.sm },
    saveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
    saveBadgeText: { fontSize: 10, fontWeight: '700' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.base, marginTop: Spacing.xl, borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.05)' },
    logoutBtnText: { color: '#EF4444', fontSize: FontSizes.base, fontWeight: '700' },
    deleteBtn: { marginLeft: 6, paddingHorizontal: 8, paddingVertical: 6 },
    deleteBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.base },
    modalCard: { borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', maxWidth: 400 },
    modalTitle: { fontSize: FontSizes.lg, fontWeight: '700', marginBottom: Spacing.lg },
    modalInput: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSizes.base, marginBottom: Spacing.md },
    modalBtnRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
    modalBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center' },
});
