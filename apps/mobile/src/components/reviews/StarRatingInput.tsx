import { Pressable, Text, View } from 'react-native';

type StarRatingInputProps = {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  disabled?: boolean;
};

export function StarRatingInput({ value, onChange, max = 5, disabled = false }: StarRatingInputProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1;
        const active = value >= starValue;
        return (
          <Pressable
            key={starValue}
            disabled={disabled}
            onPress={() => onChange(starValue)}
            accessibilityRole="button"
            accessibilityLabel={`${starValue} stars`}
            style={{ padding: 4, opacity: disabled ? 0.5 : 1 }}
          >
            <Text style={{ fontSize: 28, color: active ? '#C5A059' : 'rgba(197,160,89,0.25)' }}>
              {active ? '★' : '☆'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
