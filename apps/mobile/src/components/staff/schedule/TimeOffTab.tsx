import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { getInitials, sortTimeOffRequests } from '@nail-couture/shared/utils/scheduleUtils.js';
import { useThemeStyles } from '../../../theme/useThemeStyles';

export type TimeOffRequest = {
  id: string;
  staff_id: string;
  staff_name?: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status: string;
  reviewed_at?: string;
  review_note?: string;
};

type RequestForm = {
  startDate: string;
  endDate: string;
  reason: string;
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15', border: 'rgba(234, 179, 8, 0.2)' },
    approved: { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.2)' },
    rejected: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.2)' },
  };
  const style = colors[status] || colors.pending;

  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        backgroundColor: style.bg,
        borderColor: style.border,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '500', color: style.text, textTransform: 'capitalize' }}>
        {status}
      </Text>
    </View>
  );
}

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  if (startDate === endDate) return start;
  const end = new Date(`${endDate}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${start} – ${end}`;
}

type EmployeeTimeOffTabProps = {
  requests: TimeOffRequest[];
  showRequestForm: boolean;
  onToggleForm: () => void;
  requestForm: RequestForm;
  onFormChange: (form: RequestForm) => void;
  onSubmit: () => void;
  submitting: boolean;
  formError: string;
  formSuccess: string;
};

function EmployeeTimeOffTab({
  requests,
  showRequestForm,
  onToggleForm,
  requestForm,
  onFormChange,
  onSubmit,
  submitting,
  formError,
  formSuccess,
}: EmployeeTimeOffTabProps) {
  const styles = useThemeStyles();
  const sorted = sortTimeOffRequests(requests);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text style={[styles.textSecondary, { flex: 1 }]}>Submit requests for manager approval</Text>
        <Pressable
          onPress={onToggleForm}
          style={[styles.buttonPrimary, { paddingHorizontal: 16, borderRadius: 12 }]}
        >
          <Text style={[styles.buttonPrimaryText, { fontSize: 12, letterSpacing: 0 }]}>
            {showRequestForm ? 'Cancel' : 'Request Time Off'}
          </Text>
        </Pressable>
      </View>

      {formSuccess ? <Text style={{ color: '#4ade80', fontSize: 14 }}>{formSuccess}</Text> : null}

      {showRequestForm ? (
        <View style={[styles.card, { padding: 16, gap: 12 }]}>
          <View>
            <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 6 }]}>
              START DATE (YYYY-MM-DD)
            </Text>
            <TextInput
              value={requestForm.startDate}
              onChangeText={(startDate) => onFormChange({ ...requestForm, startDate })}
              placeholder="2026-06-01"
              placeholderTextColor={styles.tokens.textMuted}
              style={styles.input}
            />
          </View>
          <View>
            <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 6 }]}>
              END DATE (YYYY-MM-DD)
            </Text>
            <TextInput
              value={requestForm.endDate}
              onChangeText={(endDate) => onFormChange({ ...requestForm, endDate })}
              placeholder="2026-06-03"
              placeholderTextColor={styles.tokens.textMuted}
              style={styles.input}
            />
          </View>
          <View>
            <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 6 }]}>
              REASON (OPTIONAL)
            </Text>
            <TextInput
              value={requestForm.reason}
              onChangeText={(reason) => onFormChange({ ...requestForm, reason })}
              placeholder="Vacation, appointment, personal day..."
              placeholderTextColor={styles.tokens.textMuted}
              multiline
              numberOfLines={3}
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
            />
          </View>
          {formError ? <Text style={{ color: '#f87171', fontSize: 14 }}>{formError}</Text> : null}
          <Pressable
            onPress={onSubmit}
            disabled={submitting}
            style={[styles.buttonPrimary, { opacity: submitting ? 0.5 : 1 }]}
          >
            <Text style={[styles.buttonPrimaryText, { fontSize: 12, letterSpacing: 0 }]}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {sorted.length === 0 ? (
        <View style={[styles.card, { padding: 32, alignItems: 'center' }]}>
          <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600', marginBottom: 8 }]}>
            No Requests Yet
          </Text>
          <Text style={styles.textSecondary}>You have not submitted any time-off requests.</Text>
        </View>
      ) : (
        sorted.map((request) => (
          <View
            key={request.id}
            style={[
              styles.card,
              {
                padding: 16,
                borderColor: request.status === 'pending' ? `${styles.tokens.goldStrong}44` : styles.tokens.cardBorder,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.textPrimary, { fontWeight: '500' }]}>
                  {formatDateRange(request.start_date, request.end_date)}
                </Text>
                {request.reason ? (
                  <Text style={[styles.textSecondary, { marginTop: 4 }]}>{request.reason}</Text>
                ) : null}
                {request.reviewed_at ? (
                  <Text style={[styles.textSecondary, { fontSize: 10, marginTop: 8, opacity: 0.6 }]}>
                    Reviewed{' '}
                    {new Date(request.reviewed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                ) : null}
                {request.status === 'rejected' && request.review_note ? (
                  <Text style={{ color: '#fca5a5', fontSize: 14, marginTop: 8 }}>
                    Note from manager: {request.review_note}
                  </Text>
                ) : null}
              </View>
              <StatusBadge status={request.status} />
            </View>
          </View>
        ))
      )}
    </View>
  );
}

type ManagerTimeOffTabProps = {
  requests: TimeOffRequest[];
  onReview: (requestId: string, status: 'approved' | 'rejected', reviewNote?: string | null) => void;
  onViewSchedule?: (staffId: string, startDate: string) => void;
};

function ManagerTimeOffTab({ requests, onReview, onViewSchedule }: ManagerTimeOffTabProps) {
  const styles = useThemeStyles();
  const sorted = sortTimeOffRequests(requests);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const startReject = (requestId: string) => {
    setRejectingId(requestId);
    setRejectNote('');
  };

  const cancelReject = () => {
    setRejectingId(null);
    setRejectNote('');
  };

  const confirmReject = (requestId: string) => {
    onReview(requestId, 'rejected', rejectNote.trim() || null);
    cancelReject();
  };

  return (
    <View style={{ gap: 12 }}>
      {sorted.length === 0 ? (
        <View style={[styles.card, { padding: 32, alignItems: 'center' }]}>
          <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600', marginBottom: 8 }]}>
            No Time-Off Requests
          </Text>
          <Text style={styles.textSecondary}>All caught up.</Text>
        </View>
      ) : (
        sorted.map((request) => (
          <View
            key={request.id}
            style={[
              styles.card,
              {
                padding: 16,
                borderColor: request.status === 'pending' ? `${styles.tokens.goldStrong}44` : styles.tokens.cardBorder,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: `${styles.tokens.goldStrong}22`,
                  borderWidth: 1,
                  borderColor: `${styles.tokens.goldStrong}33`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={[styles.textGold, { fontSize: 11, fontWeight: '600' }]}>
                  {getInitials(request.staff_name)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.textPrimary, { fontWeight: '500' }]}>{request.staff_name}</Text>
                <Text style={[styles.textSecondary, { fontSize: 12 }]}>
                  {formatDateRange(request.start_date, request.end_date)}
                </Text>
                {request.reason ? (
                  <Text style={[styles.textSecondary, { marginTop: 4 }]}>{request.reason}</Text>
                ) : null}
                {request.status === 'rejected' && request.review_note ? (
                  <Text style={{ color: '#fca5a5', fontSize: 14, marginTop: 4 }}>Note: {request.review_note}</Text>
                ) : null}
                <View style={{ marginTop: 8, gap: 8 }}>
                  <StatusBadge status={request.status} />
                  {onViewSchedule ? (
                    <Pressable onPress={() => onViewSchedule(request.staff_id, request.start_date)}>
                      <Text style={[styles.textGold, { fontSize: 12 }]}>View schedule →</Text>
                    </Pressable>
                  ) : null}
                  {request.status === 'pending' && rejectingId !== request.id ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() => onReview(request.id, 'approved')}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 12,
                          borderWidth: 1,
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          borderColor: 'rgba(34, 197, 94, 0.2)',
                        }}
                      >
                        <Text style={{ color: '#4ade80', fontSize: 14 }}>Approve</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => startReject(request.id)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 12,
                          borderWidth: 1,
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          borderColor: 'rgba(239, 68, 68, 0.2)',
                        }}
                      >
                        <Text style={{ color: '#f87171', fontSize: 14 }}>Reject</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
            {request.status === 'pending' && rejectingId === request.id ? (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: styles.tokens.cardBorder, gap: 12 }}>
                <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1 }]}>
                  REJECTION NOTE (OPTIONAL)
                </Text>
                <TextInput
                  value={rejectNote}
                  onChangeText={setRejectNote}
                  placeholder="e.g. Short-staffed that week..."
                  placeholderTextColor={styles.tokens.textMuted}
                  multiline
                  numberOfLines={3}
                  style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => confirmReject(request.id)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      borderColor: 'rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <Text style={{ color: '#f87171', fontSize: 14 }}>Confirm reject</Text>
                  </Pressable>
                  <Pressable
                    onPress={cancelReject}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: styles.tokens.cardBorder,
                    }}
                  >
                    <Text style={styles.textSecondary}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

type TimeOffTabProps =
  | ({ variant?: 'employee' } & EmployeeTimeOffTabProps)
  | ({ variant: 'manager' } & ManagerTimeOffTabProps);

export function TimeOffTab(props: TimeOffTabProps) {
  if (props.variant === 'manager') {
    return (
      <ManagerTimeOffTab
        requests={props.requests}
        onReview={props.onReview}
        onViewSchedule={props.onViewSchedule}
      />
    );
  }
  return <EmployeeTimeOffTab {...props} />;
}

export type { RequestForm };
