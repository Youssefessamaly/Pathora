/**
 * Path student navigation: a spring-driven, glass-inspired tab bar.
 *
 * The selected capsule and its icon/label colors all follow one shared animation
 * value, so the highlight really travels between tabs instead of jumping.
 * Native Apple Liquid Glass is used on supported iOS versions; the gradient
 * surface is the deliberate Android / older-iOS / web fallback.
 */
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState, type ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PathoraColors, PathoraFonts } from '@/constants/pathora-theme';

type InternTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

type TabDefinition = {
  label: string;
  icon: SymbolViewProps['name'];
};

const TAB_DEFINITIONS: Record<string, TabDefinition> = {
  index: {
    label: 'Home',
    icon: { ios: 'house.fill', android: 'home', web: 'home' },
  },
  internships: {
    label: 'Internships',
    icon: { ios: 'briefcase.fill', android: 'work', web: 'work' },
  },
  favorites: {
    label: 'Favorites',
    icon: { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' },
  },
  applications: {
    label: 'Applications',
    icon: { ios: 'doc.text.fill', android: 'description', web: 'description' },
  },
  profile: {
    label: 'Profile',
    icon: { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
  },
};

const ACTIVE_ICON = '#FFFFFF';
const INACTIVE_ICON = PathoraColors.textSecondary;
const TRACK_HEIGHT = 70;
const CAPSULE_INSET = 5;

function LiquidTabButton({
  index,
  progress,
  label,
  icon,
  selected,
  onPress,
  onLongPress,
}: {
  index: number;
  progress: SharedValue<number>;
  label: string;
  icon: SymbolViewProps['name'];
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  // This follows the moving capsule: old text gently dims while new text
  // becomes white only when the capsule reaches it.
  const iconInactiveStyle = useAnimatedStyle(() => {
    const amount = Math.max(0, 1 - Math.abs(progress.value - index));
    return { opacity: 1 - amount };
  });
  const iconActiveStyle = useAnimatedStyle(() => {
    const amount = Math.max(0, 1 - Math.abs(progress.value - index));
    return {
      opacity: amount,
      transform: [{ scale: interpolate(amount, [0, 1], [0.88, 1.06]) }],
    };
  });
  const labelStyle = useAnimatedStyle(() => {
    const amount = Math.max(0, 1 - Math.abs(progress.value - index));
    return {
      color: interpolateColor(amount, [0, 1], [INACTIVE_ICON, '#FFFFFF']),
      transform: [{ translateY: interpolate(amount, [0, 1], [0, -1]) }],
    };
  });

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}
      testID={`intern-tab-${label.toLowerCase()}`}>
      <View style={styles.tabContent}>
        <View style={styles.iconFrame}>
          <Animated.View style={[styles.iconLayer, iconInactiveStyle]}>
            <SymbolView name={icon} size={23} tintColor={INACTIVE_ICON} />
          </Animated.View>
          <Animated.View style={[styles.iconLayer, iconActiveStyle]}>
            <SymbolView name={icon} size={23} tintColor={ACTIVE_ICON} />
          </Animated.View>
        </View>
        <Animated.Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          style={[styles.tabLabel, labelStyle]}>
          {label}
        </Animated.Text>
      </View>
    </Pressable>
  );
}

export function InternLiquidTabBar({ state, navigation }: InternTabBarProps) {
  const { bottom } = useSafeAreaInsets();
  const [trackWidth, setTrackWidth] = useState(0);
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const stretch = useSharedValue(1);
  // cv-preview is registered with href: null. Never reserve space for it,
  // and hide this custom tab bar completely when that full-screen page is open.
  const visibleRoutes = state.routes.filter((route) => Boolean(TAB_DEFINITIONS[route.name]));
  const activeRoute = state.routes[state.index];
  const activeVisibleIndex = visibleRoutes.findIndex((route) => route.key === activeRoute?.key);
  const count = visibleRoutes.length;
  const tabWidth = count > 0 ? trackWidth / count : 0;

  const nativeGlass =
    Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

  useEffect(() => {
    if (activeVisibleIndex < 0) return;

    if (reducedMotion) {
      progress.value = activeVisibleIndex;
      stretch.value = 1;
      return;
    }

    // Subtle travel and recovery gives a liquid-like feel without distracting
    // from the page content. Shared animation works with swipe/deep links too.
    progress.value = withSpring(activeVisibleIndex, {
      damping: 20,
      stiffness: 185,
      mass: 0.83,
      overshootClamping: true,
      reduceMotion: ReduceMotion.System,
    });
    stretch.value = withSequence(
      withTiming(1.075, { duration: 125, reduceMotion: ReduceMotion.System }),
      withSpring(1, { damping: 17, stiffness: 210, reduceMotion: ReduceMotion.System }),
    );
  }, [progress, reducedMotion, activeVisibleIndex, stretch]);

  const capsuleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * tabWidth },
      { scaleX: stretch.value },
    ],
  }));

  const measureTrack = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setTrackWidth((current) => (Math.abs(current - nextWidth) < 0.5 ? current : nextWidth));
  };

  if (activeVisibleIndex < 0) return null;

  return (
    <View pointerEvents="box-none" style={[styles.safeAreaBack, { paddingBottom: Math.max(bottom, 10) }]}>
      <View style={styles.floatingBar}>
        {nativeGlass ? (
          <GlassView
            pointerEvents="none"
            glassEffectStyle="regular"
            tintColor="#F3FAF7"
            style={styles.surfaceBackground}
          />
        ) : (
          <LinearGradient
            pointerEvents="none"
            colors={['#FFFFFF', '#F0F7F4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.surfaceBackground}
          />
        )}

        <View style={styles.tabTrack} onLayout={measureTrack}>
          {tabWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.selectedCapsule,
                { width: Math.max(0, tabWidth - CAPSULE_INSET * 2) },
                capsuleStyle,
              ]}>
              <LinearGradient
                colors={['#218979', '#12695E', '#0D4A43']}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.capsuleGradient}
              />
            </Animated.View>
          )}

          {visibleRoutes.map((route, index) => {
            const definition = TAB_DEFINITIONS[route.name];
            if (!definition) return null;
            const focused = activeVisibleIndex === index;

            return (
              <LiquidTabButton
                key={route.key}
                index={index}
                progress={progress}
                label={definition.label}
                icon={definition.icon}
                selected={focused}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name, route.params);
                  }
                }}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeAreaBack: {
    // Overlay instead of reserving a solid-color footer. The screen can render
    // and scroll underneath the empty area around the floating glass bar.
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  floatingBar: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
    padding: 4,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#D8E5DF',
    backgroundColor: '#F6FBF9',
    shadowColor: PathoraColors.teal700,
    shadowOpacity: 0.13,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 19,
    elevation: 8,
    overflow: 'hidden',
  },
  surfaceBackground: {
    ...StyleSheet.absoluteFill,
    borderRadius: 30,
  },
  tabTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TRACK_HEIGHT,
    width: '100%',
  },
  selectedCapsule: {
    position: 'absolute',
    left: CAPSULE_INSET,
    top: CAPSULE_INSET,
    height: TRACK_HEIGHT - CAPSULE_INSET * 2,
    borderRadius: 23,
    backgroundColor: PathoraColors.teal700,
    overflow: 'hidden',
    shadowColor: PathoraColors.teal700,
    shadowOpacity: 0.19,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  capsuleGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 23,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    minWidth: 0,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabButtonPressed: {
    opacity: 0.8,
  },
  tabContent: {
    width: '100%',
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  iconFrame: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    maxWidth: '100%',
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 10.5,
    letterSpacing: -0.1,
  },
});
