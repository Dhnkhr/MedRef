import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, SafeAreaView,
    TouchableOpacity, Platform, StatusBar, ActivityIndicator, Alert, Modal, TextInput, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
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
    ipfsHash?: string; txHash?: string; recordId?: number;
}

interface ViewedDocument {
    name: string;
    type: string;
    date: string;
    content: string;
    ipfsHash?: string;
    gatewayUrl?: string;
    note?: string;
}

interface DebugInfo {
    dbEntryFound: boolean;
    hasEncryptionKey: boolean;
    keyLength: number;
    keyPreview: string | null;
    ipfsFetchOk: boolean;
    ipfsFetchError: string | null;
    canDecrypt: boolean;
    decryptError: string | null;
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
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewLoading, setViewLoading] = useState(false);
    const [viewedDoc, setViewedDoc] = useState<ViewedDocument | null>(null);
    const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
    const [debugLoading, setDebugLoading] = useState(false);
    const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

    const openOnGateway = async (ipfsHash?: string, gatewayUrl?: string) => {
        const url = gatewayUrl || (ipfsHash ? `https://gateway.pinata.cloud/ipfs/${ipfsHash}` : '');
        if (!url) {
            Alert.alert('Unavailable', 'No gateway URL found for this document.');
            return;
        }

        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) {
            Alert.alert('Open Failed', 'Could not open the Pinata URL on this device.');
            return;
        }

        await Linking.openURL(url);
    };

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
                        recordId: d.recordId,
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

    const pickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setSelectedFile(asset);
                setUploadName(asset.name || 'Document');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick file');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            Alert.alert('No File', 'Please select a file first');
            return;
        }
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

            // Read file content
            let fileContent = '';
            try {
                if (selectedFile.uri) {
                    const response = await fetch(selectedFile.uri);
                    const blob = await response.blob();
                    fileContent = await blob.text();
                }
            } catch (readError) {
                // If text reading fails, use base64 encoding
                fileContent = `File: ${selectedFile.name} (${selectedFile.size} bytes)`;
            }

            const res = await fetch(`${API_BASE}/documents/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId,
                    documentType: uploadType,
                    fileName: uploadName,
                    documentData: fileContent || JSON.stringify({ name: uploadName, type: uploadType, file: selectedFile.name }),
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
                    recordId: d.recordId,
                }, ...prev]);
                Alert.alert(
                    '✅ Uploaded Successfully',
                    `Document: ${uploadName}\nIPFS: ${d.ipfsHash?.substring(0, 20)}...\nBlockchain: ${d.storedOnChain ? 'Stored on Polygon' : 'Pending'}\nTx: ${d.txHash?.substring(0, 20)}...`
                );
                setUploadName('');
                setSelectedFile(null);
            } else {
                Alert.alert('Upload Error', json.error || 'Upload failed');
            }
        } catch (error) {
            Alert.alert('Upload Error', 'Could not reach server.');
        } finally {
            setUploading(false);
        }
    };

    const handleViewDocument = async (doc: DocItem) => {
        if (!patientId) {
            Alert.alert('Patient Required', 'Please register or log in first.');
            return;
        }

        setViewLoading(true);
        setShowViewModal(true);
        setSelectedDoc(doc);
        setDebugInfo(null);

        try {
            const routeId = doc.recordId ? String(doc.recordId) : doc.id;
            const res = await fetch(`${API_BASE}/documents/${patientId}/${routeId}`);
            const json = await res.json();

            if (!json.success) {
                throw new Error(json.error || 'Could not fetch document');
            }

            const data = json.data || {};
            const record = data.record || {};

            let content = '';
            if (typeof data.decryptedData === 'string' && data.decryptedData.trim().length > 0) {
                content = data.decryptedData;
            } else if (typeof data.ipfsData?.encrypted === 'string') {
                content = data.ipfsData.encrypted;
            } else {
                content = JSON.stringify(data.ipfsData || {}, null, 2);
            }

            setViewedDoc({
                name: record.fileName || doc.name,
                type: record.documentType || doc.type,
                date: doc.date,
                content,
                ipfsHash: record.ipfsHash || doc.ipfsHash,
                gatewayUrl: record.gatewayUrl,
                note: data.decryptError || data.note || data.ipfsFetchError,
            });
        } catch (error: any) {
            setViewedDoc(null);
            Alert.alert(
                'View Error',
                error?.message || 'Unable to load this document.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Open on Pinata',
                        onPress: () => {
                            openOnGateway(doc.ipfsHash);
                        },
                    },
                ]
            );
            setShowViewModal(false);
        } finally {
            setViewLoading(false);
        }
    };

    const runDebugCheck = async () => {
        if (!patientId || !selectedDoc) {
            return;
        }

        setDebugLoading(true);
        try {
            const routeId = selectedDoc.recordId ? String(selectedDoc.recordId) : selectedDoc.id;
            const res = await fetch(`${API_BASE}/documents/${patientId}/${routeId}/debug`);
            const json = await res.json();

            if (!json.success) {
                throw new Error(json.error || 'Debug check failed');
            }

            setDebugInfo(json.data as DebugInfo);
        } catch (error: any) {
            Alert.alert('Debug Error', error?.message || 'Could not run debug check');
        } finally {
            setDebugLoading(false);
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
                            onPress={() => handleViewDocument(doc)}
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

                        <TouchableOpacity style={[styles.filePickerBtn, { borderColor: selectedFile ? '#2563EB' : cardBorder, backgroundColor: selectedFile ? 'rgba(37,99,235,0.05)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)') }]} onPress={pickFile}>
                            <Ionicons name={selectedFile ? 'checkmark-circle' : 'document'} size={20} color={selectedFile ? '#2563EB' : subColor} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[{ color: selectedFile ? '#2563EB' : subColor, fontWeight: '600', fontSize: 13 }]}>
                                    {selectedFile ? 'File selected' : 'Select a file to upload'}
                                </Text>
                                <Text style={[{ color: subColor, fontSize: 11, marginTop: 2 }]}>
                                    {selectedFile ? selectedFile.name : 'Tap to browse'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TextInput
                            style={[styles.modalInput, { color: textColor, borderColor: cardBorder, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', marginTop: 12 }]}
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
                            <TouchableOpacity style={[styles.modalBtn, { borderColor: cardBorder, borderWidth: 1 }]} onPress={() => { setShowUploadModal(false); setSelectedFile(null); }}>
                                <Text style={{ color: subColor, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: selectedFile ? '#2563EB' : '#888', opacity: selectedFile ? 1 : 0.6 }]} onPress={handleUpload} disabled={!selectedFile || uploading}>
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

            {/* View Document Modal */}
            <Modal visible={showViewModal} transparent animationType="fade" onRequestClose={() => setShowViewModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: isDark ? '#1A2035' : '#FFFFFF', maxHeight: '85%' }]}>
                        {viewLoading ? (
                            <View style={{ paddingVertical: 28, alignItems: 'center', justifyContent: 'center' }}>
                                <ActivityIndicator size="small" color="#2563EB" />
                                <Text style={{ marginTop: 12, color: subColor, fontSize: 12 }}>Loading document...</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={[styles.modalTitle, { color: textColor }]}>View Document</Text>
                                {viewedDoc && (
                                    <ScrollView showsVerticalScrollIndicator={false}>
                                        <Text style={[styles.scanSection, { color: subColor }]}>NAME</Text>
                                        <Text style={[styles.scanVal, { color: textColor }]}>{viewedDoc.name}</Text>

                                        <Text style={[styles.scanSection, { color: subColor }]}>TYPE</Text>
                                        <Text style={[styles.scanVal, { color: textColor }]}>{viewedDoc.type.replace('_', ' ')}</Text>

                                        <Text style={[styles.scanSection, { color: subColor }]}>DATE</Text>
                                        <Text style={[styles.scanVal, { color: textColor }]}>{viewedDoc.date}</Text>

                                        {viewedDoc.ipfsHash && (
                                            <>
                                                <Text style={[styles.scanSection, { color: subColor }]}>IPFS HASH</Text>
                                                <Text style={[styles.scanVal, { color: textColor, fontSize: 12 }]}>{viewedDoc.ipfsHash}</Text>
                                            </>
                                        )}

                                        {viewedDoc.note && (
                                            <View style={[styles.scanBadge, { backgroundColor: 'rgba(245,158,11,0.15)', marginTop: 14 }]}>
                                                <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 12 }}>{viewedDoc.note}</Text>
                                            </View>
                                        )}

                                        <Text style={[styles.scanSection, { color: subColor, marginTop: 14 }]}>CONTENT</Text>
                                        <View style={[styles.labRow, { borderColor: cardBorder, alignItems: 'flex-start', paddingVertical: 10 }]}>
                                            <Text style={[{ color: textColor, fontSize: 12, lineHeight: 18 }]}>{viewedDoc.content || 'No preview available.'}</Text>
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.modalBtnFull, { backgroundColor: '#7C3AED', marginTop: 14 }]}
                                            onPress={() => openOnGateway(viewedDoc.ipfsHash, viewedDoc.gatewayUrl)}
                                        >
                                            <Text style={{ color: '#FFF', fontWeight: '700' }}>Open on Pinata</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.modalBtnFull, { backgroundColor: '#0EA5E9', marginTop: 10 }]}
                                            onPress={runDebugCheck}
                                            disabled={debugLoading}
                                        >
                                            {debugLoading ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Run Debug Check</Text>
                                            )}
                                        </TouchableOpacity>

                                        {debugInfo && (
                                            <View style={[styles.debugBox, { borderColor: cardBorder, backgroundColor: isDark ? 'rgba(14,165,233,0.08)' : 'rgba(14,165,233,0.06)' }]}>
                                                <Text style={[styles.debugTitle, { color: textColor }]}>Debug Status</Text>
                                                <Text style={[styles.debugLine, { color: subColor }]}>DB Entry: {debugInfo.dbEntryFound ? 'Yes' : 'No'}</Text>
                                                <Text style={[styles.debugLine, { color: subColor }]}>Encryption Key: {debugInfo.hasEncryptionKey ? 'Present' : 'Missing'}</Text>
                                                <Text style={[styles.debugLine, { color: subColor }]}>Key Length: {debugInfo.keyLength}</Text>
                                                <Text style={[styles.debugLine, { color: subColor }]}>IPFS Fetch: {debugInfo.ipfsFetchOk ? 'OK' : 'Failed'}</Text>
                                                <Text style={[styles.debugLine, { color: debugInfo.canDecrypt ? '#10B981' : '#EF4444' }]}>Decrypt: {debugInfo.canDecrypt ? 'Success' : 'Failed'}</Text>
                                                {!debugInfo.canDecrypt && debugInfo.decryptError && (
                                                    <Text style={[styles.debugLine, { color: '#F59E0B' }]}>Reason: {debugInfo.decryptError}</Text>
                                                )}
                                            </View>
                                        )}
                                    </ScrollView>
                                )}
                            </>
                        )}

                        <TouchableOpacity style={[styles.modalBtnFull, { backgroundColor: '#2563EB', marginTop: 16 }]} onPress={() => setShowViewModal(false)}>
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
    filePickerBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 12, marginBottom: Spacing.md },
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
    debugBox: { marginTop: 12, borderWidth: 1, borderRadius: Radius.md, padding: 10 },
    debugTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
    debugLine: { fontSize: 12, lineHeight: 18 },
});
