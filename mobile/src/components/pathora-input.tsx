import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { PathoraColors, PathoraFonts, PathoraRadius } from '@/constants/pathora-theme';

export type PathoraInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
};

export function PathoraInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  autoComplete,
  textContentType,
  secureTextEntry = false,
  multiline = false,
  numberOfLines,
  style,
}: PathoraInputProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label.length > 0 && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          multiline && styles.inputContainerMultiline,
          focused && styles.inputContainerFocused,
        ]}>
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={PathoraColors.textTertiary}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          secureTextEntry={secureTextEntry && !visible}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setVisible((current) => !current)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}>
            <SymbolView
              name={{
                ios: visible ? 'eye.slash' : 'eye',
                android: visible ? 'visibility_off' : 'visibility',
                web: visible ? 'visibility_off' : 'visibility',
              }}
              size={18}
              tintColor={PathoraColors.textSecondary}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 13,
    color: PathoraColors.ink900,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: PathoraColors.borderStrong,
    borderRadius: PathoraRadius[12],
    backgroundColor: PathoraColors.surface,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputContainerMultiline: {
    alignItems: 'flex-start',
    minHeight: 96,
  },
  inputContainerFocused: {
    borderColor: PathoraColors.teal500,
  },
  input: {
    flex: 1,
    padding: 0,
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14.5,
    color: PathoraColors.ink900,
  },
  inputMultiline: {
    minHeight: 70,
  },
});
