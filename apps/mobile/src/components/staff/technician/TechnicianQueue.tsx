import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  parseProfilePreferences,
  labelForOption,
  NAIL_SHAPES,
  NAIL_LENGTHS,
  NAIL_FINISHES,
} from '@nail-couture/shared/utils/profilePreferences.js';
import { ScrollSelect } from '../../forms/ScrollSelect';
import type { SelectOption } from '../../../constants/birthdayOptions';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import type { TechnicianAppointment } from './types';

const DECLINE_REASONS: SelectOption[] = [
  { value: '', label: 'Reason (optional)' },
  { value: 'Not my specialty', label: 'Not my specialty' },
  { value: 'Schedule conflict', label: 'Schedule conflict' },
  { value: 'Need a break first', label: 'Need a break first' },
  { value: 'Other', label: 'Other' },
];

function AssignmentBrief({ appt }: { appt: TechnicianAppointment }) {
  const styles = useThemeStyles();
  const customer = appt.customer || {};
  const prefs = parseProfilePreferences(customer.preferences);
  const prefItems = [
    prefs.nail_shape && labelForOption(NAIL_SHAPES, prefs.nail_shape),
    prefs.nail_length && labelForOption(NAIL_LENGTHS, prefs.nail_length),
    prefs.nail_finish && labelForOption(NAIL_FINISHES, prefs.nail_finish),
  ].filter(Boolean) as string[];

  return (
    <View
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: styles.tokens.borderLight,
        gap: 6,
      }}
    >
      {customer.refreshment_pref ? (
        <Text style={styles.textSecondary}>
          Refreshment:{' '}
          <Text style={styles.textGold}>{customer.refreshment_pref}</Text>
        </Text>
      ) : null}
      {prefItems.length > 0 ? (
        <Text style={styles.textSecondary}>Prefs: {prefItems.join(' · ')}</Text>
      ) : null}
      {prefs.allergies ? (
        <Text style={{ color: '#f87171', fontWeight: '600' }}>Allergies: {prefs.allergies}</Text>
      ) : null}
      {customer.nail_goal ? (
        <Text style={[styles.textGold, { opacity: 0.85 }]}>Goal: {customer.nail_goal}</Text>
      ) : null}
    </View>
  );
}

type TechnicianQueueProps = {
  pendingAssignments: TechnicianAppointment[];
  actionId: string | null;
  onAccept: (appt: TechnicianAppointment) => void;
  onDecline?: (appt: TechnicianAppointment, reason?: string) => void;
  onDismissNew?: (id: string) => void;
  newAssignmentIds?: string[];
};

export function TechnicianQueue({
  pendingAssignments,
  actionId,
  onAccept,
  onDecline,
  onDismissNew,
  newAssignmentIds = [],
}: TechnicianQueueProps) {
  const styles = useThemeStyles();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  if (pendingAssignments.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    if (onDismissNew && newAssignmentIds.includes(id)) {
      onDismissNew(id);
    }
  };

  const handleDecline = (appt: TechnicianAppointment) => {
    if (!onDecline) return;
    onDecline(appt, declineReason);
    setDeclineId(null);
    setDeclineReason('');
  };

  return (
    <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600' }]}>My Assignments</Text>
        {newAssignmentIds.length > 0 ? (
          <Pressable
            onPress={() => newAssignmentIds.forEach((id) => onDismissNew?.(id))}
            style={{
              backgroundColor: styles.tokens.goldStrong,
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: '#121212', fontSize: 11, fontWeight: '700' }}>
              {newAssignmentIds.length} new
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: 12 }}>
        {pendingAssignments.map((appt, index) => {
          const isNew = newAssignmentIds.includes(appt.id);
          const isExpanded = expandedId === appt.id;
          const isStarting = actionId === appt.id;

          return (
            <View
              key={appt.id}
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: isNew ? `${styles.tokens.goldStrong}18` : styles.tokens.inputBg,
                borderWidth: isNew ? 1 : 0,
                borderColor: `${styles.tokens.goldStrong}44`,
              }}
            >
              <Pressable onPress={() => toggleExpand(appt.id)} style={{ padding: 16, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: `${styles.tokens.goldStrong}33`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={styles.textGold}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[styles.textPrimary, { fontWeight: '600', fontSize: 16 }]} numberOfLines={1}>
                        {appt.customer?.full_name || 'Guest'}
                      </Text>
                      {isNew ? (
                        <View
                          style={{
                            backgroundColor: styles.tokens.goldStrong,
                            borderRadius: 4,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ color: '#121212', fontSize: 9, fontWeight: '700' }}>NEW</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.textSecondary, { fontSize: 13, marginTop: 2 }]} numberOfLines={1}>
                      {appt.add_ons || appt.services?.name || 'Service'}
                    </Text>
                    {!isExpanded && appt.customer?.nail_goal ? (
                      <Text style={[styles.textGold, { fontSize: 12, marginTop: 2, opacity: 0.8 }]} numberOfLines={1}>
                        Goal: {appt.customer.nail_goal}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.textSecondary}>{isExpanded ? '▲' : '▼'}</Text>
                </View>

                {appt.checked_in_at ? (
                  <Text style={[styles.textSecondary, { fontSize: 11 }]}>
                    Checked in{' '}
                    {new Date(appt.checked_in_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {onDecline && declineId !== appt.id ? (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setDeclineId(appt.id);
                        setDeclineReason('');
                      }}
                      disabled={isStarting}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: styles.tokens.borderLight,
                        alignItems: 'center',
                        opacity: isStarting ? 0.5 : 1,
                      }}
                    >
                      <Text style={styles.textSecondary}>Decline</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.();
                      onAccept(appt);
                    }}
                    disabled={isStarting}
                    style={{
                      flex: onDecline && declineId !== appt.id ? 2 : 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: isStarting ? `${styles.tokens.goldStrong}88` : styles.tokens.goldStrong,
                      alignItems: 'center',
                      opacity: isStarting ? 0.7 : 1,
                    }}
                  >
                    <Text style={{ color: '#121212', fontWeight: '600' }}>
                      {isStarting ? 'Starting…' : 'Accept & Start'}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>

              {declineId === appt.id ? (
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingBottom: 16,
                    borderTopWidth: 1,
                    borderTopColor: styles.tokens.borderLight,
                    gap: 8,
                  }}
                >
                  <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 8 }]}>
                    Return this client to the waiting queue?
                  </Text>
                  <ScrollSelect
                    value={declineReason}
                    onChange={setDeclineReason}
                    options={DECLINE_REASONS}
                    placeholder="Reason (optional)"
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => setDeclineId(null)}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: styles.tokens.borderLight,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={styles.textSecondary}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDecline(appt)}
                      disabled={isStarting}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: '#ef444422',
                        borderWidth: 1,
                        borderColor: '#ef444444',
                        alignItems: 'center',
                        opacity: isStarting ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ color: '#f87171', fontWeight: '600' }}>
                        {isStarting ? 'Returning…' : 'Return to waiting'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {isExpanded ? (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  <AssignmentBrief appt={appt} />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
