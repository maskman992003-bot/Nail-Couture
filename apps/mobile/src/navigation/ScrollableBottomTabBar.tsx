import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoldGradientBadge } from '../components/GoldGradientBadge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '@nail-couture/shared/theme/tokens.js';
import { getNavItemsForRole } from '@nail-couture/shared/navigation/navItems.js';
import { spacing } from '@nail-couture/shared/theme/layout.js';
import { useAuth } from '../contexts/AuthContext';
import { useNavBadges } from '../hooks/useNavBadges';
import { layout } from '../theme/layoutStyles';
import { useThemeStyles } from '../theme/useThemeStyles';
import { NavIcon } from '../components/NavIcon';
import { resolveScreenName } from './screenRegistry';

const SCROLL_OFFSET_PREFIX = 'bottom_nav_scroll_';

export function ScrollableBottomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { user } = useAuth();
  const { tokens } = useThemeStyles();
  const insets = useSafeAreaInsets();
  const { getBadgeCount } = useNavBadges();
  const scrollRef = useRef<ScrollView>(null);
  const contentWidthRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const scrollKey = `${SCROLL_OFFSET_PREFIX}${user?.role || 'guest'}`;

  const navItems = useMemo(() => getNavItemsForRole(user?.role), [user?.role]);

  const activeRouteName = state.routes[state.index]?.name;

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(scrollKey).then((saved) => {
      if (!mounted || !saved || !scrollRef.current) return;
      const offset = Number.parseInt(saved, 10);
      if (!Number.isNaN(offset)) {
        scrollRef.current.scrollTo({ x: offset, animated: false });
        scrollOffsetRef.current = offset;
      }
    });
    return () => {
      mounted = false;
    };
  }, [scrollKey]);

  const persistScrollOffset = useCallback(
    (offset: number) => {
      scrollOffsetRef.current = offset;
      AsyncStorage.setItem(scrollKey, String(Math.round(offset)));
    },
    [scrollKey],
  );

  const onContentSizeChange = useCallback((width: number) => {
    contentWidthRef.current = width;
  }, []);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const viewportWidth = event.nativeEvent.layout.width;
      const maxOffset = Math.max(0, contentWidthRef.current - viewportWidth);
      if (scrollOffsetRef.current > maxOffset && scrollRef.current) {
        const clamped = maxOffset;
        scrollRef.current.scrollTo({ x: clamped, animated: false });
        persistScrollOffset(clamped);
      }
    },
    [persistScrollOffset],
  );

  if (!user || navItems.length === 0) {
    return null;
  }

  const inactiveColor = tokens.textSecondary;

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: tokens.sidebarBorder,
        backgroundColor: tokens.sidebarBg,
        paddingBottom: Math.max(insets.bottom, spacing[1]),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 24,
      }}
      onLayout={onLayout}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        onScroll={(event) => persistScrollOffset(event.nativeEvent.contentOffset.x)}
        onContentSizeChange={onContentSizeChange}
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: spacing[1],
          paddingVertical: spacing[2],
          gap: spacing[1],
        }}
      >
        {navItems.map((item: { id: string; label: string; icon: string }) => {
          const screenName = resolveScreenName(item.id);
          const routeIndex = state.routes.findIndex((route) => route.name === screenName);
          const isFocused = routeIndex === state.index || activeRouteName === screenName;
          const route = state.routes[routeIndex];
          const options = route ? descriptors[route.key]?.options : undefined;

          const onPress = () => {
            if (routeIndex >= 0) {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(screenName);
              }
              return;
            }
            navigation.navigate(screenName);
          };

          const badgeCount = getBadgeCount(item.id);
          const showBadge = badgeCount > 0;

          return (
            <Pressable
              key={item.id}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? item.label}
              style={layout.bottomTabItem}
            >
              <View style={{ position: 'relative' }}>
                <NavIcon path={item.icon} active={isFocused} />
                {showBadge ? (
                  <GoldGradientBadge
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -10,
                      minWidth: 14,
                      height: 14,
                      borderRadius: 7,
                      paddingHorizontal: 2,
                    }}
                  >
                    <Text style={{ color: colors.charcoal, fontSize: 7, fontWeight: '700' }}>
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </Text>
                  </GoldGradientBadge>
                ) : null}
              </View>
              <Text
                style={{
                  marginTop: spacing[0.5],
                  fontSize: 8,
                  fontWeight: '500',
                  letterSpacing: 0.5,
                  color: isFocused ? tokens.goldStrong : inactiveColor,
                }}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
        <View style={{ width: spacing[4], flexShrink: 0 }} accessibilityElementsHidden />
      </ScrollView>
    </View>
  );
}
