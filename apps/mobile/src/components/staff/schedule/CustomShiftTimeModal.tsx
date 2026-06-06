import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { AppModal, ModalButton } from '../../AppModal';
import { useThemeStyles } from '../../../theme/useThemeStyles';

type CustomShiftTimeModalProps = {
  open: boolean;
  title?: string;
  startTime: string;
  endTime: string;
  onSave: (startTime: string, endTime: string) => void;
  onClose: () => void;
  saveLabel?: string;
};

export function CustomShiftTimeModal({
  open,
  title,
  startTime,
  endTime,
  onSave,
  onClose,
  saveLabel = 'Save',
}: CustomShiftTimeModalProps) {
  const styles = useThemeStyles();
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);

  useEffect(() => {
    if (open) {
      setStart(startTime);
      setEnd(endTime);
    }
  }, [open, startTime, endTime]);

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title || 'Custom shift times'}
      footer={
        <>
          <ModalButton label="Cancel" onPress={onClose} />
          <ModalButton label={saveLabel} variant="primary" onPress={() => onSave(start, end)} />
        </>
      }
    >
      <View style={{ gap: 16 }}>
        <View>
          <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 6 }]}>
            FROM (HH:MM)
          </Text>
          <TextInput
            value={start}
            onChangeText={setStart}
            placeholder="09:00"
            placeholderTextColor={styles.tokens.textMuted}
            style={styles.input}
          />
        </View>
        <View>
          <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 6 }]}>
            TO (HH:MM)
          </Text>
          <TextInput
            value={end}
            onChangeText={setEnd}
            placeholder="17:00"
            placeholderTextColor={styles.tokens.textMuted}
            style={styles.input}
          />
        </View>
      </View>
    </AppModal>
  );
}
