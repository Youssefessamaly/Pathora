import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { PATHORA_LOGO_DOT, PATHORA_LOGO_PATH_D, PATHORA_LOGO_VIEWBOX } from '@/components/pathora-logo';
import { PathoraColors, PathoraFonts } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import {
  resolveCompanyPostAuthRoute,
  resolveInternPostAuthRoute,
  type CompanyPostAuthRoute,
  type OnboardingRoute,
} from '@/lib/onboarding';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MARK_SIZE = 132;
/** A generous overestimate of the mark path's actual drawn length (safe as long as it's
 *  >= the real length — react-native-svg has no DOM-style getTotalLength(), and this avoids
 *  a measurement round trip before the draw-in animation can start). */
const STROKE_DASH_LENGTH = 100;
/** Total time the branded splash stays up for, independent of how long the individual draw/
 *  pop/fade animations take (~1.65s) — a deliberate short hold on the finished mark before
 *  handing off, per the design's ~2600ms target. */
const SPLASH_MIN_DURATION_MS = 2600;

type SplashDestination = '/welcome' | '/intern' | OnboardingRoute | CompanyPostAuthRoute;

/** React Native's own built-in reduced-motion signal — no extra dependency needed. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) {
          setReduced(value);
        }
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      setReduced(value);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

/**
 * Resolves where this launch should ultimately land. By the time this screen exists, the root
 * layout has already finished restoring the session (see _layout.tsx's isInitializing gate),
 * so auth state itself is already settled — what's left is the same post-auth route
 * resolution login already uses, reused here so launch can never disagree with it.
 */
function useSplashDestination(): SplashDestination | null {
  const { isAuthenticated, user, token } = useAuth();
  const [destination, setDestination] = useState<SplashDestination | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (!isAuthenticated || !user || !token) {
        if (!cancelled) {
          setDestination('/welcome');
        }
        return;
      }

      try {
        if (user.role === 'INTERN') {
          const route = await resolveInternPostAuthRoute(token);
          if (!cancelled) {
            setDestination(route);
          }
          return;
        }

        if (user.role === 'COMPANY') {
          const route = await resolveCompanyPostAuthRoute(token);
          if (!cancelled) {
            setDestination(route);
          }
          return;
        }
      } catch {
        // Couldn't resolve post-auth routing (network hiccup, ...) — fall back to Welcome
        // rather than guessing a destination or leaving the splash stuck forever.
        if (!cancelled) {
          setDestination('/welcome');
        }
        return;
      }

      // No mobile destination exists for any other authenticated role (e.g. ADMIN) — the
      // admin portal is a separate web app, not part of this one.
      if (!cancelled) {
        setDestination('/welcome');
      }
    }

    resolve();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, token]);

  return destination;
}

export default function SplashScreen() {
  const router = useRouter();
  const destination = useSplashDestination();
  const reducedMotion = useReducedMotion();

  const [minDurationElapsed, setMinDurationElapsed] = useState(false);
  const hasNavigated = useRef(false);

  const pathOffset = useSharedValue(STROKE_DASH_LENGTH);
  const dotRadius = useSharedValue(0);
  const dotOpacity = useSharedValue(0);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkTranslateY = useSharedValue(8);

  useEffect(() => {
    if (reducedMotion) {
      // Final state immediately, no draw/pop/fade — the HTML's own reduced-motion fallback.
      pathOffset.value = 0;
      dotRadius.value = PATHORA_LOGO_DOT.r;
      dotOpacity.value = 1;
      wordmarkOpacity.value = 1;
      wordmarkTranslateY.value = 0;
      return;
    }

    pathOffset.value = withDelay(150, withTiming(0, { duration: 900, easing: Easing.inOut(Easing.cubic) }));
    dotRadius.value = withDelay(1000, withSpring(PATHORA_LOGO_DOT.r, { damping: 9, stiffness: 180 }));
    dotOpacity.value = withDelay(1000, withTiming(1, { duration: 350 }));
    wordmarkOpacity.value = withDelay(1200, withTiming(1, { duration: 450 }));
    wordmarkTranslateY.value = withDelay(
      1200,
      withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }),
    );
    // Shared values are stable refs — this effect is meant to run exactly once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  useEffect(() => {
    const timer = setTimeout(() => setMinDurationElapsed(true), SPLASH_MIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hasNavigated.current || !minDurationElapsed || destination === null) {
      return;
    }
    hasNavigated.current = true;
    router.replace(destination);
  }, [minDurationElapsed, destination, router]);

  const pathAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: pathOffset.value,
  }));

  const dotAnimatedProps = useAnimatedProps(() => ({
    r: dotRadius.value,
    opacity: dotOpacity.value,
  }));

  const wordmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkTranslateY.value }],
  }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Svg width={MARK_SIZE} height={MARK_SIZE} viewBox={PATHORA_LOGO_VIEWBOX} fill="none">
          <AnimatedPath
            d={PATHORA_LOGO_PATH_D}
            stroke={PathoraColors.teal500}
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={STROKE_DASH_LENGTH}
            animatedProps={pathAnimatedProps}
          />
          <AnimatedCircle
            cx={PATHORA_LOGO_DOT.cx}
            cy={PATHORA_LOGO_DOT.cy}
            fill={PathoraColors.amber500}
            animatedProps={dotAnimatedProps}
          />
        </Svg>

        <Animated.View style={wordmarkAnimatedStyle}>
          <Text style={styles.wordmark}>Path</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Nudges the lockup slightly above true vertical center, per the design.
    paddingBottom: '10%',
    gap: 14,
  },
  wordmark: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 34,
    color: PathoraColors.ink900,
  },
});
