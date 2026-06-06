import { StyleSheet, type DimensionValue } from 'react-native';
import {
  borderRadius,
  bottomTabItemWidth,
  maxWidth,
  pageBottomPadding,
  pagePadding,
  spacing,
} from '@nail-couture/shared/theme/layout.js';

/** Strict flexbox presets matching common web Tailwind utility combinations. */
export const flex = StyleSheet.create({
  row: { flexDirection: 'row' },
  col: { flexDirection: 'column' },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowStart: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  colCenter: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: { flex: 1 },
  shrink0: { flexShrink: 0 },
  wrap: { flexWrap: 'wrap' },
});

/** Spacing helpers — direct Tailwind unit → px mapping. */
export const gap = {
  0.5: spacing[0.5],
  1: spacing[1],
  1.5: spacing[1.5],
  2: spacing[2],
  3: spacing[3],
  4: spacing[4],
  5: spacing[5],
  6: spacing[6],
  8: spacing[8],
  12: spacing[12],
} as const;

export const layout = StyleSheet.create({
  /** min-h-screen w-full */
  screen: {
    flex: 1,
    width: '100%' as DimensionValue,
  },
  /** min-h-screen flex items-center justify-center */
  screenCentered: {
    flex: 1,
    width: '100%' as DimensionValue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** min-h-screen flex items-center justify-center px-4 */
  authScreen: {
    flex: 1,
    width: '100%' as DimensionValue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  /** w-full max-w-md */
  authCardWrap: {
    width: '100%' as DimensionValue,
    maxWidth: maxWidth.md,
  },
  /** fixed inset-0 flex items-center justify-center p-4 */
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  /** w-full flex flex-col rounded-2xl max-h-[90%] */
  modalPanel: {
    width: '100%' as DimensionValue,
    maxWidth: maxWidth.lg,
    maxHeight: '90%' as DimensionValue,
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
  },
  /** flex items-start justify-between gap-3 px-5 py-4 */
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  /** px-5 py-4 */
  modalBody: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  /** px-5 py-4 flex flex-row gap-3 */
  modalFooter: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    flexDirection: 'row',
    gap: spacing[3],
  },
  /** flex items-start justify-between gap-3 (page header row) */
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
  },
  /** Bottom tab item: w-[72px] flex flex-col items-center */
  bottomTabItem: {
    width: bottomTabItemWidth,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1.5],
  },
});

type PageContentOptions = {
  horizontal: number;
  bottom: number;
  top?: number;
};

/** p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 content container */
export function pageContentStyle({
  horizontal,
  bottom,
  top = 0,
}: PageContentOptions) {
  return {
    paddingHorizontal: horizontal,
    paddingTop: top,
    paddingBottom: bottom,
    flexGrow: 1,
  };
}

export function gridItemStyle(columns: number, gapValue: number) {
  if (columns <= 1) {
    return { width: '100%' as const };
  }

  const percent = 100 / columns;
  const horizontalGutter = (gapValue * (columns - 1)) / columns;
  return {
    width: `${percent}%` as const,
    maxWidth: `${percent}%` as const,
    paddingRight: horizontalGutter,
    marginBottom: gapValue,
  };
}

export { spacing, pagePadding, pageBottomPadding, maxWidth, borderRadius, bottomTabItemWidth };
