import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, Text, TextInput, View } from 'react-native';
import { getServices } from '@nail-couture/shared/services/services.js';
import {
  buildCategoryTabs,
  fetchServiceCategories,
  getDisplayCategories,
} from '@nail-couture/shared/utils/serviceCategories.js';
import { CUSTOMER_ONLINE_BOOKING } from '@nail-couture/shared/constants/featureFlags.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { CustomerScreenLayout } from '../../components/customer/CustomerScreenLayout';
import { ServiceCategoryBar, useCategoryFade } from '../../components/public/ServiceCategoryBar';
import { useThemeStyles } from '../../theme/useThemeStyles';

type ServiceRecord = {
  id: string;
  name: string;
  price?: number;
  description?: string;
  duration_minutes?: number;
  category?: string;
  is_addon?: boolean;
};

export function CustomerServicesScreen() {
  const styles = useThemeStyles();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [dbCategories, setDbCategories] = useState<Array<{ name?: string } | string>>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contentVisible, setContentVisible] = useState(true);
  const isFirstCategoryRender = useRef(true);

  useEffect(() => {
    Promise.all([getServices(), fetchServiceCategories(getSupabase())])
      .then(([data, categories]) => {
        setServices((data as ServiceRecord[]) || []);
        setDbCategories(categories);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return services.filter((service) => {
      if (service.is_addon) return false;
      if (!term) return true;
      return (
        service.name.toLowerCase().includes(term) ||
        (service.category || '').toLowerCase().includes(term)
      );
    });
  }, [services, searchTerm]);

  const { grouped, sortedCategories, categoryTabs } = useMemo(
    () => buildCategoryTabs(filteredServices, dbCategories),
    [filteredServices, dbCategories],
  );

  useEffect(() => {
    if (activeCategory === 'All') return;
    if (!sortedCategories.includes(activeCategory)) {
      setActiveCategory('All');
      setExpandedCategory(null);
    }
  }, [sortedCategories, activeCategory]);

  const displayCategories = getDisplayCategories(activeCategory, sortedCategories);

  const { changeCategory } = useCategoryFade((cat) => {
    setActiveCategory(cat);
    setExpandedCategory(null);
  });

  useEffect(() => {
    if (isFirstCategoryRender.current) {
      isFirstCategoryRender.current = false;
      return;
    }
    setContentVisible(true);
  }, [activeCategory]);

  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(contentOpacity, {
      toValue: contentVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [contentVisible, contentOpacity]);

  const handleCategorySelect = (cat: string) => {
    changeCategory(cat, activeCategory, setContentVisible);
  };

  return (
    <CustomerScreenLayout title="Services" subtitle="Browse our menu and pricing">
      <TextInput
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholder="Search services..."
        placeholderTextColor={styles.tokens.textMuted}
        style={[styles.input, { marginBottom: 12 }]}
      />

      <ServiceCategoryBar
        tabs={categoryTabs}
        activeCategory={activeCategory}
        onSelect={handleCategorySelect}
      />

      {loading ? (
        <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginTop: 32 }} />
      ) : (
        <Animated.View style={{ marginTop: 16, gap: 12, opacity: contentOpacity }}>
          {displayCategories.map((category: string) => {
            const isOpen = displayCategories.length === 1 || expandedCategory === category;
            const categoryServices = grouped[category] || [];
            return (
              <View key={category} style={[styles.card, { overflow: 'hidden' }]}>
                <Pressable
                  onPress={() => setExpandedCategory(isOpen ? null : category)}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    padding: 16,
                  }}
                >
                  <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{category}</Text>
                  <Text style={styles.textGold}>{isOpen ? '−' : '+'}</Text>
                </Pressable>
                {isOpen ? (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
                    {categoryServices.map((service: ServiceRecord) => (
                      <View
                        key={service.id}
                        style={{
                          borderWidth: 1,
                          borderColor: styles.tokens.borderLight,
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                          <Text style={[styles.textPrimary, { flex: 1, fontWeight: '600' }]}>{service.name}</Text>
                          <Text style={[styles.textGold, { fontWeight: '600' }]}>${service.price?.toFixed(0)}</Text>
                        </View>
                        {service.description ? (
                          <Text style={[styles.textSecondary, { fontSize: 13, marginTop: 4 }]}>
                            {service.description}
                          </Text>
                        ) : null}
                        <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 6 }]}>
                          ~{service.duration_minutes} min
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </Animated.View>
      )}

      {CUSTOMER_ONLINE_BOOKING ? (
        <Text style={[styles.textSecondary, { textAlign: 'center', marginTop: 20 }]}>
          Ready to book? Open the Book tab to schedule your visit.
        </Text>
      ) : null}
    </CustomerScreenLayout>
  );
}
