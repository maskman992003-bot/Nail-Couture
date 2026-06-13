import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FitnessAssessmentContent } from '../../components/fitness/FitnessAssessmentContent';
import { PublicScreenLayout } from '../../components/public/PublicScreenLayout';
import { useThemeStyles } from '../../theme/useThemeStyles';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import type { PublicTabParamList } from '../../navigation/publicTypes';
import type { RootStackParamList } from '../../navigation/publicTypes';

type FitnessAssessmentScreenProps = {
  navigation: BottomTabNavigationProp<PublicTabParamList, 'FitnessAssessment'>;
};

export function FitnessAssessmentScreen({ navigation }: FitnessAssessmentScreenProps) {
  const styles = useThemeStyles();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <PublicScreenLayout onNavigateTab={(tab) => navigation.navigate(tab)}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 16 }}>
        <View>
          <Text style={[styles.textGold, { fontSize: 14, letterSpacing: 2, fontWeight: '600' }]}>
            WELLNESS TOOLS
          </Text>
          <Text style={[styles.textPrimary, { fontSize: 32, fontWeight: '600', marginTop: 8 }]}>
            Fitness Assessment
          </Text>
          <Text style={[styles.textSecondary, { marginTop: 8, lineHeight: 22 }]}>
            Enter your measurements to instantly calculate BMI, BMR, TDEE, and body fat percentage.
          </Text>
        </View>
        <FitnessAssessmentContent onLoginPress={() => rootNav.navigate('Login')} />
      </View>
    </PublicScreenLayout>
  );
}
