import { Pressable, Text, View } from 'react-native';
import { getTierInfo } from '@nail-couture/shared/utils/loyaltyTier.js';
import { getProfileInitials } from '@nail-couture/shared/utils/avatarUpload.js';
import { TIER_COLORS } from '../../constants/customerConstants';
import { useThemeStyles } from '../../theme/useThemeStyles';

type ProfileLike = {
  full_name?: string;
  loyalty_points?: number;
  referral_code?: string;
  avatar_url?: string;
};

type MembershipCardProps = {
  profile: ProfileLike;
  onPress?: () => void;
  onCopyReferral?: () => void;
  copiedCode?: boolean;
  showReferral?: boolean;
};

export function MembershipCard({
  profile,
  onPress,
  onCopyReferral,
  copiedCode = false,
  showReferral = true,
}: MembershipCardProps) {
  const styles = useThemeStyles();
  const tier = getTierInfo(profile.loyalty_points || 0);
  const tierColor = TIER_COLORS[tier.name] || styles.tokens.goldStrong;

  const content = (
    <View
      style={[
        styles.card,
        {
          padding: 24,
          alignItems: 'center',
          borderColor: `${styles.tokens.goldStrong}66`,
          backgroundColor: `${styles.tokens.goldStrong}14`,
        },
      ]}
    >
      <Text style={styles.sectionLabel}>MEMBERSHIP CARD</Text>

      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: `${styles.tokens.goldStrong}33`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Text style={[styles.statValueLg, { fontSize: 22 }]}>
          {getProfileInitials(profile.full_name)}
        </Text>
      </View>

      <Text style={{ color: tierColor, fontSize: 24, fontWeight: '600', fontFamily: styles.fonts.heading }}>
        {tier.name} Member
      </Text>
      <Text style={[styles.statValueLg, { fontSize: 44, marginVertical: 8 }]}>
        {profile.loyalty_points || 0}
      </Text>
      <Text style={styles.textSecondary}>points</Text>

      {tier.nextTier ? (
        <View style={{ width: '100%', maxWidth: 280, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={[styles.textSecondary, { fontSize: 11 }]}>Next: {tier.nextTier}</Text>
            <Text style={[styles.textSecondary, { fontSize: 11 }]}>
              {profile.loyalty_points || 0} / {tier.nextThreshold}
            </Text>
          </View>
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: `${styles.tokens.textPrimary}14`,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${Math.min(100, tier.progress)}%`,
                backgroundColor: styles.tokens.goldStrong,
              }}
            />
          </View>
        </View>
      ) : null}

      <Text style={[styles.textSecondary, { marginTop: 12, textAlign: 'center' }]}>{tier.benefit}</Text>

      {showReferral && profile.referral_code ? (
        <View
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: `${styles.tokens.goldStrong}26`,
            width: '100%',
            alignItems: 'center',
          }}
        >
          <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 2, marginBottom: 8 }]}>
            YOUR REFERRAL CODE
          </Text>
          <Text style={[styles.statValue, { fontSize: 18, letterSpacing: 3, marginBottom: 10 }]}>
            {profile.referral_code}
          </Text>
          {onCopyReferral ? (
            <Pressable
              onPress={(event) => {
                event.stopPropagation?.();
                onCopyReferral();
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: `${styles.tokens.goldStrong}4D`,
                backgroundColor: `${styles.tokens.goldStrong}26`,
              }}
            >
              <Text style={styles.textGold}>{copiedCode ? 'Copied' : 'Copy Code'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}
