import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, SafeAreaView,
    TouchableOpacity, Platform, StatusBar, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FontSizes, FontWeights, Spacing, Radius } from '@/constants/theme';
import { usePatient } from '@/hooks/use-patient';

const API_BASE = 'http://localhost:3000/api';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const DOC_TYPE_META: Record<string, { iconName: IoniconsName; iconColor: string; iconBg: string }> = {
    lab_report: { iconName: 'flask', iconColor: '#10B981', iconBg: 'rgba(16,185,129,0.12)' },
    prescription: { iconName: 'medical', iconColor: '#3B82F6', iconBg: 'rgba(59,130,246,0.12)' },
    xray_report: { iconName: 'scan-circle', iconColor: '#8B5CF6', iconBg: 'rgba(139,92,246,0.12)' },
    discharge_summary: { iconName: 'document-text', iconColor: '#F97316', iconBg: 'rgba(249,115,22,0.12)' },
    consultation_note: { iconName: 'chatbubble-ellipses', iconColor: '#06B6D4', iconBg: 'rgba(6,182,212,0.12)' },
    vaccination_record: { iconName: 'shield-checkmark', iconColor: '#10B981', iconBg: 'rgba(16,185,129,0.12)' },
    general: { iconName: 'document', iconColor: '#6B7280', iconBg: 'rgba(107,114,128,0.12)' },
};

interface DocItem {
    id: string; type: string; name: string; date: string;
    confidence: number; tags: string[]; onChain: boolean;
    ipfsHash?: string; txHash?: string;
}

export default function DocumentsScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const isDark = colorScheme === 'dark';
    const bg = isDark ? '#0A0F1A' : '#F0F4FF';
    const cardBg = isDark ? '#1A2035' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const subColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
    const textColor = isDark ? '#FFF' : '#111827';
    const { patientId } = usePatient();

    const [docs, setDocs] = useState<DocItem[]>([]);
    const [scanning, setScanning] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadName, setUploadName] = useState('');
    const [uploadType, setUploadType] = useState('lab_report');
    const [scanResult, setScanResult] = useState<any>(null);
    const [showScanResult, setShowScanResult] = useState(false);

    useEffect(() => {
        if (!patientId) {
            setDocs([]);
            return;
        }

        (async () => {
            try {
                const res = await fetch(`${API_BASE}/documents/${patientId}`);
                const json = await res.json();
                if (json.success && Array.isArray(json.data?.documents)) {
                    const mapped: DocItem[] = json.data.documents.map((d: any) => ({
                        id: d.id,
                        type: d.docType || 'general',
                        name: (d.docType || 'document').replace('_', ' '),
                        date: d.date || 'Unknown date',
                        confidence: 1,
                        tags: [d.docType || 'document'],
                        onChain: Boolean(d.onChain),
                        ipfsHash: d.ipfsHash,
                        txHash: d.txHash,
                    }));
                    setDocs(mapped);
                } else {
                    setDocs([]);
                }
            } catch {
                setDocs([]);
            }
        })();
    }, [patientId]);

    const handleUpload = async () => {
        if (!uploadName.trim()) {
            Alert.alert('Missing Info', 'Please enter a document name.');
            return;
        }
        setUploading(true);
        setShowUploadModal(false);
        try {
            if (!patientId) {
                Alert.alert('Patient Required', 'Please register or log in before uploading.');
                return;
            }

            const res = await fetch(`${API_BASE}/documents/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId,
                    documentType: uploadType,
                    fileName: uploadName,
                    documentData: JSON.stringify({ name: uploadName, type: uploadType, content: 'encrypted-document-data' }),
                }),
            });
            const json = await res.json();
            if (json.success) {
                const d = json.data;
                setDocs((prev) => [{
                    id: d.documentId,
                    type: uploadType,
                    name: uploadName,
                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    confidence: 1.0,
                    tags: [uploadType.replace('_', ' ')],
                    onChain: d.storedOnChain,
                    ipfsHash: d.ipfsHash,
                    txHash: d.txHash,
                }, ...prev]);
                Alert.alert(
                    '✅ Uploaded Successfully',
                    `Document: ${uploadName}\nIPFS: ${d.ipfsHash?.substring(0, 20)}...\nBlockchain: ${d.storedOnChain ? 'Stored on Polygon' : 'Pending'}\nTx: ${d.txHash?.substring(0, 20)}...`
                );
                setUploadName('');
            }
        } catch {
            Alert.alert('Upload Error', 'Could not reach server.');
        } finally {
            setUploading(false);
        }
    };

    const handleScan = async () => {
        if (!uploadName.trim()) {
            Alert.alert('Input Required', 'Enter OCR text in the document name field before scanning.');
            return;
        }

        setScanning(true);
        try {
            const res = await fetch(`${API_BASE}/documents/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ocrText: uploadName.trim() }),
            });
            const json = await res.json();
            if (json.success) {
                setScanResult(json.data);
                setShowScanResult(true);
            } else {
                Alert.alert('Scan Error', json.error || 'Scan failed.');
            }
        } catch {
            Alert.alert('Scan Error', 'Could not reach server.');
        } finally {
            setScanning(false);
        }
    };

    const getDocMeta = (type: string) => DOC_TYPE_META[type] || DOC_TYPE_META.general;

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.title, { color: textColor }]}>Records</Text>
                        <Text style={[styles.sub, { color: subColor }]}>Encrypted · Blockchain-secured</Text>
                    </View>
                    <View style={[styles.chainBadge, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }]}>
                        <Ionicons name="link" size={13} color="#8B5CF6" />
                        <Text style={styles.chainText}>Polygon</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2563EB' }]} activeOpacity={0.85} onPress={() => setShowUploadModal(true)} disabled={uploading}>
                        {uploading ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="cloud-upload" size={24} color="#FFF" />}
                        <Text style={styles.actionBtnText}>{uploading ? 'Uploading…' : 'Upload'}</Text>
                        <Text style={styles.actionBtnSub}>Encrypt → IPFS → Chain</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#7C3AED' }]} activeOpacity={0.85} onPress={handleScan} disabled={scanning}>
                        {scanning ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="camera" size={24} color="#FFF" />}
                        <Text style={styles.actionBtnText}>{scanning ? 'Scanning…' : 'Scan & Extract'}</Text>
                        <Text style={styles.actionBtnSub}>Groq AI OCR</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statChip, { backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.06)' }]}>
                        <Text style={{ color: '#8B5CF6', fontWeight: '800', fontSize: 16 }}>{docs.filter(d => d.onChain).length}</Text>
                        <Text style={{ color: '#8B5CF6', fontSize: 10, fontWeight: '600' }}>On-chain</Text>
                    </View>
                    <View style={[styles.statChip, { backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.06)' }]}>
                        <Text style={{ color: '#3B82F6', fontWeight: '800', fontSize: 16 }}>{docs.length}</Text>
                        <Text style={{ color: '#3B82F6', fontSize: 10, fontWeight: '600' }}>Total</Text>
                    </View>
                    <View style={[styles.statChip, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.06)' }]}>
                        <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 16 }}>🔒</Text>
                        <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '600' }}>AES-256</Text>
                    </View>
                </View>

                {/* Documents List */}
                <Text style={[styles.sectionLabel, { color: subColor }]}>YOUR DOCUMENTS</Text>
                {docs.map((doc) => {
                    const meta = getDocMeta(doc.type);
                    return (
                        <TouchableOpacity
                            key={doc.id}
                            style={[styles.docCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                            activeOpacity={0.8}
                        >
                            <View style={styles.docLeft}>
                                <View style={[styles.docIcon, { backgroundColor: meta.iconBg }]}>
                                    <Ionicons name={meta.iconName} size={22} color={meta.iconColor} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.docTopRow}>
                                        <Text style={[styles.docType, { color: subColor }]}>{doc.type.replace('_', ' ').toUpperCase()}</Text>
                                        {doc.onChain && (
                                            <View style={styles.chainMini}>
                                                <Ionicons name="link" size={10} color="#8B5CF6" />
                                                <Text style={styles.chainMiniText}>On-chain</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[styles.docName, { color: textColor }]}>{doc.name}</Text>
                                    <Text style={[styles.docDate, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }]}>{doc.date}</Text>
                                    <View style={styles.tagRow}>
                                        {doc.tags.map((t) => (
                                            <View key={t} style={[styles.tag, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                                <Text style={[styles.tagText, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>{t}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                            <View style={styles.confidence}>
                                <Text style={[styles.confVal, { color: doc.confidence >= 0.9 ? '#10B981' : doc.confidence >= 0.8 ? '#F59E0B' : '#EF4444' }]}>
                                    {Math.round(doc.confidence * 100)}%
                                </Text>
                                <Text style={[styles.confLabel, { color: subColor }]}>AI</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Upload Modal */}
            <Modal visible={showUploadModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: isDark ? '#1A2035' : '#FFFFFF' }]}>
                        <Text style={[styles.modalTitle, { color: textColor }]}>Upload Document</Text>
                        <Text style={[{ color: subColor, fontSize: 12, marginBottom: 16 }]}>Encrypt → IPFS → Polygon</Text>

                        <TextInput
                            style={[styles.modalInput, { color: textColor, borderColor: cardBorder, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}
                            placeholder="Document name"
                            placeholderTextColor={subColor}
                            value={uploadName}
                            onChangeText={setUploadName}
                        />

                        <Text style={[styles.typeLabel, { color: subColor }]}>DOCUMENT TYPE</Text>
                        <View style={styles.typeGrid}>
                            {['lab_report', 'prescription', 'xray_report', 'discharge_summary', 'consultation_note', 'vaccination_record'].map((t) => {
                                const m = getDocMeta(t);
                                return (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.typeBtn, {
                                            backgroundColor: uploadType === t ? `${m.iconColor}18` : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                                            borderColor: uploadType === t ? m.iconColor : 'transparent',
                                        }]}
                                        onPress={() => setUploadType(t)}
                                    >
                                        <Ionicons name={m.iconName} size={16} color={m.iconColor} />
                                        <Text style={[styles.typeBtnText, { color: uploadType === t ? m.iconColor : subColor }]}>
                                            {t.replace('_', ' ')}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={[styles.modalBtn, { borderColor: cardBorder, borderWidth: 1 }]} onPress={() => setShowUploadModal(false)}>
                                <Text style={{ color: subColor, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#2563EB' }]} onPress={handleUpload}>
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Upload & Encrypt</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Scan Result Modal */}
            <Modal visible={showScanResult} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: isDark ? '#1A2035' : '#FFFFFF', maxHeight: '80%' }]}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>📄 Scan Results</Text>
                            {scanResult && (
                                <>
                                    <View style={[styles.scanBadge, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                                        <Text style={{ color: '#10B981', fontWeight: '800' }}>
                                            {Math.round((scanResult.confidenceScore || 0) * 100)}% confidence
                                        </Text>
                                    </View>
                                    <Text style={[styles.scanSection, { color: subColor }]}>TYPE</Text>
                                    <Text style={[styles.scanVal, { color: textColor }]}>{(scanResult.documentType || '').replace('_', ' ').toUpperCase()}</Text>
                                    <Text style={[styles.scanSection, { color: subColor }]}>SUMMARY</Text>
                                    <Text style={[styles.scanVal, { color: textColor }]}>{scanResult.summary}</Text>
                                    {scanResult.labValues && scanResult.labValues.length > 0 && (
                                        <>
                                            <Text style={[styles.scanSection, { color: subColor }]}>LAB VALUES</Text>
                                            {scanResult.labValues.map((lv: any, i: number) => (
                                                <View key={i} style={[styles.labRow, { borderColor: cardBorder }]}>
                                                    <Text style={[{ color: textColor, fontWeight: '600', flex: 1, fontSize: 13 }]}>{lv.testName}</Text>
                                                    <Text style={[{ color: lv.status === 'abnormal' ? '#EF4444' : '#10B981', fontWeight: '700', fontSize: 13 }]}>{lv.value} {lv.unit}</Text>
                                                </View>
                                            ))}
                                        </>
                                    )}
                                    {scanResult.tags && (
                                        <>
                                            <Text style={[styles.scanSection, { color: subColor }]}>TAGS</Text>
                                            <View style={styles.tagRow}>
                                                {scanResult.tags.map((t: string) => (
                                                    <View key={t} style={[styles.tag, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                                        <Text style={[styles.tagText, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>{t}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </>
                                    )}
                                </>
                            )}
                        </ScrollView>
                        <TouchableOpacity style={[styles.modalBtnFull, { backgroundColor: '#7C3AED', marginTop: 16 }]} onPress={() => setShowScanResult(false)}>
                            <Text style={{ color: '#FFF', fontWeight: '700' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    scroll: { paddingHorizontal: Spacing.base, paddingTop: Platform.OS === 'android' ? 48 : Spacing.lg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
    title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    sub: { fontSize: FontSizes.sm, marginTop: 4 },
    chainBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1 },
    chainText: { color: '#8B5CF6', fontSize: 12, fontWeight: '700' },
    actionRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    actionBtn: { flex: 1, borderRadius: Radius.xl, padding: Spacing.base, alignItems: 'center', gap: 4 },
    actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.sm },
    actionBtnSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
    statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
    statChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.lg, gap: 2 },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: Spacing.md },
    docCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center' },
    docLeft: { flex: 1, flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
    docIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    docTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    docType: { fontSize: 11, fontWeight: '600' },
    chainMini: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    chainMiniText: { fontSize: 10, color: '#8B5CF6', fontWeight: '600' },
    docName: { fontSize: FontSizes.sm, fontWeight: '700' },
    docDate: { fontSize: 11, marginTop: 2, marginBottom: 6 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
    tagText: { fontSize: 10, fontWeight: '600' },
    confidence: { alignItems: 'center', marginLeft: 8 },
    confVal: { fontSize: 18, fontWeight: '800' },
    confLabel: { fontSize: 10, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.base },
    modalCard: { borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', maxWidth: 420 },
    modalTitle: { fontSize: FontSizes.lg, fontWeight: '700', marginBottom: 4 },
    modalInput: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSizes.base, marginBottom: Spacing.md },
    typeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.sm },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
    typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1 },
    typeBtnText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
    modalBtnRow: { flexDirection: 'row', gap: Spacing.md },
    modalBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center' },
    modalBtnFull: { paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', width: '100%' },
    scanBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, marginBottom: Spacing.md },
    scanSection: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: Spacing.md, marginBottom: 4 },
    scanVal: { fontSize: 14, lineHeight: 20 },
    labRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
});
