import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface BedCategory {
    available: number;
    total: number;
}

interface BedAvailabilityBarProps {
    icon: IoniconsName;
    label: string;
    bed: BedCategory;
    color: string;
    isDark: boolean;
    compact?: boolean;
}

/** Returns fill color based on availability percentage */
function getBarColor(available: number, total: number): string {
    if (total === 0) return '#6B7280';
    const pct = available / total;
    if (pct === 0) return '#EF4444';      // Red — zero
    if (pct < 0.15) return '#F97316';     // Orange — critical
    if (pct < 0.3) return '#F59E0B';      // Yellow — low
    if (pct < 0.6) return '#10B981';      // Green — moderate
    return '#22C55E';                      // Bright green — good
}

function getStatusLabel(available: number, total: number): string {
    if (total === 0) return 'N/A';
    if (available === 0) return 'FULL';
    const pct = available / total;
    if (pct < 0.15) return 'CRITICAL';
    if (pct < 0.3) return 'LOW';
    return 'AVAILABLE';
}

export default function BedAvailabilityBar({ icon, label, bed, color, isDark, compact }: BedAvailabilityBarProps) {
    const pct = bed.total > 0 ? (bed.available / bed.total) * 100 : 0;
    const barColor = getBarColor(bed.available, bed.total);
    const status = getStatusLabel(bed.available, bed.total);
    const textColor = isDark ? '#FFFFFF' : '#111827';
    const subColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
    const trackBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

    if (compact) {
        return (
            <View style={styles.compactRow}>
                <Ionicons name={icon} size={14} color={color} />
                <Text style={[styles.compactLabel, { color: subColor }]}>{label}</Text>
                <View style={[styles.compactTrack, { backgroundColor: trackBg }]}>
                    <View style={[styles.compactFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={[styles.compactCount, { color: barColor }]}>
                    {bed.available}/{bed.total}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.row}>
            <View style={styles.labelWrap}>
                <View style={[styles.iconBg, { backgroundColor: color + '18' }]}>
                    <Ionicons name={icon} size={16} color={color} />
                </View>
                <View>
                    <Text style={[styles.label, { color: textColor }]}>{label}</Text>
                    <Text style={[styles.statusLabel, { color: barColor }]}>{status}</Text>
                </View>
            </View>

            <View style={{ flex: 1, marginHorizontal: 12 }}>
                <View style={[styles.track, { backgroundColor: trackBg }]}>
                    <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
                </View>
            </View>

            <View style={styles.countWrap}>
                <Text style={[styles.countAvail, { color: barColor }]}>{bed.available}</Text>
                <Text style={[styles.countTotal, { color: subColor }]}>/{bed.total}</Text>
            </View>
        </View>
    );
}

/** Helper to render all 6 bed types for a hospital */
export function BedAvailabilityGrid({ data, isDark, compact }: {
    data: { general: BedCategory; icu: BedCategory; nicu: BedCategory; ventilator: BedCategory; ot: BedCategory; emergency: BedCategory };
    isDark: boolean;
    compact?: boolean;
}) {
    const rows: { key: string; label: string; icon: IoniconsName; color: string }[] = [
        { key: 'general', label: 'General', icon: 'bed', color: '#3B82F6' },
        { key: 'icu', label: 'ICU', icon: 'pulse', color: '#EF4444' },
        { key: 'nicu', label: 'NICU', icon: 'heart', color: '#EC4899' },
        { key: 'ventilator', label: 'Vent.', icon: 'fitness', color: '#8B5CF6' },
        { key: 'ot', label: 'OT', icon: 'cut', color: '#F59E0B' },
        { key: 'emergency', label: 'ER', icon: 'car', color: '#EF4444' },
    ];

    return (
        <View style={compact ? styles.compactGrid : undefined}>
            {rows.map(r => (
                <BedAvailabilityBar
                    key={r.key}
                    icon={r.icon}
                    label={r.label}
                    bed={(data as any)[r.key]}
                    color={r.color}
                    isDark={isDark}
                    compact={compact}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    },
    labelWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 8, width: 110,
    },
    iconBg: {
        width: 30, height: 30, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
    },
    label: { fontSize: 13, fontWeight: '600' },
    statusLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 1 },
    track: { height: 10, borderRadius: 5, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 5 },
    countWrap: { flexDirection: 'row', alignItems: 'baseline', minWidth: 50 },
    countAvail: { fontSize: 16, fontWeight: '800' },
    countTotal: { fontSize: 11, fontWeight: '500' },

    // Compact
    compactGrid: { gap: 4 },
    compactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    compactLabel: { fontSize: 11, fontWeight: '600', width: 40 },
    compactTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    compactFill: { height: '100%', borderRadius: 3 },
    compactCount: { fontSize: 11, fontWeight: '700', minWidth: 38, textAlign: 'right' },
});
