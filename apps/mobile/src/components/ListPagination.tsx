import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon } from './icons/Icon';
import { ScrollSelect } from './forms/ScrollSelect';
import { useThemeStyles } from '../theme/useThemeStyles';

type PaginationState = {
  currentPage: number;
  totalPages: number;
};

type ListPaginationProps = {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  style?: object;
};

export function ListPagination({ pagination, onPageChange, style }: ListPaginationProps) {
  const styles = useThemeStyles();
  const pageOptions = useMemo(
    () => [...Array(pagination.totalPages)].map((_, index) => ({
      value: String(index + 1),
      label: String(index + 1),
    })),
    [pagination.totalPages],
  );

  if (pagination.totalPages <= 1) return null;

  const goToPreviousPage = () => {
    if (pagination.currentPage > 1) onPageChange(pagination.currentPage - 1);
  };

  const goToNextPage = () => {
    if (pagination.currentPage < pagination.totalPages) onPageChange(pagination.currentPage + 1);
  };

  return (
    <View
      style={[
        styles.card,
        {
          marginTop: 16,
          paddingHorizontal: 12,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        <Pressable
          onPress={goToPreviousPage}
          disabled={pagination.currentPage === 1}
          style={{ opacity: pagination.currentPage === 1 ? 0.2 : 1, padding: 8 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="chevronLeft" size={16} color={styles.tokens.textPrimary} />
            <Text style={styles.textPrimary}>Previous</Text>
          </View>
        </Pressable>
        <Text style={[styles.textSecondary, { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }]}>
          Page {pagination.currentPage} of {pagination.totalPages}
        </Text>
        <Pressable
          onPress={goToNextPage}
          disabled={pagination.currentPage === pagination.totalPages}
          style={{ opacity: pagination.currentPage === pagination.totalPages ? 0.2 : 1, padding: 8 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.textPrimary}>Next</Text>
            <Icon name="chevronRight" size={16} color={styles.tokens.textPrimary} />
          </View>
        </Pressable>
      </View>
      <View style={{ width: 80, flexShrink: 0 }}>
        <ScrollSelect
          value={String(pagination.currentPage)}
          onChange={(value) => onPageChange(parseInt(value, 10))}
          options={pageOptions}
          placeholder="Page"
        />
      </View>
    </View>
  );
}
