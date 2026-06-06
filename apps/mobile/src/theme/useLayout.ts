import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  bottomTabBarHeight,
  getBreakpoint,
  pageBottomPadding,
  pagePadding,
  resolveGridColumns,
  resolveResponsive,
  screens,
  spacing,
} from '@nail-couture/shared/theme/layout.js';
import { pageContentStyle } from './layoutStyles';

type UseLayoutOptions = {
  /** When true, apply pb-24-style clearance for the authenticated bottom tab bar. */
  withBottomTabBar?: boolean;
};

export function useLayout(options: UseLayoutOptions = {}) {
  const { withBottomTabBar = false } = options;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const breakpoint = getBreakpoint(width);
    const isMdUp = width >= screens.md;
    const isLgUp = width >= screens.lg;

    const horizontalPadding = resolveResponsive(width, pagePadding);
    const baseBottomPadding = withBottomTabBar
      ? isLgUp
        ? pageBottomPadding.desktop
        : pageBottomPadding.mobile
      : pageBottomPadding.desktop;

    const contentBottomPadding = withBottomTabBar
      ? Math.max(baseBottomPadding, bottomTabBarHeight + insets.bottom)
      : Math.max(baseBottomPadding, insets.bottom);

    return {
      width,
      breakpoint,
      isMdUp,
      isLgUp,
      spacing,
      insets,
      horizontalPadding,
      contentBottomPadding,
      pageContent: pageContentStyle({
        horizontal: horizontalPadding,
        bottom: contentBottomPadding,
      }),
      /** Sidebar offset: pl-0 md:pl-20 lg:pl-64 — zero on phone; reserved for tablet split layouts */
      sidebarPaddingLeft: isLgUp ? 256 : isMdUp ? 80 : 0,
      gridColumns: (columns: { base: number; sm?: number; md?: number; lg?: number; xl?: number }) =>
        resolveGridColumns(width, columns),
    };
  }, [width, insets.bottom, withBottomTabBar]);
}
