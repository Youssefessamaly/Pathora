import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { getInternProfileOrNull, type InternProfile } from '@/lib/api';
import { initialsFor } from '@/lib/initials';
import { describeOnboardingError } from '@/lib/onboarding';

const ACADEMIC_LEVEL_LABELS: Record<NonNullable<InternProfile['academicLevel']>, string> = {
  HIGH_SCHOOL: 'High school',
  UNIVERSITY: 'University',
};

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

/**
 * The intern's own real profile — read-only beyond the "Edit profile" entry point, which
 * reuses the existing onboarding screens (they already support being revisited to update
 * previously-saved values). No separate edit-profile feature is built in this task.
 */
function ProfileScreen() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();

  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const data = await getInternProfileOrNull(token);
      setProfile(data);
      setError(null);
    } catch (loadError) {
      setError(describeOnboardingError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleSignOut = async () => {
    await signOut();
    // Clear the entire authenticated stack along with the session so Back can never reopen
    // a protected screen after logout.
    router.dismissAll();
    router.replace('/welcome');
  };

  const handleEditProfile = () => {
    router.push('/onboarding/personal');
  };

  const handleViewCv = () => {
    if (!profile?.cvFileName) {
      return;
    }

    router.push({
      pathname: '/intern/cv-preview',
      params: { fileName: profile.cvFileName },
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator color={PathoraColors.teal600} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error ?? 'Unable to load your profile.'}</Text>
          <PathoraButton label="Try again" variant="secondary" onPress={load} style={styles.retryButton} />
        </View>
      </SafeAreaView>
    );
  }

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsFor(profile.firstName, profile.lastName, user?.email)}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name}>{fullName || 'Your profile'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <PathoraButton
          label="Edit profile"
          variant="secondary"
          onPress={handleEditProfile}
          style={styles.editButton}
        />

        <View style={styles.card}>
          <SectionLabel label="Education" />
          <Text style={styles.cardLine}>{profile.institutionName ?? 'Not provided yet'}</Text>
          {profile.academicLevel && (
            <Text style={styles.cardLineSecondary}>{ACADEMIC_LEVEL_LABELS[profile.academicLevel]}</Text>
          )}
          {profile.major && <Text style={styles.cardLineSecondary}>{profile.major}</Text>}
          {profile.academicLevel === 'UNIVERSITY' && profile.academicYear !== null && (
            <Text style={styles.cardLineSecondary}>Year {profile.academicYear}</Text>
          )}
          {profile.expectedGraduationYear && (
            <Text style={styles.cardLineSecondary}>Graduating {profile.expectedGraduationYear}</Text>
          )}
        </View>

        <View style={styles.card}>
          <SectionLabel label="Skills" />
          {profile.skills.length > 0 ? (
            <View style={styles.chipsWrap}>
              {profile.skills.map((skill) => (
                <View key={skill.id} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{skill.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyLine}>No skills added yet.</Text>
          )}

          {profile.cvDetectedSkills.length > 0 && (
            <View style={styles.detectedSkillsBlock}>
              <Text style={styles.detectedSkillsLabel}>Detected from your CV</Text>
              <View style={styles.chipsWrap}>
                {profile.cvDetectedSkills.map((skill) => (
                  <View key={skill.id} style={styles.skillChip}>
                    <Text style={styles.skillChipText}>{skill.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <SectionLabel label="CV" />
          <Text style={styles.cardLine}>{profile.cvFileName ?? 'No CV uploaded yet'}</Text>
          {profile.cvFileName && (
            <PathoraButton
              label="View CV"
              variant="secondary"
              onPress={handleViewCv}
              style={styles.cvButton}
            />
          )}
        </View>

        {profile.linkedinUrl && (
          <View style={styles.card}>
            <SectionLabel label="LinkedIn" />
            <Text style={styles.cardLine} numberOfLines={1}>
              {profile.linkedinUrl}
            </Text>
          </View>
        )}

        {profile.careerInterests && (
          <View style={styles.card}>
            <SectionLabel label="Career interests" />
            <Text style={styles.cardLine}>{profile.careerInterests}</Text>
          </View>
        )}

        <PathoraButton label="Log out" variant="secondary" onPress={handleSignOut} style={styles.signOutButton} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ProfileRoute() {
  return <ProfileScreen />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: PathoraSpacing[24],
    paddingTop: 8,
    paddingBottom: PathoraSpacing[32],
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PathoraSpacing[24],
    gap: PathoraSpacing[16],
  },
  errorText: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 14,
    color: PathoraColors.error,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 140,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PathoraSpacing[16],
    marginBottom: PathoraSpacing[20],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.teal100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 18,
    color: PathoraColors.teal700,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 20,
    color: PathoraColors.ink900,
  },
  email: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    color: PathoraColors.textSecondary,
  },
  editButton: {
    marginBottom: PathoraSpacing[24],
  },
  card: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    padding: PathoraSpacing[16],
    marginBottom: PathoraSpacing[16],
    gap: 6,
  },
  sectionLabel: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 12.5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: PathoraColors.textTertiary,
    marginBottom: 4,
  },
  cardLine: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 14.5,
    lineHeight: 21,
    color: PathoraColors.ink900,
  },
  cardLineSecondary: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13.5,
    color: PathoraColors.textSecondary,
  },
  emptyLine: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13.5,
    color: PathoraColors.textTertiary,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.teal100,
  },
  skillChipText: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 13,
    color: PathoraColors.teal700,
  },
  detectedSkillsBlock: {
    marginTop: 10,
    gap: 8,
  },
  detectedSkillsLabel: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 12,
    color: PathoraColors.textTertiary,
  },
  cvButton: {
    marginTop: PathoraSpacing[8],
  },
  signOutButton: {
    marginTop: PathoraSpacing[8],
  },
});
