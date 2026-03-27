import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FontSizes, FontWeights, Spacing, Radius } from '@/constants/theme';
import { usePatient } from '@/hooks/use-patient';

const API_BASE = 'http://localhost:3000/api';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TYPE_COLORS: Record<string, string> = { analysis: '#3B82F6', upload: '#8B5CF6', emergency: '#EF4444', checkin: '#10B981', scan: '#7C3AED' };
const TYPE_ICONS: Record<string, IoniconsName> = { analysis: 'sparkles', upload: 'cloud-upload', emergency: 'flash', checkin: 'qr-code', scan: 'camera' };

interface TimelineItem {
    id: string; type: string; title: string; date: string;
    desc: string; urgency: string | null; urgencyColor: string | null;
    txHash?: string; ipfsHash?: string; onChain?: boolean;
}

export default function HistoryScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const isDark = colorScheme === 'dark';
    const bg = isDark ? '#0A0F1A' : '#F0F4FF';
    const cardBg = isDark ? '#1A2035' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const subColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
    const textColor = isDark ? '#FFF' : '#111827';
    const { patientId } = usePatient();

    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!patientId) {
            setTimeline([]);
            return;
        }

        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/documents/${patientId}`);
                const json = await res.json();
                if (json.success && json.data?.documents?.length > 0) {
                    const chainItems: TimelineItem[] = json.data.documents.map((d: any) => ({
                        id: d.id,
                        type: 'upload',
                        title: `${(d.docType || 'document').replace('_', ' ')} Uploaded`,
                        date: d.date || 'On-chain',
                        desc: `IPFS: ${d.ipfsHash?.substring(0, 16)}... · On-chain record #${d.recordId}`,
                        urgency: null,
                        urgencyColor: null,
                        txHash: d.txHash,
                        ipfsHash: d.ipfsHash,
                        onChain: true,
                    }));
                    setTimeline(chainItems);
                } else {
                    setTimeline([]);
                }
            } catch {
                setTimeline([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [patientId]);

    // Compute stats
    const stats = [
        { iconName: 'document-text' as IoniconsName, iconColor: '#8B5CF6', iconBg: 'rgba(139,92,246,0.12)', value: String(timeline.filter(t => t.type === 'upload').length), label: 'Documents' },
        { iconName: 'sparkles' as IoniconsName, iconColor: '#3B82F6', iconBg: 'rgba(59,130,246,0.12)', value: String(timeline.filter(t => t.type === 'analysis').length), label: 'Analyses' },
        { iconName: 'flash' as IoniconsName, iconColor: '#EF4444', iconBg: 'rgba(239,68,68,0.12)', value: String(timeline.filter(t => t.type === 'emergency').length), label: 'Emergencies' },
        { iconName: 'link' as IoniconsName, iconColor: '#8B5CF6', iconBg: 'rgba(139,92,246,0.12)', value: String(timeline.filter(t => t.onChain).length), label: 'On-chain' },
    ];

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.title, { color: textColor }]}>History</Text>
                        <Text style={[styles.sub, { color: subColor }]}>Your medical timeline · Blockchain-verified</Text>
                    </View>
                    {loading && <ActivityIndicator color="#8B5CF6" />}
                </View>

                <View style={styles.statsRow}>
                    {stats.map((s) => (
                        <View key={s.label} style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={[styles.statIconBadge, { backgroundColor: s.iconBg }]}>
                                <Ionicons name={s.iconName} size={16} color={s.iconColor} />
                            </View>
                            <Text style={[styles.statVal, { color: textColor }]}>{s.value}</Text>
                            <Text style={[styles.statLabel, { color: subColor }]}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                <Text style={[styles.sectionLabel, { color: subColor }]}>TIMELINE</Text>
                <View style={styles.timeline}>
                    {timeline.map((item, i) => {
                        const dotColor = TYPE_COLORS[item.type] || '#6B7280';
                        const iconName = TYPE_ICONS[item.type] || 'document';
                        const isLast = i === timeline.length - 1;
                        return (
                            <View key={item.id + '-' + i} style={styles.timelineRow}>
                                <View style={styles.spine}>
                                    <View style={[styles.dot, { backgroundColor: dotColor }]} />
                                    {!isLast && <View style={[styles.line, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }]} />}
                                </View>
                                <TouchableOpacity style={[styles.timeCard, { backgroundColor: cardBg, borderColor: cardBorder }]} activeOpacity={0.8}>
                                    <View style={styles.timeCardTop}>
                                        <View style={[styles.typeIcon, { backgroundColor: `${dotColor}18` }]}>
                                            <Ionicons name={iconName} size={16} color={dotColor} />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={[styles.timeTitle, { color: textColor }]}>{item.title}</Text>
                                            <Text style={[styles.timeDate, { color: subColor }]}>{item.date}</Text>
                                        </View>
                                        {item.urgency && (
                                            <View style={[styles.urgencyBadge, { backgroundColor: `${item.urgencyColor}18` }]}>
                                                <Text style={[styles.urgencyText, { color: item.urgencyColor! }]}>{item.urgency}</Text>
                                            </View>
                                        )}
                                        {item.onChain && !item.urgency && (
                                            <View style={[styles.urgencyBadge, { backgroundColor: 'rgba(139,92,246,0.1)' }]}>
                                                <Ionicons name="link" size={10} color="#8B5CF6" />
                                                <Text style={{ color: '#8B5CF6', fontSize: 9, fontWeight: '700', marginLeft: 3 }}>CHAIN</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[styles.timeDesc, { color: subColor }]}>{item.desc}</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>
                <View style={{ height: 120 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    scroll: { paddingHorizontal: Spacing.base, paddingTop: Platform.OS === 'android' ? 48 : Spacing.lg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
    title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    sub: { fontSize: FontSizes.sm, marginTop: 4 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.xl },
    statCard: { flex: 1, borderRadius: Radius.lg, borderWidth: 1, padding: 10, alignItems: 'center', gap: 4 },
    statIconBadge: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    statVal: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: Spacing.base },
    timeline: { gap: 0 },
    timelineRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },
    spine: { width: 20, alignItems: 'center', paddingTop: 16 },
    dot: { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
    line: { width: 2, flex: 1, marginTop: 4 },
    timeCard: { flex: 1, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.md },
    timeCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    timeTitle: { fontSize: FontSizes.sm, fontWeight: '700' },
    timeDate: { fontSize: 11, marginTop: 2 },
    urgencyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, flexDirection: 'row', alignItems: 'center' },
    urgencyText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    timeDesc: { fontSize: 12, lineHeight: 18 },
});
