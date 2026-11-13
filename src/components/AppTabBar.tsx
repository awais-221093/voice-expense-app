import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MIC_SIZE, MicButton } from '@/components/MicButton';
import { AppText } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { TAB_BAR_HEIGHT, radius, useTheme } from '@/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Route name → label and icons (filled when active). Order in the bar follows the routes. */
const TABS: Record<string, { label: string; icon: IconName; activeIcon: IconName }> = {
  index: { label: 'Home', icon: 'home-variant-outline', activeIcon: 'home-variant' },
  activity: { label: 'Activity', icon: 'receipt-text-outline', activeIcon: 'receipt-text' },
  insights: { label: 'Insights', icon: 'chart-donut', activeIcon: 'chart-donut' },
  profile: { label: 'Profile', icon: 'account-circle-outline', activeIcon: 'account-circle' },
};

/**
 * Custom bar: two tabs, the raised mic, two tabs. The mic sits in the thumb's natural spot so
 * recording — the app's one core action — is reachable from every screen.
 */
export function AppTabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const c = useTheme();
  const half = Math.ceil(state.routes.length / 2);

  const renderTab = (index: number) => {
    const route = state.routes[index];
    const meta = TABS[route.name] ?? { label: route.name, icon: 'circle', activeIcon: 'circle' };
    const focused = index === state.index;
    const onPress = () => {
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        haptics.tick();
        navigateToTab(route.key);
      }
    };
    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.label}
        style={styles.tab}>
        <View style={[styles.pill, focused && { backgroundColor: c.surfaceAlt }]}>
          <MaterialCommunityIcons
            name={focused ? meta.activeIcon : meta.icon}
            size={24}
            color={focused ? c.primary : c.textMuted}
          />
        </View>
        <AppText variant="small" color={focused ? c.text : c.textMuted} style={styles.label}>
          {meta.label}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        {
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: c.surface,
          borderTopColor: c.border,
        },
      ]}
      accessibilityRole="tablist">
      {state.routes.slice(0, half).map((_, i) => renderTab(i))}
      <View style={styles.micSlot}>
        <MicButton />
      </View>
      {state.routes.slice(half).map((_, i) => renderTab(half + i))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, height: TAB_BAR_HEIGHT },
  pill: {
    width: 56,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12 },
  // Lift the mic so it overlaps the bar's top edge.
  micSlot: { marginTop: -MIC_SIZE / 2 - 4, alignSelf: 'flex-start' },
});
