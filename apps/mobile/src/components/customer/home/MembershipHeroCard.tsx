import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getTierInfo } from '@nail-couture/shared/utils/loyaltyTier.js';
import { getProfileInitials } from '@nail-couture/shared/utils/avatarUpload.js';
import { getMembershipCardImage } from '@nail-couture/shared/constants/membershipCardImages.js';
import { getMembershipCardMemberId } from '@nail-couture/shared/constants/membershipCardLayout.js';
import { FOUNDING_SEAL_PALETTES } from '@nail-couture/shared/constants/membershipCardThemes.js';
import { MembershipCard } from './membership-card/MembershipCard';
import type { AppScreenName } from '../../../navigation/screenRegistry';

export type ProfileLike = {
  id?: string;
  full_name?: string;
  avatar_url?: string;
  loyalty_tier?: string;
  rolling_spend_12m?: number;
  calendar_spend_ytd?: number;
  founding_spot?: number | null;
  founding_type?: string | null;
  loyalty_points?: number;
};

type ProfileMembershipCardProps = {
  profile: ProfileLike;
  onPress?: () => void;
  fillSlot?: boolean;
};

const CARD_SOURCES: Record<string, ReturnType<typeof require>> = {
  'pearl.png': require('../../../../assets/membership/pearl.png'),
  'atelier.png': require('../../../../assets/membership/atelier.png'),
  'diamond.png': require('../../../../assets/membership/diamond.png'),
};

const AVATAR_SIZE = 132;

function ProfileAvatar({ profile }: { profile: ProfileLike }) {
  const navigation = useNavigation<NativeStackNavigationProp<Record<AppScreenName, undefined>>>();
  const displayName = profile?.full_name?.trim() || 'Member';

  return (
    <View style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, flexShrink: 0 }}>
      <Pressable
        onPress={() => navigation.navigate('Profile')}
        accessibilityLabel="Profile"
        style={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: AVATAR_SIZE / 2,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: '#C5A05955',
        }}
      >
        {profile?.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(197,160,89,0.2)',
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: '700', color: '#C5A059' }}>
              {getProfileInitials(displayName)}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

export function ProfileMembershipCard({ profile, onPress, fillSlot = false }: ProfileMembershipCardProps) {
  const tier = getTierInfo(profile);
  if (tier.id === 'regular_customer') {
    return null;
  }

  const isFounding = Boolean(profile?.founding_spot);
  const foundingYear = new Date().getFullYear();
  const cardImage = getMembershipCardImage(tier.id);
  const sealKey = profile?.founding_type === 'vanguard' || profile?.founding_type === 'legacy'
    ? profile.founding_type
    : 'default';
  const sealPalette = FOUNDING_SEAL_PALETTES[sealKey];
  const source = CARD_SOURCES[cardImage.mobile];
  const displayName = profile?.full_name?.trim() || 'Member';

  const card = (
    <MembershipCard
      name={displayName}
      id={getMembershipCardMemberId(profile)}
      tier={tier.name}
      tierId={tier.id}
      backgroundImage={source}
      fillSlot={fillSlot}
      isFounding={isFounding}
      foundingYear={foundingYear}
      sealPalette={sealPalette}
    />
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={fillSlot ? StyleSheet.absoluteFill : undefined}
      >
        {card}
      </Pressable>
    );
  }

  return card;
}

type MembershipHeroCardProps = {
  profile: ProfileLike;
};

export function MembershipHeroCard({ profile }: MembershipHeroCardProps) {
  return (
    <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <ProfileAvatar profile={profile} />
    </View>
  );
}
