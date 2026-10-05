import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { PathoraColors, PathoraFonts } from '@/constants/pathora-theme';

/**
 * The frozen Pathora mark's raw geometry — exported so the animated splash sequence
 * (app/index.tsx) can reuse the exact same path/dot without a second copy of this data.
 */
export const PATHORA_LOGO_VIEWBOX = '0 0 64 64';
export const PATHORA_LOGO_PATH_D = 'M10 46 C18 46, 22 34, 30 34 C38 34, 38 20, 50 18';
export const PATHORA_LOGO_DOT = { cx: 50, cy: 18, r: 4.5 } as const;

export type PathoraLogoVariant = 'full' | 'mark';

export type PathoraLogoProps = {
  /** 'full' (mark + "Path" wordmark, the default) or 'mark' (icon only). */
  variant?: PathoraLogoVariant;
  /** The mark's rendered size in dp. Defaults to a compact size suitable for a screen header;
   *  pass a much larger value for a splash-scale lockup. */
  size?: number;
  /** The wordmark's font size in dp — independent of `size` since the two don't scale
   *  proportionally between a small header lockup and a large splash lockup. Ignored when
   *  variant is 'mark'. Defaults to a size matched to the default `size` above. */
  wordmarkSize?: number;
  style?: StyleProp<ViewStyle>;
};

export function PathoraLogoMark({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox={PATHORA_LOGO_VIEWBOX} fill="none">
      <Path
        d={PATHORA_LOGO_PATH_D}
        stroke={PathoraColors.teal500}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <Circle
        cx={PATHORA_LOGO_DOT.cx}
        cy={PATHORA_LOGO_DOT.cy}
        r={PATHORA_LOGO_DOT.r}
        fill={PathoraColors.amber500}
      />
    </Svg>
  );
}

/** The reusable Pathora logo lockup — the exact mark/dot geometry from the frozen design,
 *  rendered as real vector shapes (not a gradient placeholder) so it matches the splash
 *  screen's animated version exactly once settled in its final state. */
export function PathoraLogo({ variant = 'full', size = 28, wordmarkSize = 16, style }: PathoraLogoProps) {
  if (variant === 'mark') {
    return (
      <View style={style}>
        <PathoraLogoMark size={size} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <PathoraLogoMark size={size} />
      <Text style={[styles.wordmark, { fontSize: wordmarkSize }]}>Path</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordmark: {
    fontFamily: PathoraFonts.en.extraBold,
    color: PathoraColors.ink900,
  },
});
