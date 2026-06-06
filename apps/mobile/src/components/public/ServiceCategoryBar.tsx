import { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useThemeStyles } from '../../theme/useThemeStyles';

type ServiceCategoryBarProps = {
  tabs: string[];
  activeCategory: string;
  onSelect: (category: string) => void;
  inactiveBorder?: boolean;
};

export function useCategoryFade(onSelect: (category: string) => void) {
  const changeCategory = useCallback(
    (
      nextCategory: string,
      currentCategory: string,
      setVisible: (visible: boolean) => void,
    ) => {
      if (nextCategory === currentCategory) return;
      setVisible(false);
      setTimeout(() => {
        onSelect(nextCategory);
        setVisible(true);
      }, 200);
    },
    [onSelect],
  );

  return { changeCategory };
}

function EdgeFade({ side }: { side: 'left' | 'right' }) {
  const { tokens } = useThemeStyles();
  const fadeFrom = tokens.bgPrimary;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 8,
        width: 32,
        zIndex: 1,
        ...(side === 'left' ? { left: 0 } : { right: 0 }),
      }}
    >
      <Svg width={32} height={40}>
        <Defs>
          <LinearGradient
            id={`fade-${side}`}
            x1={side === 'left' ? '0%' : '100%'}
            y1="0%"
            x2={side === 'left' ? '100%' : '0%'}
            y2="0%"
          >
            <Stop offset="0%" stopColor={fadeFrom} stopOpacity="1" />
            <Stop offset="100%" stopColor={fadeFrom} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="32" height="40" fill={`url(#fade-${side})`} />
      </Svg>
    </View>
  );
}

export function ServiceCategoryBar({
  tabs,
  activeCategory,
  onSelect,
  inactiveBorder = true,
}: ServiceCategoryBarProps) {
  const styles = useThemeStyles();

  return (
    <View style={{ position: 'relative', marginBottom: 4 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 4, paddingBottom: 8 }}
      >
        {tabs.map((tab) => {
          const active = tab === activeCategory;
          return (
            <Pressable
              key={tab}
              onPress={() => onSelect(tab)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: inactiveBorder && !active ? 1 : 0,
                borderColor: active ? styles.tokens.goldStrong : `${styles.tokens.goldStrong}44`,
                backgroundColor: active ? styles.tokens.goldStrong : 'transparent',
              }}
            >
              <Text
                style={{
                  color: active ? '#121212' : styles.tokens.textSecondary,
                  fontSize: 12,
                  letterSpacing: 1.5,
                  fontWeight: active ? '600' : '400',
                }}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <EdgeFade side="left" />
      <EdgeFade side="right" />
    </View>
  );
}
