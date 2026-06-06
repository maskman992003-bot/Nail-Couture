import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { PublicScreenLayout } from '../../components/public/PublicScreenLayout';
import { LookbookGallery } from '../../components/public/LookbookGallery';
import type { PublicTabParamList } from '../../navigation/publicTypes';

type LookbookScreenProps = {
  navigation: BottomTabNavigationProp<PublicTabParamList, 'Lookbook'>;
};

export function LookbookScreen({ navigation }: LookbookScreenProps) {
  return (
    <PublicScreenLayout onNavigateTab={(tab) => navigation.navigate(tab)}>
      <LookbookGallery onContactPress={() => navigation.navigate('About')} />
    </PublicScreenLayout>
  );
}
