/**
 * Path | Reusable personalized internship card.
 * Uses only backend-supplied match and eligibility facts, and is shared by
 * Home, the complete discovery feed, and Favorites.
 */
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';
import type { InternInternship } from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import { WORK_MODE_LABELS } from '@/lib/internship-options';

function companyInitials(companyName: string): string {
  return (
    companyName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('') || '?'
  ).toUpperCase();
}

function Icon({ name, color = PathoraColors.textSecondary, size = 15 }: {
  name: SymbolViewProps['name']; color?: string; size?: number;
}) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}

type InternshipFeedCardProps = {
  item: InternInternship;
  onPress: () => void;
  onFavoritePress?: () => void;
  favoriteDisabled?: boolean;
};

export function InternshipFeedCard({
  item,
  onPress,
  onFavoritePress,
  favoriteDisabled = false,
}: InternshipFeedCardProps) {
  const shownSkills = item.skills.slice(0, 3);
  const remainingSkills = Math.max(0, item.skills.length - shownSkills.length);
  const matchedIds = new Set(item.matchedSkills.map((skill) => skill.id));
  const percent = Math.min(100, Math.max(0, Number.isFinite(item.relevancePercentage) ? item.relevancePercentage : 0));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title} at ${item.companyName}, ${item.relevancePercentage}% match. View internship details.`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.topRow}>
        <View style={styles.companyMark}>
          <Text style={styles.companyInitials}>{companyInitials(item.companyName)}</Text>
        </View>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>INTERNSHIP OPPORTUNITY</Text>
          <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
          <Text numberOfLines={1} style={styles.companyName}>{item.companyName}</Text>
        </View>
        {onFavoritePress ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onFavoritePress();
            }}
            disabled={favoriteDisabled}
            accessibilityRole="button"
            accessibilityLabel={item.favorited ? 'Remove from favorites' : 'Save internship to favorites'}
            accessibilityState={{ selected: item.favorited, disabled: favoriteDisabled }}
            hitSlop={9}
            style={({ pressed }) => [
              styles.favorite,
              item.favorited && styles.favoriteActive,
              pressed && !favoriteDisabled && styles.favoritePressed,
              favoriteDisabled && styles.favoriteDisabled,
            ]}>
            <Icon
              name={item.favorited
                ? { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }
                : { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }}
              color={item.favorited ? PathoraColors.teal700 : PathoraColors.textSecondary}
              size={21}
            />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Icon name={{ ios: 'mappin.and.ellipse', android: 'place', web: 'place' }} size={14} />
          <Text numberOfLines={1} style={styles.metaText}>{item.location}</Text>
        </View>
        <View style={styles.metaChip}>
          <Icon name={{ ios: 'building.2', android: 'domain', web: 'domain' }} size={14} />
          <Text style={styles.metaText}>{WORK_MODE_LABELS[item.workMode]}</Text>
        </View>
      </View>

      <View style={styles.matchPanel}>
        <View style={styles.matchHeading}>
          <View style={styles.matchTitleWrap}>
            <Icon name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={15} color={PathoraColors.teal700} />
            <Text style={styles.matchLabel}>YOUR MATCH</Text>
          </View>
          <Text style={styles.matchPercent}>{item.relevancePercentage}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%` as `${number}%` }]} />
        </View>
        <Text style={styles.matchExplanation}>
          {item.matchedSkillCount > 0
            ? `${item.matchedSkillCount} of ${item.totalRequiredSkillCount} required skills matched${item.majorMatch ? ' · Major match' : ''}`
            : item.majorMatch
              ? 'Matches your major'
              : 'See how this opportunity fits your profile'}
        </Text>
      </View>

      {shownSkills.length > 0 && (
        <View style={styles.skillsRow}>
          {shownSkills.map((skill) => (
            <View key={skill.id} style={[styles.skillChip, matchedIds.has(skill.id) && styles.skillChipMatched]}>
              {matchedIds.has(skill.id) && (
                <Icon name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={10} color={PathoraColors.teal700} />
              )}
              <Text style={[styles.skillText, matchedIds.has(skill.id) && styles.skillTextMatched]} numberOfLines={1}>
                {skill.name}
              </Text>
            </View>
          ))}
          {remainingSkills > 0 && (
            <View style={styles.moreSkills}><Text style={styles.moreSkillsText}>+{remainingSkills}</Text></View>
          )}
        </View>
      )}

      <View style={styles.divider} />
      <View style={styles.footer}>
        <View style={styles.deadlineWrap}>
          <Icon name={{ ios: 'calendar', android: 'event', web: 'event' }} size={15} color={PathoraColors.teal600} />
          <Text numberOfLines={2} style={styles.deadlineText}>Apply by {formatDisplayDate(item.applicationDeadline)}</Text>
        </View>
        <View style={styles.detailsAction}>
          <Text style={styles.detailsText}>Details</Text>
          <Icon name={{ ios: 'arrow.up.right', android: 'arrow_outward', web: 'arrow_outward' }} size={15} color={PathoraColors.teal700} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PathoraColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    padding: 17,
    marginBottom: PathoraSpacing[12],
    shadowColor: PathoraColors.ink900,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.045,
    shadowRadius: 13,
    elevation: 2,
  },
  pressed: { opacity: 0.87, transform: [{ scale: 0.993 }] },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginBottom: 15 },
  companyMark: { height: 48, width: 48, borderRadius: 15, backgroundColor: PathoraColors.teal100, alignItems: 'center', justifyContent: 'center' },
  companyInitials: { fontFamily: PathoraFonts.en.extraBold, fontSize: 15, color: PathoraColors.teal700 },
  heading: { flex: 1, minWidth: 0, gap: 4 },
  eyebrow: { color: PathoraColors.teal600, fontFamily: PathoraFonts.en.bold, fontSize: 9, letterSpacing: 1.15 },
  title: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.bold, fontSize: 16, lineHeight: 22 },
  companyName: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 12 },
  favorite: { height: 39, width: 39, backgroundColor: '#F7F8F7', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EBEDEB' },
  favoriteActive: { backgroundColor: PathoraColors.teal100, borderColor: '#C7E2DB' },
  favoritePressed: { transform: [{ scale: 0.92 }] },
  favoriteDisabled: { opacity: 0.5 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  metaChip: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 9, backgroundColor: '#F5F6F5' },
  metaText: { fontSize: 11.5, fontFamily: PathoraFonts.en.medium, color: PathoraColors.textSecondary, flexShrink: 1 },
  matchPanel: { backgroundColor: '#F0F7F4', borderRadius: 14, padding: 13, marginBottom: 14, gap: 8 },
  matchHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  matchLabel: { fontFamily: PathoraFonts.en.bold, fontSize: 10, color: PathoraColors.teal700, letterSpacing: 0.9 },
  matchPercent: { fontFamily: PathoraFonts.en.extraBold, fontSize: 20, lineHeight: 25, color: PathoraColors.teal700 },
  progressTrack: { height: 7, borderRadius: 9, backgroundColor: '#D5E6E1', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: PathoraColors.teal500, borderRadius: 9 },
  matchExplanation: { fontFamily: PathoraFonts.en.medium, fontSize: 10.5, lineHeight: 16, color: PathoraColors.teal700 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  skillChip: { flexDirection: 'row', gap: 4, alignItems: 'center', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#F2F3F4', maxWidth: '100%' },
  skillChipMatched: { backgroundColor: PathoraColors.teal100 },
  skillText: { fontFamily: PathoraFonts.en.semiBold, fontSize: 10.5, color: PathoraColors.textSecondary, flexShrink: 1 },
  skillTextMatched: { color: PathoraColors.teal700 },
  moreSkills: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, backgroundColor: PathoraColors.amber100 },
  moreSkillsText: { fontFamily: PathoraFonts.en.bold, fontSize: 10.5, color: PathoraColors.amberTextOnTint },
  divider: { height: 1, backgroundColor: '#F0EEE9', marginBottom: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  deadlineWrap: { flexDirection: 'row', gap: 6, alignItems: 'center', flex: 1, minWidth: 0 },
  deadlineText: { fontFamily: PathoraFonts.en.medium, color: PathoraColors.textSecondary, fontSize: 11.5, lineHeight: 17, flexShrink: 1 },
  detailsAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailsText: { fontFamily: PathoraFonts.en.bold, fontSize: 11.5, color: PathoraColors.teal700 },
});
