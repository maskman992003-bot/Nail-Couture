import { Pressable, Text, View } from 'react-native';
import { useThemeStyles } from '../../theme/useThemeStyles';
import { ScrollSelect } from './ScrollSelect';

type RefreshmentItem = { item_name: string };

type RefreshmentSelectProps = {
  value: string;
  onChange: (value: string) => void;
  refreshments?: RefreshmentItem[];
  loading?: boolean;
  label?: string;
  emptyLabel?: string;
  hideWhenEmpty?: boolean;
  showUnavailableNote?: boolean;
  required?: boolean;
};

export function RefreshmentSelect({
  value = '',
  onChange,
  refreshments = [],
  loading = false,
  label,
  emptyLabel = 'None / No Preference',
  hideWhenEmpty = false,
  showUnavailableNote = false,
}: RefreshmentSelectProps) {
  const styles = useThemeStyles();

  if (hideWhenEmpty && !loading && refreshments.length === 0) {
    return null;
  }

  const availableNames = refreshments.map((item) => item.item_name);
  const valueUnavailable = Boolean(value && !availableNames.includes(value));
  const selectValue = valueUnavailable ? '' : value;

  const options = [
    { value: '', label: loading ? 'Loading refreshments...' : emptyLabel },
    ...refreshments.map((item) => ({ value: item.item_name, label: item.item_name })),
  ];

  return (
    <View>
      {label ? (
        <Text style={[styles.textSecondary, { fontSize: 12, letterSpacing: 1, marginBottom: 8 }]}>
          {label.toUpperCase()}
        </Text>
      ) : null}
      {loading ? (
        <Pressable style={[styles.input, { opacity: 0.6 }]}>
          <Text style={styles.textSecondary}>Loading refreshments...</Text>
        </Pressable>
      ) : (
        <ScrollSelect value={selectValue} onChange={onChange} options={options} placeholder={emptyLabel} />
      )}
      {valueUnavailable && showUnavailableNote ? (
        <Text style={{ color: '#fbbf24', fontSize: 12, marginTop: 6 }}>
          Your previous choice ({value}) is currently unavailable. Please select another option.
        </Text>
      ) : null}
      {!loading && refreshments.length === 0 ? (
        <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 6 }]}>
          No refreshments are available right now.
        </Text>
      ) : null}
    </View>
  );
}
