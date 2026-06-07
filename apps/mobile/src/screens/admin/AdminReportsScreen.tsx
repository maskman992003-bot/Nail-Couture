import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { analyzeCustomRange, analyzePeriod } from '@nail-couture/shared/utils/reportsAnalytics.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { SimpleBarChart } from '../../components/admin/SimpleBarChart';
import { useThemeStyles } from '../../theme/useThemeStyles';

type PeriodMetrics = {
  new: number;
  regular: number;
  total: number;
  revenue: number;
  serviceCounts: Record<string, number>;
  avgServiceTime: number;
  cancelled: number;
  paymentCount: number;
  label?: string;
};

const EMPTY_METRICS: PeriodMetrics = {
  new: 0,
  regular: 0,
  total: 0,
  revenue: 0,
  serviceCounts: {},
  avgServiceTime: 0,
  cancelled: 0,
  paymentCount: 0,
};

export function AdminReportsScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const isCashierView = user?.role === 'cashier';
  const preferPayments = isCashierView;

  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [loading, setLoading] = useState(true);
  const [periodData, setPeriodData] = useState({
    lastWeek: EMPTY_METRICS,
    thisWeek: EMPTY_METRICS,
    lastMonth: EMPTY_METRICS,
    thisMonth: EMPTY_METRICS,
  });
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [customData, setCustomData] = useState<PeriodMetrics>(EMPTY_METRICS);
  const [exporting, setExporting] = useState(false);

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    const [lastWeek, thisWeek, lastMonth, thisMonth] = await Promise.all([
      analyzePeriod('lastWeek', { preferPayments }),
      analyzePeriod('thisWeek', { preferPayments }),
      analyzePeriod('lastMonth', { preferPayments }),
      analyzePeriod('thisMonth', { preferPayments }),
    ]);
    setPeriodData({
      lastWeek: lastWeek as PeriodMetrics,
      thisWeek: thisWeek as PeriodMetrics,
      lastMonth: lastMonth as PeriodMetrics,
      thisMonth: thisMonth as PeriodMetrics,
    });
    setLoading(false);
  }, [preferPayments]);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  const currentMetrics = activeTab === 'weekly'
    ? periodData.thisWeek
    : activeTab === 'monthly'
      ? periodData.thisMonth
      : customData;

  const comparisonMetrics = activeTab === 'weekly'
    ? periodData.lastWeek
    : periodData.lastMonth;

  const applyCustomRange = async () => {
    if (!customFrom || !customTo) return;
    setLoading(true);
    const data = await analyzeCustomRange(customFrom, customTo, { preferPayments });
    setCustomData(data as PeriodMetrics);
    setLoading(false);
  };

  const exportSummary = async () => {
    setExporting(true);
    const lines = [
      'Period,New Guests,Regular Guests,Total Guests,Revenue,Avg Service Time,Cancellations',
      `${currentMetrics.label || activeTab},${currentMetrics.new},${currentMetrics.regular},${currentMetrics.total},${currentMetrics.revenue.toFixed(2)},${currentMetrics.avgServiceTime},${currentMetrics.cancelled}`,
    ];
    const serviceLines = Object.entries(currentMetrics.serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${name},${count}`);
    await Clipboard.setStringAsync([...lines, '', 'Service,Count', ...serviceLines].join('\n'));
    setExporting(false);
  };

  const topServices = Object.entries(currentMetrics.serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  const comparisonChart = [
    { label: 'Prev', value: comparisonMetrics.revenue },
    { label: 'Current', value: currentMetrics.revenue },
  ];

  const inputStyle = {
    backgroundColor: styles.tokens.inputBg,
    borderColor: styles.tokens.borderLight,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: styles.tokens.textPrimary,
    marginBottom: 8,
    flex: 1,
  };

  if (loading && activeTab !== 'custom') {
    return (
      <StaffScreenLayout>
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color={styles.tokens.goldStrong} />
        </View>
      </StaffScreenLayout>
    );
  }

  return (
    <StaffScreenLayout
      title={isCashierView ? 'Daily Reports' : 'Reports'}
      subtitle={currentMetrics.label || 'Analytics and insights'}
      headerRight={
        <Pressable
          onPress={exportSummary}
          disabled={exporting}
          style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: styles.tokens.borderLight }}
        >
          <Text style={styles.textGold}>{exporting ? '...' : 'Export'}</Text>
        </Pressable>
      }
    >
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {(['weekly', 'monthly', 'custom'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: activeTab === tab ? styles.tokens.goldStrong : styles.tokens.cardBg,
              borderWidth: 1,
              borderColor: styles.tokens.borderLight,
            }}
          >
            <Text style={{ color: activeTab === tab ? '#121212' : styles.tokens.textSecondary, fontWeight: '600', fontSize: 13 }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'custom' && (
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={customFrom} onChangeText={setCustomFrom} placeholder="From YYYY-MM-DD" placeholderTextColor={styles.tokens.textMuted} style={inputStyle} />
            <TextInput value={customTo} onChangeText={setCustomTo} placeholder="To YYYY-MM-DD" placeholderTextColor={styles.tokens.textMuted} style={inputStyle} />
          </View>
          <Pressable onPress={applyCustomRange} style={{ backgroundColor: styles.tokens.goldStrong, borderRadius: 10, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: '#121212', fontWeight: '600' }}>Apply Range</Text>
          </Pressable>
        </View>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'New Guests', value: currentMetrics.new },
          { label: 'Regular', value: currentMetrics.regular },
          { label: 'Revenue', value: `$${currentMetrics.revenue.toFixed(0)}` },
          { label: 'Avg Time', value: `${currentMetrics.avgServiceTime}m` },
          { label: 'Cancelled', value: currentMetrics.cancelled },
          { label: preferPayments ? 'Payments' : 'Completed', value: currentMetrics.paymentCount },
        ].map((m) => (
          <View key={m.label} style={[styles.card, { padding: 12, minWidth: 90, alignItems: 'center' }]}>
            <Text style={[styles.sectionTitle, { fontWeight: '600' }]}>{m.value}</Text>
            <Text style={[styles.textSecondary, { fontSize: 10 }]}>{m.label}</Text>
          </View>
        ))}
      </View>

      {activeTab !== 'custom' && (
        <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
          <Text style={[styles.cardTitle, { marginBottom: 12 }]}>Revenue Comparison</Text>
          <SimpleBarChart data={comparisonChart} />
        </View>
      )}

      {topServices.length > 0 && (
        <View style={[styles.card, { padding: 16 }]}>
          <Text style={[styles.cardTitle, { marginBottom: 12 }]}>Popular Services</Text>
          <SimpleBarChart data={topServices} color="#4ade80" />
        </View>
      )}
    </StaffScreenLayout>
  );
}
