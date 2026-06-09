import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { useNotificationPreferences } from '@nail-couture/shared/hooks/useNotificationPreferences.js';
import { useThemeStyles } from '../theme/useThemeStyles';

type NotificationPreferencesSectionProps = {
  userPhone?: string | null;
  role?: string | null;
};

export function NotificationPreferencesSection({ userPhone, role }: NotificationPreferencesSectionProps) {
  const styles = useThemeStyles();
  const { enabled, available, loading, saving, error, groups, toggleType, toggleGroup } =
    useNotificationPreferences(userPhone, role);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  if (!enabled) return null;

  const toggleExpanded = (groupId: string) => {
    setExpandedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  };

  return (
    <View style={[styles.card, { padding: 16, marginBottom: 12 }]}>
      <Text style={[styles.textPrimary, { fontWeight: '600', marginBottom: 4 }]}>
        Notification Preferences
      </Text>
      <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 12 }]}>
        Tap a category to expand it and choose which alerts you receive.
      </Text>

      {!available ? (
        <Text style={[styles.textSecondary, { fontSize: 11 }]}>
          Run sql/040_notification_preferences.sql in Supabase to enable this section.
        </Text>
      ) : loading ? (
        <Text style={styles.textGold}>Loading preferences...</Text>
      ) : (
        groups.map((group) => {
          const isExpanded = Boolean(expandedGroups[group.id]);
          const summaryLabel =
            group.enabledCount === group.totalCount
              ? 'All active'
              : group.enabledCount === 0
                ? 'All muted'
                : `${group.enabledCount} of ${group.totalCount} active`;

          return (
            <View
              key={group.id}
              style={{
                borderTopWidth: 1,
                borderTopColor: styles.tokens.borderLight,
                paddingTop: 12,
                marginTop: 4,
              }}
            >
              <Pressable
                onPress={() => toggleExpanded(group.id)}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}
              >
                <Text style={[styles.textSecondary, { fontSize: 10, marginTop: 3 }]}>
                  {isExpanded ? '▼' : '▶'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.textPrimary, { fontWeight: '600', fontSize: 14 }]}>
                    {group.label}
                  </Text>
                  <Text style={[styles.textSecondary, { fontSize: 11, marginTop: 2 }]}>
                    {group.description}
                  </Text>
                  <Text style={[styles.textSecondary, { fontSize: 10, marginTop: 4, opacity: 0.7 }]}>
                    {summaryLabel}
                  </Text>
                </View>
              </Pressable>

              {isExpanded ? (
                <View style={{ marginTop: 10, marginLeft: 18, gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginBottom: 4 }}>
                    <Pressable
                      disabled={saving || group.allEnabled}
                      onPress={() => toggleGroup(group.id, true)}
                    >
                      <Text
                        style={[
                          styles.textGold,
                          { fontSize: 11, opacity: saving || group.allEnabled ? 0.4 : 1 },
                        ]}
                      >
                        Enable all
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={saving || group.noneEnabled}
                      onPress={() => toggleGroup(group.id, false)}
                    >
                      <Text
                        style={[
                          styles.textSecondary,
                          { fontSize: 11, opacity: saving || group.noneEnabled ? 0.4 : 1 },
                        ]}
                      >
                        Mute all
                      </Text>
                    </Pressable>
                  </View>

                  {group.types.map((typeItem) => (
                    <View
                      key={typeItem.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: styles.tokens.borderLight,
                        backgroundColor: styles.tokens.cardBg,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.textPrimary, { fontWeight: '600', fontSize: 13 }]}>
                          {typeItem.label}
                        </Text>
                        {typeItem.description ? (
                          <Text style={[styles.textSecondary, { fontSize: 10, marginTop: 2 }]}>
                            {typeItem.description}
                          </Text>
                        ) : null}
                      </View>
                      <Switch
                        value={typeItem.enabled}
                        disabled={saving}
                        onValueChange={(value) => toggleType(typeItem.id, value)}
                        trackColor={{ true: styles.tokens.goldStrong }}
                      />
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })
      )}

      {error ? (
        <Text style={{ color: '#f87171', fontSize: 11, marginTop: 8 }}>{error}</Text>
      ) : null}
    </View>
  );
}
