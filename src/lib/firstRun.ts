import * as SecureStore from 'expo-secure-store';

/** True only the first time it is called for `key` on this install (the flag lives in SecureStore). */
export async function isFirstTime(key: string): Promise<boolean> {
  if (await SecureStore.getItemAsync(key)) return false;
  await SecureStore.setItemAsync(key, '1');
  return true;
}
