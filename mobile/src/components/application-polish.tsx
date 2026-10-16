import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PathoraColors, PathoraFonts } from '@/constants/pathora-theme';

/** Lightweight, shared visual pieces for the two application workspaces. */
export function ApplicationMetric({
  value, label, tint = 'teal',
}: {
  value: number;
  label: string;
  tint?: 'teal' | 'amber' | 'muted';
}) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricLine, tint === 'amber' && styles.amberLine, tint === 'muted' && styles.mutedLine]} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

export function ApplicationFilter({
  title, count, selected, onPress,
}: {
  title: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.filter, selected && styles.filterSelected, pressed && styles.pressed]}>
      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{title}</Text>
      <View style={[styles.filterCountBox, selected && styles.filterCountBoxSelected]}>
        <Text style={[styles.filterCount, selected && styles.filterCountSelected]}>{count}</Text>
      </View>
    </Pressable>
  );
}

export function ApplicationDetailCard({
  label, children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.detailCard}>
      <View style={styles.detailAccent} />
      <Text style={styles.detailHeading}>{label}</Text>
      {children}
    </View>
  );
}

export function ApplicationDetailText({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.detailText, muted && styles.detailMuted]}>{children}</Text>;
}

const styles = StyleSheet.create({
  metric: {
    flex: 1, minWidth: 0, backgroundColor: PathoraColors.surface,
    borderColor: PathoraColors.border, borderWidth: 1,
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12, gap: 7,
  },
  metricLine: { width: 22, height: 4, borderRadius: 99, backgroundColor: PathoraColors.teal500 },
  amberLine: { backgroundColor: PathoraColors.amber500 },
  mutedLine: { backgroundColor: '#BBC3C7' },
  metricValue: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.extraBold, fontSize: 25, lineHeight: 32 },
  metricLabel: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 11.5, lineHeight: 17 },
  filter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 13, paddingVertical: 10,
    borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: PathoraColors.border,
  },
  filterSelected: { backgroundColor: PathoraColors.teal700, borderColor: PathoraColors.teal700 },
  filterText: { fontFamily: PathoraFonts.en.bold, fontSize: 12, color: PathoraColors.textSecondary },
  filterTextSelected: { color: '#FFFFFF' },
  filterCountBox: { backgroundColor: PathoraColors.paper, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  filterCountBoxSelected: { backgroundColor: 'rgba(255,255,255,0.18)' },
  filterCount: { fontFamily: PathoraFonts.en.bold, fontSize: 10, color: PathoraColors.textSecondary },
  filterCountSelected: { color: '#FFFFFF' },
  pressed: { opacity: 0.76 },
  detailCard: {
    backgroundColor: PathoraColors.surface, borderColor: PathoraColors.border,
    borderWidth: 1, borderRadius: 18, padding: 18, gap: 10,
  },
  detailAccent: { width: 24, height: 4, borderRadius: 99, backgroundColor: PathoraColors.teal500 },
  detailHeading: {
    fontFamily: PathoraFonts.en.bold, fontSize: 11, letterSpacing: 1.2,
    color: PathoraColors.teal700, textTransform: 'uppercase', marginBottom: 1,
  },
  detailText: { fontFamily: PathoraFonts.en.semiBold, fontSize: 14, lineHeight: 22, color: PathoraColors.ink900 },
  detailMuted: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.regular },
});
