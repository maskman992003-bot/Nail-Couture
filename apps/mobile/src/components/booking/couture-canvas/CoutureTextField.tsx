import { TextInput, View, type TextInputProps } from 'react-native';
import { COUTURE_COLORS } from './constants';

type CoutureTextFieldProps = TextInputProps & {
  label?: string;
  highlighted?: boolean;
};

export function CoutureTextField({ highlighted, style, ...props }: CoutureTextFieldProps) {
  return (
    <View>
      <TextInput
        placeholderTextColor={COUTURE_COLORS.textMuted}
        style={[
          {
            fontSize: 15,
            color: '#F9F9F9',
            paddingVertical: 12,
            borderBottomWidth: highlighted ? 0 : 1,
            borderBottomColor: COUTURE_COLORS.glassBorder,
            borderWidth: highlighted ? 1 : 0,
            borderColor: highlighted ? `${COUTURE_COLORS.gold}66` : 'transparent',
            borderRadius: highlighted ? 12 : 0,
            paddingHorizontal: highlighted ? 12 : 4,
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
}
