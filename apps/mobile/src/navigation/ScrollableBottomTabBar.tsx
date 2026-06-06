import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { getNavItemsForRole } from '@nail-couture/shared/navigation/navItems.js';
import { useAuth } from '../contexts/AuthContext';
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

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: tokens.borderLight,
        backgroundColor: tokens.bgSecondary,
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
          paddingHorizontal: 8,
          paddingVertical: 8,
          gap: 4,
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

          return (
            <Pressable
              key={item.id}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? item.label}
              style={{
                minWidth: 76,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 14,
                backgroundColor: isFocused ? tokens.inputBg : 'transparent',
              }}
            >
              <NavIcon path={item.icon} active={isFocused} />
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: isFocused ? tokens.goldStrong : tokens.textSecondary,
                }}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
