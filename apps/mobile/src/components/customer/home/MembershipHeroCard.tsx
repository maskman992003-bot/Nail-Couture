import { Image, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getTierInfo } from '@nail-couture/shared/utils/loyaltyTier.js';
import { getProfileInitials } from '@nail-couture/shared/utils/avatarUpload.js';
import { getMembershipCardImage } from '@nail-couture/shared/constants/membershipCardImages.js';
import { FOUNDING_SEAL_PALETTES } from '@nail-couture/shared/constants/membershipCardThemes.js';
import { FoundingWaxSeal } from './membership-card/FoundingWaxSeal';
import type { AppScreenName } from '../../../navigation/screenRegistry';

type ProfileLike = {
  full_name?: string;
  avatar_url?: string;
  loyalty_tier?: string;
  calendar_spend_ytd?: number;
  founding_spot?: number | null;
  founding_type?: string | null;
  loyalty_points?: number;
};

type MembershipHeroCardProps = {
  profile: ProfileLike;
  onPress?: () => void;
};

const CARD_SOURCES: Record<string, ReturnType<typeof require>> = {
  'pearl-member.png': require('../../../../assets/membership/pearl-member.png'),
};

const AVATAR_SIZE = 132;
const CARD_HEIGHT = 116;
const CARD_BORDER_RADIUS = 16;

export function MembershipHeroCard({ profile, onPress }: MembershipHeroCardProps) {
  const navigation = useNavigation<NativeStackNavigationProp<Record<AppScreenName, undefined>>>();
  const tier = getTierInfo(profile);
  const isFounding = Boolean(profile?.founding_spot);
  const foundingYear = new Date().getFullYear();
  const cardImage = getMembershipCardImage(tier.id);
  const sealKey = profile?.founding_type === 'vanguard' || profile?.founding_type === 'legacy'
    ? profile.founding_type
    : 'default';
  const sealPalette = FOUNDING_SEAL_PALETTES[sealKey];
  const source = CARD_SOURCES[cardImage.mobile];
  const displayName = profile?.full_name?.trim() || 'Member';

  const content = (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
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

      <View
        style={{
          flex: 1,
          minWidth: 0,
          height: CARD_HEIGHT,
          borderRadius: CARD_BORDER_RADIUS,
          borderWidth: 1,
          borderColor: '#C5A05933',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Image
          source={source}
          accessibilityLabel={cardImage.alt}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />

        {isFounding ? (
          <>
            <View style={{ position: 'absolute', top: 6, right: 6 }}>
              <FoundingWaxSeal palette={sealPalette} size={32} />
            </View>
            <View
              style={{
                position: 'absolute',
                bottom: 6,
                alignSelf: 'center',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.82)',
                borderWidth: 1,
                borderColor: 'rgba(183,110,121,0.45)',
              }}
            >
              <Text
                style={{
                  color: '#8B5E4A',
                  fontSize: 7,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  fontWeight: '600',
                }}
              >
                Founding Member • Est. {foundingYear}
              </Text>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}
