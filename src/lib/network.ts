import NetInfo, { useNetInfo } from '@react-native-community/netinfo';

/** `isConnected` is null while unknown; treat unknown as online so we never block on it. */
export function useIsOnline(): boolean {
  return useNetInfo().isConnected !== false;
}

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected !== false && state.isInternetReachable !== false;
}

export const onNetworkChange = (fn: (online: boolean) => void) =>
  NetInfo.addEventListener((s) => fn(s.isConnected !== false));
