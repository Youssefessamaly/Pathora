import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PathoraButton } from '@/components/pathora-button';
import { PathoraLogo } from '@/components/pathora-logo';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';

type Benefit = {
  icon: SymbolViewProps['name'];
  title: string;
  description: string;
};

const BENEFITS: Benefit[] = [
  {
    icon: { ios: 'shield.fill', android: 'security', web: 'security' },
    title: 'Verified companies',
    description: 'Every company is reviewed before it can post an internship.',
  },
  {
    icon: { ios: 'star.fill', android: 'star', web: 'star' },
    title: 'Matched to you',
    description: 'See a match score based on your profile and interests.',
  },
  {
    icon: { ios: 'list.clipboard.fill', android: 'assignment', web: 'assignment' },
    title: 'Track every application',
    description: 'Know where each application stands at any time.',
  },
];

function BenefitRow({ icon, title, description }: Benefit) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIconTile}>
        <SymbolView name={icon} size={20} tintColor={PathoraColors.teal700} />
      </View>
      <View style={styles.benefitText}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitDescription}>{description}</Text>
      </View>
    </View>
  );
}

/**
 * LanguageChip is visual-only for now: the project has no global localization
 * infrastructure yet (no i18n library, no app-level language state — only React Native's own
 * I18nManager.isRTL flag, which existing components already mirror directional icons against).
 * Rather than invent a fake translation system for this one chip, it reproduces the design's
 * look (always showing "العربية", the Arabic label for switching *into* Arabic, since English
 * is the only mode that actually exists) without claiming to do anything when pressed — see
 * the final report for this limitation.
 */
function LanguageChip() {
  return (
    <View style={styles.languageChip}>
      <SymbolView
        name={{ ios: 'globe', android: 'language', web: 'language' }}
        size={14}
        tintColor={PathoraColors.textSecondary}
      />
      <Text style={styles.languageChipText}>العربية</Text>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();

  const handleCreateAccount = () => {
    router.push('/account-type');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <PathoraLogo size={28} wordmarkSize={16} />
          <LanguageChip />
        </View>

        <View style={styles.heroText}>
          <Text style={styles.headline}>Find internships built for where you are</Text>
          <Text style={styles.supportingText}>
            Path matches verified companies in Egypt with students ready to grow.
          </Text>
        </View>

        <View style={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <BenefitRow key={benefit.title} {...benefit} />
          ))}
        </View>

        <View style={styles.actions}>
          <PathoraButton
            label="Create account"
            variant="primary"
            onPress={handleCreateAccount}
            style={styles.primaryButton}
          />
          <PathoraButton label="I already have an account" variant="secondary" onPress={handleLogin} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: PathoraSpacing[24],
    paddingTop: PathoraSpacing[20],
    paddingBottom: PathoraSpacing[24],
    // Pins the actions block toward the bottom of the viewport on tall screens, while still
    // allowing the ScrollView to scroll normally on short ones instead of clipping anything.
    justifyContent: 'space-between',
    gap: PathoraSpacing[32],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: PathoraRadius[999],
    borderWidth: 1,
    borderColor: PathoraColors.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  languageChipText: {
    fontFamily: PathoraFonts.ar.semiBold,
    fontSize: 12.5,
    color: PathoraColors.textSecondary,
  },
  heroText: {
    gap: 12,
  },
  headline: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.4,
    color: PathoraColors.ink900,
  },
  supportingText: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 15,
    lineHeight: 24,
    color: PathoraColors.textSecondary,
  },
  benefits: {
    gap: PathoraSpacing[20],
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  benefitIconTile: {
    width: 40,
    height: 40,
    borderRadius: PathoraRadius[12],
    backgroundColor: PathoraColors.teal100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    gap: 2,
  },
  benefitTitle: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 14.5,
    color: PathoraColors.ink900,
  },
  benefitDescription: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    lineHeight: 20,
    color: PathoraColors.textSecondary,
  },
  actions: {
    gap: PathoraSpacing[12],
  },
  primaryButton: {
    marginBottom: 0,
  },
});
