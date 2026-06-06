import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { SelectOption } from '../../constants/birthdayOptions';
import { useThemeStyles } from '../../theme/useThemeStyles';

type ScrollSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
};

export function ScrollSelect({ value, onChange, options, placeholder = 'Select' }: ScrollSelectProps) {
  const styles = useThemeStyles();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const display = selected?.label || placeholder;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.input,
          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        ]}
      >
        <Text style={{ color: value ? styles.tokens.textPrimary : styles.tokens.textMuted }}>{display}</Text>
        <Text style={styles.textGold}>▼</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: styles.tokens.cardBg,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '50%',
              paddingBottom: 24,
            }}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: styles.tokens.borderLight }}>
              <Text style={[styles.textGold, { fontSize: 16, fontWeight: '600' }]}>{placeholder}</Text>
            </View>
            <ScrollView>
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value || 'empty'}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      backgroundColor: active ? `${styles.tokens.goldStrong}22` : 'transparent',
                    }}
                  >
                    <Text style={active ? styles.textGold : styles.textPrimary}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
