import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontSizes, FontWeights, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface EmergencySummaryCardProps {
    summary: {
        criticalAlerts?: string[];
        chronicConditions?: string[];
        currentMedications?: string[];
        relevantSurgicalHistory?: string[];
        recentLabHighlights?: string[];
        bloodGroup?: string;
        currentEmergency?: {
            description?: string;
            condition?: string;
            heartRate?: number;
            spO2?: number;
            urgencyLevel?: string;
        };
        aiRecommendation?: string;
        estimatedReadTime?: string;
    };
}

function Section({ icon, title, items, color, colors }: {
    icon: string; title: string; items: string[]; color: string; colors: any;
}) {
    if (!items || items.length === 0) return null;
    return (
        <View style={[sStyles.wrap, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }, Shadows.sm]}>
            <Text style={[sStyles.title, { color }]}>{icon} {title}</Text>
            {items.map((item, i) => (
                <View key={i} style={sStyles.item}>
                    <Text style={[sStyles.bullet, { color }]}>•</Text>
                    <Text style={[sStyles.text, { color: colors.text }]}>{item}</Text>
                </View>
            ))}
        </View>
    );
}

export default function EmergencySummaryCard({ summary }: EmergencySummaryCardProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const em = summary.currentEmergency;
    const urgency = em?.urgencyLevel || 'CRITICAL';

    return (
        <View>
            {/* Urgency Banner */}
            <View style={[styles.urgencyBanner, { backgroundColor: colors.emergency }]}>
                <Text style={styles.urgencyText}>🚨 {urgency}</Text>
                <Text style={styles.urgencyRead}>
                    Estimated read time: {summary.estimatedReadTime || '15 seconds'}
                </Text>
            </View>

            {/* Current Emergency */}
            {em && (
                <View style={[styles.emergencyCard, { backgroundColor: colors.emergencyLight, borderColor: colors.emergency }]}>
                    <Text style={[styles.emergLabel, { color: colors.emergency }]}>CURRENT EMERGENCY</Text>
                    <Text style={[styles.emergDesc, { color: colors.text }]}>{em.description || 'Emergency situation'}</Text>
                    {em.condition && (
                        <Text style={[styles.emergCond, { color: colors.textSecondary }]}>{em.condition}</Text>
                    )}
                    <View style={styles.emergVitals}>
                        {em.heartRate && (
                            <Text style={[styles.emergVital, { color: colors.emergency }]}>❤️ {em.heartRate} BPM</Text>
                        )}
                        {em.spO2 && (
                            <Text style={[styles.emergVital, { color: colors.emergency }]}>🫁 {em.spO2}%</Text>
                        )}
                        {summary.bloodGroup && (
                            <Text style={[styles.emergVital, { color: colors.text }]}>🩸 {summary.bloodGroup}</Text>
                        )}
                    </View>
                </View>
            )}

            {/* Sections */}
            <Section icon="⚠️" title="Critical Alerts" items={summary.criticalAlerts || []} color={colors.emergency} colors={colors} />
            <Section icon="💊" title="Current Medications" items={summary.currentMedications || []} color={colors.primary} colors={colors} />
            <Section icon="🩺" title="Chronic Conditions" items={summary.chronicConditions || []} color={colors.warning} colors={colors} />
            <Section icon="🔪" title="Surgical History" items={summary.relevantSurgicalHistory || []} color={colors.accent} colors={colors} />
            <Section icon="🧪" title="Recent Lab Values" items={summary.recentLabHighlights || []} color={colors.primary} colors={colors} />

            {/* AI Recommendation */}
            {summary.aiRecommendation && (
                <View style={[styles.aiCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                    <Text style={[styles.aiTitle, { color: colors.primary }]}>🤖 AI Recommendation</Text>
                    <Text style={[styles.aiText, { color: colors.text }]}>{summary.aiRecommendation}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    urgencyBanner: { borderRadius: Radius.xl, padding: Spacing.base, alignItems: 'center', marginBottom: Spacing.base },
    urgencyText: { color: '#FFF', fontSize: FontSizes.xl, fontWeight: FontWeights.extrabold },
    urgencyRead: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.xs, marginTop: Spacing.xs },
    emergencyCard: { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing.base, marginBottom: Spacing.base },
    emergLabel: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold, letterSpacing: 1.2 },
    emergDesc: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, marginTop: Spacing.sm },
    emergCond: { fontSize: FontSizes.sm, marginTop: Spacing.xs },
    emergVitals: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md },
    emergVital: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
    aiCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, marginBottom: Spacing.xl },
    aiTitle: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold, marginBottom: Spacing.sm },
    aiText: { fontSize: FontSizes.base, lineHeight: 22 },
});

const sStyles = StyleSheet.create({
    wrap: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm },
    title: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold, marginBottom: Spacing.sm },
    item: { flexDirection: 'row', gap: Spacing.sm, marginBottom: 4 },
    bullet: { fontSize: FontSizes.base, fontWeight: FontWeights.bold },
    text: { fontSize: FontSizes.sm, flex: 1, lineHeight: 20 },
});
