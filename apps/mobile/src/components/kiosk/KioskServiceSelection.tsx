import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { getServices } from '@nail-couture/shared/services/services.js';
import { getAvailableRefreshments } from '@nail-couture/shared/services/inventoryService.js';
import {
  buildCategoryTabs,
  fetchServiceCategories,
  getDisplayCategories,
} from '@nail-couture/shared/utils/serviceCategories.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { ServiceCategoryBar } from '../public/ServiceCategoryBar';
import { RefreshmentSelect } from '../forms/RefreshmentSelect';
import { Icon } from '../icons/Icon';
import { useThemeStyles } from '../../theme/useThemeStyles';

export type ServiceRecord = {
  id: string;
  name: string;
  price?: number;
  duration_minutes?: number;
  category?: string;
  is_addon?: boolean;
};

export type ServiceSelectionPayload = {
  services: ServiceRecord[];
  addOns: ServiceRecord[];
  refreshmentPref: string;
};

type KioskServiceSelectionProps = {
  onSelect: (payload: ServiceSelectionPayload) => void;
  onBack: () => void;
  initialServices?: ServiceRecord[];
  initialAddOnIds?: string[];
};

export function KioskServiceSelection({
  onSelect,
  onBack,
  initialServices = [],
  initialAddOnIds = [],
}: KioskServiceSelectionProps) {
  const styles = useThemeStyles();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshmentList, setRefreshmentList] = useState<{ item_name: string }[]>([]);
  const [refreshmentsLoading, setRefreshmentsLoading] = useState(true);
  const [refreshmentPref, setRefreshmentPref] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<ServiceRecord[]>(initialServices);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(initialAddOnIds);
  const [dbCategories, setDbCategories] = useState<Array<{ name?: string } | string>>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getServices(),
      getAvailableRefreshments(),
      fetchServiceCategories(getSupabase()),
    ])
      .then(([serviceData, refreshments, categories]) => {
        if (!mounted) return;
        setServices(serviceData as ServiceRecord[]);
        setRefreshmentList(refreshments);
        setDbCategories(categories);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
        setRefreshmentsLoading(false);
      });
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
  const addOns = services.filter((service) => service.is_addon);
  const selectedAddOnDetails = addOns.filter((addOn) => selectedAddOns.includes(addOn.id));
  const totalPrice =
    selectedServices.reduce((sum, service) => sum + (service.price || 0), 0) +
    selectedAddOnDetails.reduce((sum, addOn) => sum + (addOn.price || 0), 0);

  const toggleService = (service: ServiceRecord) => {
    setSelectedServices((prev) =>
      prev.some((item) => item.id === service.id)
        ? prev.filter((item) => item.id !== service.id)
        : [...prev, service],
    );
  };

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  if (loading) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={styles.tokens.goldStrong} size="large" />
        <Text style={[styles.textGold, { marginTop: 12 }]}>Loading services...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center', padding: 20 }]}>
        <Text style={{ color: '#f87171' }}>{error}</Text>
        <Pressable onPress={onBack} style={{ marginTop: 16 }}>
          <Text style={styles.textGold}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
        <Pressable onPress={onBack} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="chevronLeft" size={18} color={styles.tokens.goldStrong} />
            <Text style={styles.textGold}>Back</Text>
          </View>
        </Pressable>
        <Text style={[styles.textGold, { fontSize: 28, fontWeight: '600' }]}>Select Your Services</Text>
        <Text style={styles.textSecondary}>Choose one or more treatments</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <ServiceCategoryBar
          tabs={categoryTabs}
          activeCategory={activeCategory}
          onSelect={(category) => {
            setActiveCategory(category);
            setExpandedCategory(null);
          }}
        />

        <View style={{ marginTop: 16, gap: 12 }}>
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
                    alignItems: 'center',
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Text style={[styles.textGold, { fontSize: 16, fontWeight: '600' }]}>{category}</Text>
                    <Text style={styles.textSecondary}>({categoryServices.length})</Text>
                  </View>
                  <Text style={styles.textGold}>{isOpen ? '−' : '+'}</Text>
                </Pressable>
                {isOpen ? (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
                    {categoryServices.map((service: ServiceRecord) => {
                      const selected = selectedServices.some((item) => item.id === service.id);
                      return (
                        <Pressable
                          key={service.id}
                          onPress={() => toggleService(service)}
                          style={{
                            borderWidth: selected ? 2 : 1,
                            borderColor: selected ? styles.tokens.goldStrong : styles.tokens.borderLight,
                            borderRadius: 12,
                            padding: 14,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              borderWidth: 1,
                              borderColor: styles.tokens.goldStrong,
                              backgroundColor: selected ? styles.tokens.goldStrong : 'transparent',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {selected ? <Icon name="check" size={12} color="#121212" strokeWidth={3} /> : null}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{service.name}</Text>
                            <Text style={styles.textSecondary}>{service.duration_minutes} min</Text>
                          </View>
                          <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600' }]}>
                            ${service.price}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {selectedServices.length > 0 ? (
          <View style={[styles.card, { padding: 16, marginTop: 16, gap: 12 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.textPrimary, { fontWeight: '600' }]}>
                  {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
                </Text>
                <Text style={styles.textSecondary}>
                  {selectedServices.map((service) => service.name).join(', ')}
                </Text>
              </View>
              <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600' }]}>
                ${totalPrice.toFixed(2)}
              </Text>
            </View>

            {addOns.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={[styles.textSecondary, { fontSize: 11, letterSpacing: 1 }]}>
                  ADD-ONS (OPTIONAL)
                </Text>
                {addOns.map((addOn) => {
                  const selected = selectedAddOns.includes(addOn.id);
                  return (
                    <Pressable
                      key={addOn.id}
                      onPress={() => toggleAddOn(addOn.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        borderWidth: 1,
                        borderColor: selected ? styles.tokens.goldStrong : styles.tokens.borderLight,
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          borderWidth: 1,
                          borderColor: styles.tokens.goldStrong,
                          backgroundColor: selected ? styles.tokens.goldStrong : 'transparent',
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.textPrimary}>{addOn.name}</Text>
                        <Text style={styles.textSecondary}>+{addOn.duration_minutes} min</Text>
                      </View>
                      <Text style={styles.textGold}>+${addOn.price}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <RefreshmentSelect
              label="Refreshment"
              value={refreshmentPref}
              onChange={setRefreshmentPref}
              refreshments={refreshmentList}
              loading={refreshmentsLoading}
              emptyLabel="No refreshment"
              hideWhenEmpty
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <Pressable
                onPress={onBack}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: styles.tokens.borderColor,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={styles.textSecondary}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  onSelect({
                    services: selectedServices,
                    addOns: selectedAddOnDetails,
                    refreshmentPref,
                  })
                }
                style={[styles.buttonPrimary, { flex: 1 }]}
              >
                <Text style={styles.buttonPrimaryText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <Text style={[styles.textSecondary, { textAlign: 'center', marginTop: 20, fontSize: 13 }]}>
          Times are approximate to ensure couture quality.
        </Text>
      </ScrollView>
    </View>
  );
}
