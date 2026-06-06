import { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { lookbookCategories, lookbookData, type LookbookItem } from '../../constants/lookbookData';
import { useThemeStyles } from '../../theme/useThemeStyles';
import { AppModal, ModalButton } from '../AppModal';

const CARD_WIDTH = Math.min(Dimensions.get('window').width * 0.72, 320);
const CARD_HEIGHT = 420;

type LookbookGalleryProps = {
  onContactPress?: () => void;
};

export function LookbookGallery({ onContactPress }: LookbookGalleryProps) {
  const styles = useThemeStyles();
  const [activeCategory, setActiveCategory] = useState<(typeof lookbookCategories)[number]>('All');
  const [selectedItem, setSelectedItem] = useState<LookbookItem | null>(null);

  const filteredItems = useMemo(
    () =>
      activeCategory === 'All'
        ? lookbookData
        : lookbookData.filter((item) => item.category === activeCategory),
    [activeCategory],
  );

  const renderItem: ListRenderItem<LookbookItem> = ({ item }) => (
    <Pressable
      onPress={() => setSelectedItem(item)}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        marginRight: 16,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: styles.tokens.cardBorder,
      }}
    >
      <Image source={item.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: 16,
          backgroundColor: 'rgba(18,18,18,0.75)',
        }}
      >
        <Text style={{ color: styles.tokens.goldStrong, fontSize: 11, letterSpacing: 2 }}>
          {item.category.toUpperCase()}
        </Text>
        <Text style={{ color: '#F9F9F9', fontSize: 20, fontWeight: '600', marginTop: 4 }}>
          {item.title}
        </Text>
        <Text style={{ color: 'rgba(249,249,249,0.65)', marginTop: 4 }} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Text style={{ color: styles.tokens.goldStrong, fontSize: 18, fontWeight: '600' }}>
            {item.price}
          </Text>
          <Text style={{ color: 'rgba(249,249,249,0.45)', fontSize: 11, flex: 1 }} numberOfLines={1}>
            {item.service}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={[styles.textPrimary, { fontSize: 32, fontWeight: '600' }]}>Couture Lookbook</Text>
        <Text style={[styles.textSecondary, { marginTop: 6 }]}>Inspiration for your next appointment</Text>
      </View>

      <ScrollableCategoryFilters
        categories={lookbookCategories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8 }}
        style={{ marginHorizontal: -20 }}
      />

      <AppModal
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title}
        subtitle={selectedItem?.category.toUpperCase()}
        scrollBody
        footer={
          <>
            <ModalButton label="Close" onPress={() => setSelectedItem(null)} />
            <ModalButton
              label="Contact Us"
              variant="primary"
              onPress={() => {
                setSelectedItem(null);
                onContactPress?.();
              }}
            />
          </>
        }
      >
        {selectedItem ? (
          <View style={{ gap: 16 }}>
            <Image
              source={selectedItem.image}
              style={{ width: '100%', height: 260, borderRadius: 12 }}
              resizeMode="cover"
            />
            <Text style={styles.textSecondary}>{selectedItem.description}</Text>
            <View
              style={{
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: styles.tokens.borderLight,
                paddingVertical: 12,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <Text style={styles.textSecondary}>Recommended Service</Text>
                <Text style={[styles.textPrimary, { flex: 1, textAlign: 'right' }]}>
                  {selectedItem.service}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.textSecondary}>Starting Price</Text>
                <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600' }]}>
                  {selectedItem.price}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </AppModal>
    </View>
  );
}

function ScrollableCategoryFilters<T extends string>({
  categories,
  activeCategory,
  onSelect,
}: {
  categories: readonly T[];
  activeCategory: T;
  onSelect: (category: T) => void;
}) {
  const styles = useThemeStyles();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
      {categories.map((category) => {
        const active = category === activeCategory;
        return (
          <Pressable
            key={category}
            onPress={() => onSelect(category)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: active ? 0 : 1,
              borderColor: styles.tokens.borderColor,
              backgroundColor: active ? styles.tokens.textPrimary : 'transparent',
            }}
          >
            <Text
              style={{
                color: active ? styles.tokens.bgPrimary : styles.tokens.textSecondary,
                fontSize: 12,
                letterSpacing: 1.5,
              }}
            >
              {category}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
