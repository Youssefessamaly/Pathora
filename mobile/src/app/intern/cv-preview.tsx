import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { AuthBackButton } from '@/components/auth-back-button';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { downloadInternCv } from '@/lib/api';
import { describeOnboardingError } from '@/lib/onboarding';

export default function CvPreviewScreen() {
  const router = useRouter();
  const { fileName } = useLocalSearchParams<{ fileName?: string }>();
  const { token } = useAuth();

  const [fileUri, setFileUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpeningAndroid, setIsOpeningAndroid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
      router.replace('/intern/profile');
  };

  const openAndroidViewer = useCallback(async (uri: string) => {
    setIsOpeningAndroid(true);

    try {
      const contentUri = await FileSystemLegacy.getContentUriAsync(uri);
      await Linking.openURL(contentUri);
    } catch {
      setError('No PDF viewer is available on this device.');
    } finally {
      setIsOpeningAndroid(false);
    }
  }, []);

  const loadCv = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const file = await downloadInternCv(token);

      setFileUri(file.uri);

      if (Platform.OS === 'android') {
        await openAndroidViewer(file.uri);
      }
    } catch (loadError) {
      setError(describeOnboardingError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [openAndroidViewer, token]);

  const handleRetry = () => {
    setError(null);
    setFileUri(null);
    setIsLoading(true);

    void loadCv();
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    void downloadInternCv(token)
      .then(async (file) => {
        if (cancelled) {
          return;
        }

        setFileUri(file.uri);

        if (Platform.OS === 'android') {
          await openAndroidViewer(file.uri);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(describeOnboardingError(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [openAndroidViewer, token]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <AuthBackButton onPress={handleBack} />

        <View style={styles.headerText}>
          <Text style={styles.title}>CV Preview</Text>

          <Text style={styles.fileName} numberOfLines={1}>
            {fileName ?? 'Your CV'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {!token ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>
              Your session has expired. Please log in again.
            </Text>
          </View>
        ) : isLoading && !fileUri ? (
          <View style={styles.centerContent}>
            <ActivityIndicator color={PathoraColors.teal600} />
            <Text style={styles.statusText}>Loading your CV…</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{error}</Text>

            <PathoraButton
              label="Try again"
              variant="secondary"
              onPress={handleRetry}
              style={styles.actionButton}
            />
          </View>
        ) : Platform.OS === 'android' ? (
          <View style={styles.centerContent}>
            <Text style={styles.statusText}>
              Your CV opens in the device PDF viewer. Use the Back button there
              to return to Pathora.
            </Text>

            <PathoraButton
              label={isOpeningAndroid ? 'Opening…' : 'Open CV'}
              variant="primary"
              onPress={() => {
                if (fileUri) {
                  void openAndroidViewer(fileUri);
                }
              }}
              disabled={!fileUri || isOpeningAndroid}
              style={styles.actionButton}
            />
          </View>
        ) : fileUri ? (
          <WebView
            source={{ uri: fileUri }}
            style={styles.webView}
            originWhitelist={['*']}
            allowFileAccess
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webViewLoading}>
                <ActivityIndicator color={PathoraColors.teal600} />
              </View>
            )}
            onError={() => {
              setError('Unable to display your CV on this device.');
            }}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PathoraSpacing[12],
    paddingHorizontal: PathoraSpacing[16],
    paddingVertical: PathoraSpacing[12],
    backgroundColor: PathoraColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: PathoraColors.border,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 17,
    color: PathoraColors.ink900,
  },

  fileName: {
    marginTop: 2,
    fontFamily: PathoraFonts.en.regular,
    fontSize: 12,
    color: PathoraColors.textSecondary,
  },

  content: {
    flex: 1,
    backgroundColor: PathoraColors.surface,
  },

  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: PathoraSpacing[16],
    paddingHorizontal: PathoraSpacing[24],
  },

  statusText: {
    maxWidth: 360,
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14,
    lineHeight: 21,
    color: PathoraColors.textSecondary,
    textAlign: 'center',
  },

  errorText: {
    maxWidth: 360,
    fontFamily: PathoraFonts.en.medium,
    fontSize: 14,
    lineHeight: 21,
    color: PathoraColors.error,
    textAlign: 'center',
  },

  actionButton: {
    minWidth: 150,
  },

  webView: {
    flex: 1,
    backgroundColor: PathoraColors.surface,
  },

  webViewLoading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PathoraColors.surface,
  },
});