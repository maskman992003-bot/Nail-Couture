import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  buildCategoryTabs,
  fetchServiceCategories,
  getDisplayCategories,
} from '@nail-couture/shared/utils/serviceCategories.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { PublicScreenLayout } from '../../components/public/PublicScreenLayout';
import { ServiceCategoryBar } from '../../components/public/ServiceCategoryBar';
import { useThemeStyles } from '../../theme/useThemeStyles';
import type { PublicTabParamList } from '../../navigation/publicTypes';

type ServiceRecord = {
  id: string;
  name: string;
  price?: number;
  description?: string;
  duration_minutes?: number;
  category?: string;
  is_addon?: boolean;
};

type ServicesScreenProps = {
  navigation: BottomTabNavigationProp<PublicTabParamList, 'Services'>;
};

export function ServicesScreen({ navigation }: ServicesScreenProps) {
  const styles = useThemeStyles();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [dbCategories, setDbCategories] = useState<Array<{ name?: string } | string>>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const supabase = getSupabase();
      const [{ data: serviceData }, categoryData] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .order('category', { ascending: true })
          .order('price', { ascending: true }),
        fetchServiceCategories(supabase),
      ]);

      if (!mounted) return;
      setServices((serviceData as ServiceRecord[]) || []);
      setDbCategories(categoryData);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const { grouped, sortedCategories, categoryTabs } = useMemo(
    () => buildCategoryTabs(services, dbCategories),
    [services, dbCategories],
  );

  useEffect(() => {
    if (activeCategory === 'All') return;
    if (!sortedCategories.includes(activeCategory)) {
      setActiveCategory('All');
      setExpandedCategory(null);
    }
  }, [services, dbCategories, activeCategory, sortedCategories]);

  const displayCategories = getDisplayCategories(activeCategory, sortedCategories);

  return (
    <PublicScreenLayout onNavigateTab={(tab) => navigation.navigate(tab)}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 16 }}>
        <View>
          <Text style={[styles.textGold, { fontSize: 14, letterSpacing: 2, fontWeight: '600' }]}>
            SERVICES & PRICING
          </Text>
          <Text style={[styles.textPrimary, { fontSize: 32, fontWeight: '600', marginTop: 8 }]}>
            Our Services
          </Text>
          <Text style={[styles.textSecondary, { marginTop: 8, lineHeight: 22 }]}>
            Expert craftsmanship in nail couture. Each service is performed with precision,
            medical-grade sterilization, and premium non-toxic products.
          </Text>
        </View>

        <ServiceCategoryBar
          tabs={categoryTabs}
          activeCategory={activeCategory}
          onSelect={(category) => {
            setActiveCategory(category);
            setExpandedCategory(null);
          }}
        />

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <ActivityIndicator color={styles.tokens.goldStrong} size="large" />
            <Text style={[styles.textGold, { marginTop: 12 }]}>Loading services...</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {displayCategories.map((category: string) => {
              const isOpen = displayCategories.length === 1 || expandedCategory === category;
              const categoryServices = grouped[category] || [];

              return (
                <View key={category} style={[styles.card, { overflow: 'hidden' }]}>
                  <Pressable
                    onPress={() => setExpandedCategory(isOpen ? null : category)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600' }]}>
                        {category}
                      </Text>
                      <Text style={styles.textSecondary}>({categoryServices.length})</Text>
                    </View>
                    <Text style={styles.textGold}>{isOpen ? '−' : '+'}</Text>
                  </Pressable>

                  {isOpen ? (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
                      {categoryServices.map((service: ServiceRecord) => (
                        <View
                          key={service.id}
                          style={{
                            borderWidth: 1,
                            borderColor: styles.tokens.borderLight,
                            borderRadius: 12,
                            padding: 14,
                            backgroundColor: `${styles.tokens.textPrimary}05`,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                            <Text style={[styles.textPrimary, { fontSize: 16, fontWeight: '600', flex: 1 }]}>
                              {service.name}
                            </Text>
                            <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600' }]}>
                              ${service.price?.toFixed(0)}
                            </Text>
                          </View>
                          {service.description ? (
                            <Text style={[styles.textSecondary, { marginTop: 6, fontSize: 13 }]}>
                              {service.description}
                            </Text>
                          ) : null}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginTop: 12,
                            }}
                          >
                            <Text style={styles.textSecondary}>~{service.duration_minutes} min</Text>
                            <Pressable
                              onPress={() => navigation.navigate('About')}
                              style={{
                                backgroundColor: styles.tokens.goldStrong,
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                              }}
                            >
                              <Text style={{ color: '#121212', fontSize: 12, fontWeight: '600' }}>
                                Contact Us
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        <View
          style={[
            styles.card,
            {
              padding: 20,
              backgroundColor: `${styles.tokens.goldStrong}14`,
              borderColor: styles.tokens.borderColor,
              marginTop: 8,
            },
          ]}
        >
          <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600', textAlign: 'center' }]}>
            Need Help Scheduling?
          </Text>
          <Text style={[styles.textSecondary, { textAlign: 'center', marginTop: 8, marginBottom: 16 }]}>
            Please contact us so we can schedule your visit.
          </Text>
          <Pressable
            onPress={() => navigation.navigate('About')}
            style={[styles.buttonPrimary, { alignSelf: 'center', paddingHorizontal: 24 }]}
          >
            <Text style={styles.buttonPrimaryText}>Contact Us</Text>
          </Pressable>
        </View>
      </View>
    </PublicScreenLayout>
  );
}
