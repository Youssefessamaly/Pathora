/**
 * Path · Company Profile — Phase 1 / Step 8
 * Visual refresh only. Uses the existing company profile, approval API, edit-onboarding
 * route and sign-out behavior. Keeps full-bleed content beneath floating tabs.
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

import { CompanyApprovalBadge } from '@/components/company-approval-badge';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors as C, PathoraFonts as F } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import {
  getCompanyApprovalStatus,
  getCompanyProfileOrNull,
  type CompanyApprovalStatus,
  type CompanyProfile,
} from '@/lib/api';
import { describeOnboardingError } from '@/lib/onboarding';

type SymbolName = SymbolViewProps['name'];
function Icon({ name, size = 18, color = C.teal700 }: {
  name: SymbolName; size?: number; color?: string;
}) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}

function SectionCard({ title, icon, children }: {
  title: string; icon: SymbolName; children: ReactNode;
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
      <Text style={styles.infoValue} selectable>{value}</Text>
    </View>
  );
}

function companyInitials(name: string | null | undefined, email: string | undefined) {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return (email?.slice(0, 1) || '?').toUpperCase();
  return words.slice(0, 2).map((word) => word.charAt(0)).join('').toUpperCase();
}

const APPROVAL_DESCRIPTIONS: Record<CompanyApprovalStatus, string> = {
  APPROVED: 'Your company profile has been approved.',
  PENDING: 'Your company profile is awaiting review.',
  REJECTED: 'Your company profile was not approved.',
};

export default function CompanyProfileRoute() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [approval, setApproval] = useState<CompanyApprovalStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [company, status] = await Promise.all([
        getCompanyProfileOrNull(token),
        getCompanyApprovalStatus(token),
      ]);
      setProfile(company);
      setApproval(status.status);
      setError(null);
    } catch (loadError) {
      setError(describeOnboardingError(loadError));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const editProfile = () => router.push('/company/onboarding/company');
  const logOut = async () => {
    await signOut();
    router.dismissAll();
    router.replace('/welcome');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.teal600} />
          <Text style={styles.centerCaption}>Loading company details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.center}>
          <Icon name={{ ios: 'wifi.exclamationmark', android: 'wifi_off', web: 'wifi_off' }} size={28} />
          <Text style={styles.errorText}>{error ?? 'Unable to load your company profile.'}</Text>
          <PathoraButton label="Try again" onPress={() => void load()} style={styles.retry} />
        </View>
      </SafeAreaView>
    );
  }

  const name = profile.companyName?.trim() || 'Your company';
  const subtitle = [profile.industry, profile.location].filter(Boolean).join(' · ');
  const companyFacts: { label: string; value: string }[] = [];
  if (profile.industry) companyFacts.push({ label: 'Industry', value: profile.industry });
  if (profile.companySize) companyFacts.push({ label: 'Company size', value: profile.companySize });
  if (profile.location) companyFacts.push({ label: 'Location', value: profile.location });
  const contactFacts: { label: string; value: string }[] = [];
  if (profile.contactName) contactFacts.push({ label: 'Contact person', value: profile.contactName });
  if (user?.email) contactFacts.push({ label: 'Account email', value: user.email });
  if (profile.contactPhone) contactFacts.push({ label: 'Phone', value: profile.contactPhone });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.eyebrow}>COMPANY WORKSPACE</Text>
          <Text style={styles.pageTitle}>Company profile<Text style={styles.titleDot}>.</Text></Text>
          <Text style={styles.subtitle}>Your team is present on Path.</Text>
        </View>

        <Animated.View entering={FadeInDown.duration(300).reduceMotion(ReduceMotion.System)} style={styles.identityCard}>
          <View style={styles.identityTop}>
            <LinearGradient
              colors={[C.teal500, C.teal700]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.avatar}>
              <Text style={styles.avatarText}>{companyInitials(profile.companyName, user?.email)}</Text>
            </LinearGradient>
            <View style={styles.identityContent}>
              <Text style={styles.identityEyebrow}>COMPANY ACCOUNT</Text>
              <Text style={styles.identityName}>{name}</Text>
              {!!subtitle && <Text style={styles.identitySubtitle} numberOfLines={2}>{subtitle}</Text>}
            </View>
          </View>
          <View style={styles.identityFooter}>
            <View style={styles.identityHint}>
              <Icon name={{ ios: 'building.2', android: 'business', web: 'business' }} size={16} />
              <Text style={styles.identityHintText}>Company details</Text>
            </View>
            <Pressable
              onPress={editProfile}
              accessibilityRole="button"
              accessibilityLabel="Edit company profile"
              style={({ pressed }) => [styles.editAction, pressed && styles.pressed]}>
              <Icon name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={15} />
              <Text style={styles.editText}>Edit profile</Text>
            </Pressable>
          </View>
        </Animated.View>

        <SectionCard title="Verification status" icon={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}>
          <View style={styles.approvalRow}>
            {approval ? <CompanyApprovalBadge status={approval} /> : <Text style={styles.muted}>Status unavailable</Text>}
            {approval && <Text style={styles.approvalCopy}>{APPROVAL_DESCRIPTIONS[approval]}</Text>}
          </View>
        </SectionCard>

        <View style={styles.sectionIntro}>
          <Text style={styles.eyebrow}>YOUR ORGANIZATION</Text>
          <Text style={styles.sectionIntroTitle}>The essentials</Text>
        </View>

        <SectionCard title="About the company" icon={{ ios: 'building.2.fill', android: 'domain', web: 'domain' }}>
          <Text style={styles.bodyText}>{profile.description?.trim() || 'Add a company description to introduce your team to future interns.'}</Text>
        </SectionCard>

        <SectionCard title="Company information" icon={{ ios: 'info.circle.fill', android: 'info', web: 'info' }}>
          {companyFacts.length > 0 ? (
            <View style={styles.facts}>
              {companyFacts.map((fact) => <InfoLine key={fact.label} label={fact.label} value={fact.value} />)}
            </View>
          ) : (
            <Text style={styles.muted}>Your company information has not been added yet.</Text>
          )}
        </SectionCard>

        <SectionCard title="Contact details" icon={{ ios: 'person.crop.circle', android: 'contact_mail', web: 'contact_mail' }}>
          {contactFacts.length > 0 ? (
            <View style={styles.facts}>
              {contactFacts.map((fact) => <InfoLine key={fact.label} label={fact.label} value={fact.value} />)}
            </View>
          ) : <Text style={styles.muted}>No contact details added yet.</Text>}
          {profile.website && (
            <View style={styles.websiteBlock}>
              <Text style={styles.microLabel}>WEBSITE</Text>
              <Text style={styles.websiteValue} selectable>{profile.website}</Text>
            </View>
          )}
        </SectionCard>

        <Pressable
          onPress={() => void logOut()}
          accessibilityRole="button"
          accessibilityLabel="Log out of your company account"
          style={({ pressed }) => [styles.logoutAction, pressed && styles.pressed]}>
          <Icon name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }} size={19} color={C.error} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
        <Text style={styles.footer}>Your next great hire starts with Path.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.paper },
  scrollContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 144, gap: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26, gap: 16 },
  centerCaption: { fontFamily: F.en.medium, color: C.textSecondary, fontSize: 13 },
  errorText: { color: C.error, fontFamily: F.en.medium, textAlign: 'center', fontSize: 14 },
  retry: { maxWidth: 220 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  pageHeader: { gap: 5 },
  eyebrow: { fontFamily: F.en.bold, color: C.teal600, fontSize: 10, letterSpacing: 1.8 },
  pageTitle: { fontFamily: F.en.extraBold, color: C.ink900, fontSize: 30, lineHeight: 39, letterSpacing: -0.85 },
  titleDot: { color: C.teal500 },
  subtitle: { fontFamily: F.en.medium, color: C.textSecondary, fontSize: 12.5, lineHeight: 19 },
  identityCard: { backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 18, gap: 17 },
  identityTop: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatar: { width: 66, height: 66, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: F.en.extraBold, color: C.surface, fontSize: 23 },
  identityContent: { flex: 1, minWidth: 0, gap: 4 },
  identityEyebrow: { fontFamily: F.en.bold, color: C.teal600, fontSize: 9.5, letterSpacing: 1.15 },
  identityName: { fontFamily: F.en.extraBold, color: C.ink900, fontSize: 20, lineHeight: 26 },
  identitySubtitle: { fontFamily: F.en.medium, fontSize: 12, lineHeight: 18, color: C.textSecondary },
  identityFooter: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  identityHint: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  identityHintText: { fontFamily: F.en.medium, color: C.textSecondary, fontSize: 11 },
  editAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.teal100, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 11 },
  editText: { fontFamily: F.en.bold, color: C.teal700, fontSize: 12 },
  sectionCard: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, padding: 18, borderRadius: 19, gap: 12 },
  accentLine: { width: 25, height: 4, borderRadius: 99, backgroundColor: C.teal500 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionIcon: { height: 30, width: 30, borderRadius: 10, backgroundColor: C.teal100, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: F.en.bold, color: C.ink900, fontSize: 16 },
  approvalRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  approvalCopy: { flex: 1, minWidth: 170, fontFamily: F.en.medium, color: C.textSecondary, fontSize: 12.5, lineHeight: 19 },
  sectionIntro: { gap: 4, marginTop: 8 },
  sectionIntroTitle: { fontFamily: F.en.extraBold, color: C.ink900, fontSize: 21, lineHeight: 28, letterSpacing: -0.5 },
  bodyText: { fontFamily: F.en.regular, color: C.textSecondary, fontSize: 13.5, lineHeight: 22 },
  facts: { gap: 13 },
  infoLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  infoLabel: { fontFamily: F.en.medium, fontSize: 12.5, color: C.textSecondary, maxWidth: '43%' },
  infoValue: { fontFamily: F.en.semiBold, fontSize: 12.5, color: C.ink900, flex: 1, textAlign: 'right', lineHeight: 20 },
  muted: { fontFamily: F.en.medium, color: C.textSecondary, fontSize: 13, lineHeight: 20 },
  websiteBlock: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, gap: 6 },
  microLabel: { fontFamily: F.en.bold, color: C.teal600, fontSize: 10, letterSpacing: 1.1 },
  websiteValue: { fontFamily: F.en.medium, color: C.teal700, fontSize: 12.5, lineHeight: 20 },
  logoutAction: { backgroundColor: C.surface, borderRadius: 15, borderColor: C.border, borderWidth: 1, height: 51, flexDirection: 'row', gap: 9, justifyContent: 'center', alignItems: 'center' },
  logoutText: { color: C.error, fontFamily: F.en.bold, fontSize: 13.5 },
  footer: { fontFamily: F.en.medium, fontSize: 11, color: C.textTertiary, textAlign: 'center' },
});
