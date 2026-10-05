import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import type { InternInternship } from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import { formatMinimumAcademicYearLabel, WORK_MODE_LABELS } from '@/lib/internship-options';

function companyInitials(companyName: string): string {
  const words = companyName.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word.charAt(0));
  return (letters.join('') || '?').toUpperCase();
}

type InternshipFeedCardProps = {
  item: InternInternship;
  onPress: () => void;
  onFavoritePress?: () => void;
  favoriteDisabled?: boolean;
};

/**
 * The personalized internship card shared by the dashboard, full Internships list, and
 * Favorites list. relevancePercentage/ordering always come straight from the backend.
 */
export function InternshipFeedCard({
  item,
  onPress,
  onFavoritePress,
  favoriteDisabled = false,
}: InternshipFeedCardProps) {
  const skillNames = item.skills.slice(0, 4).map((skill) => skill.name);
  const extraSkillCount = item.skills.length - skillNames.length;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardTopRow}>
        <View style={styles.companyBadge}>
          <Text style={styles.companyBadgeText}>{companyInitials(item.companyName)}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardCompany} numberOfLines={1}>
            {item.companyName}
          </Text>
        </View>
        {onFavoritePress && (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onFavoritePress();
            }}
            disabled={favoriteDisabled}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={item.favorited ? 'Remove from favorites' : 'Add to favorites'}
            accessibilityState={{ selected: item.favorited, disabled: favoriteDisabled }}
            style={({ pressed }) => [
              styles.favoriteButton,
              item.favorited && styles.favoriteButtonActive,
              pressed && !favoriteDisabled && styles.favoriteButtonPressed,
              favoriteDisabled && styles.favoriteButtonDisabled,
            ]}>
            <SymbolView
              name={
                item.favorited
                  ? { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }
                  : { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }
              }
              size={20}
              tintColor={item.favorited ? PathoraColors.teal700 : PathoraColors.textSecondary}
            />
          </Pressable>
        )}
      </View>

      <Text style={styles.cardMeta} numberOfLines={1}>
        {item.location} · {WORK_MODE_LABELS[item.workMode]}
        {item.minimumAcademicYear !== null && ` · ${formatMinimumAcademicYearLabel(item.minimumAcademicYear)}`}
      </Text>

      {skillNames.length > 0 && (
        <View style={styles.chipsWrap}>
          {skillNames.map((name) => (
            <View key={name} style={styles.skillChip}>
              <Text style={styles.skillChipText}>{name}</Text>
            </View>
          ))}
          {extraSkillCount > 0 && (
            <View style={styles.skillChip}>
              <Text style={styles.skillChipText}>+{extraSkillCount}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.cardBottomRow}>
        <Text style={styles.cardDeadline}>Deadline {formatDisplayDate(item.applicationDeadline)}</Text>
        <View style={styles.matchPill}>
          <Text style={styles.matchPillText}>{item.relevancePercentage}% match</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    paddingVertical: PathoraSpacing[16],
    paddingHorizontal: PathoraSpacing[16],
    marginBottom: PathoraSpacing[12],
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PathoraSpacing[12],
    marginBottom: PathoraSpacing[12],
  },
  companyBadge: {
    width: 40,
    height: 40,
    borderRadius: PathoraRadius[12],
    backgroundColor: PathoraColors.teal700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyBadgeText: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 13,
    color: PathoraColors.surface,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 15.5,
    color: PathoraColors.ink900,
  },
  cardCompany: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 13,
    color: PathoraColors.textSecondary,
    marginTop: 2,
  },
  favoriteButton: {
    width: 38,
    height: 38,
    borderRadius: PathoraRadius[12],
    borderWidth: 1,
    borderColor: PathoraColors.border,
    backgroundColor: PathoraColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButtonActive: {
    backgroundColor: PathoraColors.teal100,
    borderColor: PathoraColors.teal400,
  },
  favoriteButtonPressed: {
    opacity: 0.7,
  },
  favoriteButtonDisabled: {
    opacity: 0.45,
  },
  cardMeta: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    color: PathoraColors.textSecondary,
    marginBottom: PathoraSpacing[12],
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: PathoraSpacing[12],
  },
  skillChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.teal100,
  },
  skillChipText: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 12,
    color: PathoraColors.teal700,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PathoraSpacing[12],
  },
  cardDeadline: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 12.5,
    color: PathoraColors.textTertiary,
    flexShrink: 1,
  },
  matchPill: {
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.amber100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  matchPillText: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 12.5,
    color: PathoraColors.amberTextOnTint,
  },
});
