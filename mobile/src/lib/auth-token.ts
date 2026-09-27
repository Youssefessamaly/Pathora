import * as SecureStore from 'expo-secure-store';

/**
 * Secure storage for the Pathora access token. Never log the token value.
 */
const ACCESS_TOKEN_KEY = 'pathora_access_token';

export async function storeAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function removeAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}
