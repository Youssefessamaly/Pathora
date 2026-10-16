/**
 * Path · Student Profile — Phase 1 / Step 8
 * Visual refresh only. Real backend profile, onboarding edit flow, CV viewer and sign-out
 * are unchanged. Bottom safe-area is deliberately excluded for floating tab navigation.
 */
import { useCallback, useState, type ReactNode } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors as C, PathoraFonts as F } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { getInternProfileOrNull, type InternProfile } from '@/lib/api';
import { initialsFor } from '@/lib/initials';
import { describeOnboardingError } from '@/lib/onboarding';

const LEVELS: Record<NonNullable<InternProfile['academicLevel']>, string> = {
  HIGH_SCHOOL: 'High school',
  UNIVERSITY: 'University',
};

type SymbolName = SymbolViewProps['name'];

function Icon({ name, size = 19, color = C.teal700 }: {
  name: SymbolName; size?: number; color?: string;
}) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}

function SectionCard({ title, icon, children }: {
  title: string;
  icon: SymbolName;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.accentLine} />
      <View style={styles.cardHeading}>
        <View style={styles.sectionIcon}><Icon name={icon} size={17} /></View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SkillPill({ label, detected = false }: { label: string; detected?: boolean }) {
  return (
    <View style={[styles.skillPill, detected && styles.detectedPill]}>
      <Text style={[styles.skillText, detected && styles.detectedText]}>{label}</Text>
    </View>
  );
}

export default function InternProfileRoute() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getInternProfileOrNull(token);
      setProfile(data);
      setError(null);
    } catch (loadError) {
      setError(describeOnboardingError(loadError));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const editProfile = () => router.push('/onboarding/personal');
  const viewCv = () => {
    if (!profile?.cvFileName) return;
    router.push({ pathname: '/intern/cv-preview', params: { fileName: profile.cvFileName } });
  };
  const logOut = async () => {
    await signOut();
    router.dismissAll();
    router.replace('/welcome');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={C.teal600} size="large" />
          <Text style={styles.centerCaption}>Loading your profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.center}>
          <Icon name={{ ios: 'wifi.exclamationmark', android: 'wifi_off', web: 'wifi_off' }} size={28} />
          <Text style={styles.errorText}>{error ?? 'Unable to load your profile.'}</Text>
          <PathoraButton label="Try again" onPress={() => void load()} style={styles.retry} />
        </View>
      </SafeAreaView>
    );
  }

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Your profile';
  const educationFacts: { label: string; value: string }[] = [];
  if (profile.academicLevel) educationFacts.push({ label: 'Level', value: LEVELS[profile.academicLevel] });
  if (profile.major) educationFacts.push({ label: 'Field of study', value: profile.major });
  if (profile.academicLevel === 'UNIVERSITY' && profile.academicYear != null) {
    educationFacts.push({ label: 'Academic year', value: `Year ${profile.academicYear}` });
  }
  if (profile.expectedGraduationYear != null) {
    educationFacts.push({ label: 'Graduation', value: String(profile.expectedGraduationYear) });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderText}>
            <Text style={styles.eyebrow}>STUDENT WORKSPACE</Text>
            <Text style={styles.pageTitle}>My profile<Text style={styles.titleDot}>.</Text></Text>
            <Text style={styles.subtitle}>The person behind the application.</Text>
          </View>
        </View>

        <Animated.View entering={FadeInDown.duration(300).reduceMotion(ReduceMotion.System)} style={styles.identityCard}>
          <View style={styles.identityTop}>
            <LinearGradient
              colors={[C.teal500, C.teal700]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFor(profile.firstName, profile.lastName, user?.email)}</Text>
            </LinearGradient>
            <View style={styles.identityContent}>
              <Text style={styles.identityEyebrow}>STUDENT PROFILE</Text>
              <Text style={styles.identityName}>{fullName}</Text>
              <Text style={styles.identityEmail} numberOfLines={2}>{user?.email ?? 'Account email unavailable'}</Text>
            </View>
          </View>
          <View style={styles.identityFooter}>
            <View style={styles.identityTag}>
              <View style={styles.tagDot} />
              <Text style={styles.identityTagText}>Your Path profile</Text>
            </View>
            <Pressable
              onPress={editProfile}
              accessibilityRole="button"
              accessibilityLabel="Edit student profile"
              style={({ pressed }) => [styles.editAction, pressed && styles.pressed]}>
              <Icon name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={15} color={C.teal700} />
              <Text style={styles.editText}>Edit profile</Text>
            </Pressable>
          </View>
        </Animated.View>

        <View style={styles.sectionIntro}>
          <Text style={styles.eyebrow}>YOUR DETAILS</Text>
          <Text style={styles.sectionIntroTitle}>Your story so far</Text>
        </View>

        <SectionCard title="Education" icon={{ ios: 'graduationcap.fill', android: 'school', web: 'school' }}>
          <Text style={styles.primaryValue}>{profile.institutionName || 'Add your institution'}</Text>
          {educationFacts.length > 0 ? (
            <View style={styles.infoStack}>
              {educationFacts.map((fact) => <InfoLine key={fact.label} label={fact.label} value={fact.value} />)}
            </View>
          ) : (
            <Text style={styles.muted}>Complete your education details to strengthen your profile.</Text>
          )}
        </SectionCard>

        <SectionCard title="Skills & strengths" icon={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}>
          {profile.skills.length > 0 ? (
            <View style={styles.chipWrap}>
              {profile.skills.map((skill) => <SkillPill key={skill.id} label={skill.name} />)}
            </View>
          ) : (
            <Text style={styles.muted}>No skills added yet. You can add them when editing your profile.</Text>
          )}
          {profile.cvDetectedSkills.length > 0 && (
            <View style={styles.detectedBlock}>
              <View style={styles.softDivider} />
              <Text style={styles.subheading}>FOUND IN YOUR CV</Text>
              <Text style={styles.helpText}>Skills recognized from your uploaded document.</Text>
              <View style={styles.chipWrap}>
                {profile.cvDetectedSkills.map((skill) => <SkillPill key={skill.id} label={skill.name} detected />)}
              </View>
            </View>
          )}
        </SectionCard>

        <SectionCard title="Curriculum vitae" icon={{ ios: 'doc.text.fill', android: 'description', web: 'description' }}>
          <View style={styles.documentRow}>
            <View style={styles.documentIcon}>
              <Icon name={{ ios: 'doc.richtext', android: 'picture_as_pdf', web: 'picture_as_pdf' }} size={22} />
            </View>
            <View style={styles.documentText}>
              <Text style={styles.documentTitle}>{profile.cvFileName ? 'CV uploaded' : 'No CV uploaded yet'}</Text>
              <Text style={styles.documentFileName} numberOfLines={2}>
                {profile.cvFileName ?? 'Add a CV through Edit profile to share with employers.'}
              </Text>
            </View>
          </View>
          {profile.cvFileName && (
            <Pressable
              onPress={viewCv}
              accessibilityRole="button"
              accessibilityLabel="View your uploaded CV"
              style={({ pressed }) => [styles.outlineAction, pressed && styles.pressed]}>
              <Icon name={{ ios: 'eye', android: 'visibility', web: 'visibility' }} size={17} />
              <Text style={styles.outlineActionText}>View my CV</Text>
            </Pressable>
          )}
        </SectionCard>

        {(profile.careerInterests || profile.phoneNumber || profile.linkedinUrl) && (
          <SectionCard title="More about you" icon={{ ios: 'person.text.rectangle', android: 'person', web: 'person' }}>
            {profile.careerInterests && (
              <View style={styles.detailBlock}>
                <Text style={styles.subheading}>CAREER INTERESTS</Text>
                <Text style={styles.description}>{profile.careerInterests}</Text>
              </View>
            )}
            {profile.phoneNumber && <InfoLine label="Phone" value={profile.phoneNumber} />}
            {profile.linkedinUrl && (
              <View style={styles.detailBlock}>
                <Text style={styles.subheading}>LINKEDIN</Text>
                <Text style={styles.linkText} selectable>{profile.linkedinUrl}</Text>
              </View>
            )}
          </SectionCard>
        )}

        <Pressable
          onPress={() => void logOut()}
          accessibilityRole="button"
          accessibilityLabel="Log out of your account"
          style={({ pressed }) => [styles.logoutAction, pressed && styles.pressed]}>
          <Icon name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }} color={C.error} size={19} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
        <Text style={styles.footer}>Built for the next step in your journey.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.paper },
  scrollContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 144, gap: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26, gap: 16 },
  centerCaption: { fontFamily: F.en.medium, color: C.textSecondary, fontSize: 13 },
  errorText: { color: C.error, fontFamily: F.en.medium, fontSize: 14, textAlign: 'center' },
  retry: { maxWidth: 220 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageHeaderText: { flex: 1, gap: 5 },
  eyebrow: { color: C.teal600, fontSize: 10, letterSpacing: 1.8, fontFamily: F.en.bold },
  pageTitle: { fontFamily: F.en.extraBold, fontSize: 30, lineHeight: 39, color: C.ink900, letterSpacing: -0.85 },
  titleDot: { color: C.teal500 },
  subtitle: { fontSize: 12.5, lineHeight: 19, color: C.textSecondary, fontFamily: F.en.medium },
  identityCard: { backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 18, gap: 17 },
  identityTop: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatar: { width: 66, height: 66, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: F.en.extraBold, color: '#FFFFFF', fontSize: 23 },
  identityContent: { flex: 1, minWidth: 0, gap: 4 },
  identityEyebrow: { color: C.teal600, fontFamily: F.en.bold, fontSize: 9.5, letterSpacing: 1.15 },
  identityName: { color: C.ink900, fontFamily: F.en.extraBold, fontSize: 20, lineHeight: 26 },
  identityEmail: { color: C.textSecondary, fontFamily: F.en.medium, fontSize: 12, lineHeight: 18 },
  identityFooter: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  identityTag: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  tagDot: { backgroundColor: C.teal500, width: 7, height: 7, borderRadius: 10 },
  identityTagText: { fontFamily: F.en.medium, color: C.textSecondary, fontSize: 11 },
  editAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.teal100, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 11 },
  editText: { color: C.teal700, fontFamily: F.en.bold, fontSize: 12 },
  sectionIntro: { marginTop: 7, gap: 4 },
  sectionIntroTitle: { fontFamily: F.en.extraBold, fontSize: 21, color: C.ink900, lineHeight: 29, letterSpacing: -0.5 },
  sectionCard: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 19, padding: 18, gap: 12 },
  accentLine: { backgroundColor: C.teal500, width: 25, height: 4, borderRadius: 99 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionIcon: { width: 30, height: 30, backgroundColor: C.teal100, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: F.en.bold, color: C.ink900, fontSize: 16 },
  primaryValue: { fontFamily: F.en.bold, color: C.ink900, fontSize: 15.5, lineHeight: 23 },
  muted: { fontFamily: F.en.medium, color: C.textSecondary, fontSize: 13, lineHeight: 20 },
  infoStack: { gap: 9, marginTop: 3 },
  infoLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  infoLabel: { color: C.textSecondary, fontFamily: F.en.medium, fontSize: 12.5, maxWidth: '46%' },
  infoValue: { flex: 1, fontFamily: F.en.semiBold, fontSize: 12.5, color: C.ink900, lineHeight: 19, textAlign: 'right' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillPill: { backgroundColor: C.teal100, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 8 },
  skillText: { fontFamily: F.en.semiBold, fontSize: 12, color: C.teal700 },
  detectedPill: { backgroundColor: '#F4F5F4', borderColor: C.border, borderWidth: 1 },
  detectedText: { color: C.textSecondary },
  detectedBlock: { gap: 10, marginTop: 2 },
  softDivider: { height: 1, backgroundColor: C.border },
  subheading: { fontFamily: F.en.bold, color: C.teal600, letterSpacing: 1.15, fontSize: 10 },
  helpText: { color: C.textSecondary, fontFamily: F.en.medium, fontSize: 11.5, lineHeight: 17 },
  documentRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  documentIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.teal100, alignItems: 'center', justifyContent: 'center' },
  documentText: { flex: 1, minWidth: 0, gap: 3 },
  documentTitle: { fontFamily: F.en.bold, color: C.ink900, fontSize: 14 },
  documentFileName: { fontFamily: F.en.medium, color: C.textSecondary, fontSize: 12, lineHeight: 18 },
  outlineAction: { borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.surface, borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center', gap: 8, flexDirection: 'row' },
  outlineActionText: { fontFamily: F.en.bold, color: C.teal700, fontSize: 13 },
  detailBlock: { gap: 7 },
  description: { fontFamily: F.en.regular, fontSize: 13, lineHeight: 21, color: C.textSecondary },
  linkText: { fontFamily: F.en.medium, fontSize: 12.5, lineHeight: 20, color: C.teal700 },
  logoutAction: { height: 51, backgroundColor: C.surface, borderRadius: 15, borderColor: C.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 9, flexDirection: 'row' },
  logoutText: { color: C.error, fontFamily: F.en.bold, fontSize: 13.5 },
  footer: { textAlign: 'center', color: C.textTertiary, fontFamily: F.en.medium, fontSize: 11 },
});
