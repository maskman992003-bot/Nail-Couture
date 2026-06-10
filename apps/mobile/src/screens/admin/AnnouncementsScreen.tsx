import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAnnouncements } from '@nail-couture/shared/hooks/useAnnouncements.js';
import {
  formatAnnouncementSendSuccess,
  formatRecipientPreview,
  formatStaffRoleLabel,
  formatStaffTargetingSummary,
  isAnnouncementStaffCandidate,
  resolveAnnouncementEstimate,
} from '@nail-couture/shared/utils/announcements.js';
import {
  formatAttachmentSize,
  getAnnouncementDocumentLabel,
  isAnnouncementImageMime,
  MAX_ANNOUNCEMENT_ATTACHMENTS,
  serializeAnnouncementAttachments,
} from '@nail-couture/shared/utils/announcementAttachments.js';
import { featureFlags } from '@nail-couture/shared/constants/featureFlags.js';
import { useAuth } from '../../contexts/AuthContext';
import { AnnouncementAttachmentsList } from '../../components/AnnouncementAttachmentsList';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { useThemeStyles } from '../../theme/useThemeStyles';
import {
  canAddMoreAttachments,
  pickAnnouncementDocument,
  pickAnnouncementPhotoFromLibrary,
  takeAnnouncementPhoto,
  uploadPickedAnnouncementAsset,
  type AnnouncementAttachment,
} from '../../utils/announcementAttachmentUpload';

const AUDIENCE_OPTIONS = [
  { id: 'customers', label: 'Customers' },
  { id: 'staff', label: 'Staff' },
  { id: 'both', label: 'Both' },
] as const;

const STAFF_MODE_OPTIONS = [
  { id: 'all', label: 'All staff' },
  { id: 'exclude', label: 'Exclude specific' },
  { id: 'only', label: 'Only selected' },
] as const;

type Audience = typeof AUDIENCE_OPTIONS[number]['id'];
type StaffMode = typeof STAFF_MODE_OPTIONS[number]['id'];

const MANAGEMENT_ROLES = new Set(['super_admin', 'owner', 'partner']);

function audienceLabel(audience: string) {
  if (audience === 'customers') return 'Customers';
  if (audience === 'staff') return 'Staff';
  return 'Customers & staff';
}

export function AnnouncementsScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('customers');
  const [staffTargetMode, setStaffTargetMode] = useState<StaffMode>('all');
  const [staffProfileIds, setStaffProfileIds] = useState<string[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const [attachments, setAttachments] = useState<AnnouncementAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const enabledForRole = Boolean(
    user?.phone
    && MANAGEMENT_ROLES.has(user.role ?? '')
    && (user.role === 'super_admin' || featureFlags.staff.announcements),
  );

  const {
    enabled,
    staffCandidates,
    staffLoading,
    estimate,
    estimateLoading,
    estimateRecipients,
    announcements,
    loadMore,
    hasMore,
    isLoadingHistory,
    isSending,
    isDelivering,
    sendAnnouncement,
    error,
    setError,
  } = useAnnouncements(user?.phone, user?.role);

  const showStaffTargeting = audience === 'staff' || audience === 'both';

  const targetableStaff = useMemo(
    () => staffCandidates.filter(isAnnouncementStaffCandidate),
    [staffCandidates],
  );

  const filteredStaff = useMemo(() => {
    const term = staffSearch.trim().toLowerCase();
    if (!term) return targetableStaff;
    return targetableStaff.filter((member) => {
      const name = (member.full_name || '').toLowerCase();
      const role = (member.role || '').toLowerCase();
      return name.includes(term) || role.includes(term);
    });
  }, [targetableStaff, staffSearch]);

  useEffect(() => {
    if (!enabled) return;
    const ids = showStaffTargeting && staffTargetMode !== 'all' ? staffProfileIds : [];
    estimateRecipients(audience, staffTargetMode, ids);
  }, [enabled, audience, staffTargetMode, staffProfileIds, showStaffTargeting, estimateRecipients]);

  const displayEstimate = useMemo(() => resolveAnnouncementEstimate(
    audience,
    estimate,
    showStaffTargeting ? staffTargetMode : 'all',
    targetableStaff.length,
  ), [audience, estimate, showStaffTargeting, staffTargetMode, targetableStaff.length]);

  const staffValidationError = showStaffTargeting && staffTargetMode === 'only' && staffProfileIds.length === 0
    ? 'Select at least one staff member.'
    : '';

  const recipientValidationError = estimateLoading
    ? ''
    : audience === 'staff' && displayEstimate.staffCount === 0
      ? 'No staff recipients match the selected targeting.'
      : displayEstimate.total === 0
        ? 'No recipients match this announcement.'
        : '';

  const canSend = Boolean(
    title.trim()
    && (body.trim() || attachments.length > 0)
    && !staffValidationError
    && !recipientValidationError
    && !isSending
    && !isDelivering
    && !isUploadingAttachment,
  );

  const addAttachment = async (
    picker: () => Promise<{ uri: string; fileName: string; mimeType: string; size?: number } | null>,
  ) => {
    if (!user?.id || !canAddMoreAttachments(attachments.length)) {
      setError(`You can attach up to ${MAX_ANNOUNCEMENT_ATTACHMENTS} files.`);
      return;
    }
    setIsUploadingAttachment(true);
    setError('');
    try {
      const asset = await picker();
      if (!asset) return;
      const uploaded = await uploadPickedAnnouncementAsset(user.id, asset);
      setAttachments((prev) => [...prev, uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload attachment.');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const removeAttachment = (url: string) => {
    setAttachments((prev) => prev.filter((item) => item.url !== url));
  };

  const handleStaffToggle = (memberId: string) => {
    setStaffProfileIds((prev) => (
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    ));
  };

  const handleStaffModeChange = (mode: StaffMode) => {
    setStaffTargetMode(mode);
    setStaffProfileIds([]);
    setStaffSearch('');
  };

  const handleSend = async () => {
    if (!canSend) return;
    setError('');
    setSendSuccess('');
    try {
      const result = await sendAnnouncement({
        title: title.trim(),
        body: body.trim(),
        audience,
        staffTargetMode: showStaffTargeting ? staffTargetMode : 'all',
        staffProfileIds: (showStaffTargeting && staffTargetMode !== 'all' ? staffProfileIds : []) as string[],
        attachments: serializeAnnouncementAttachments(attachments),
      });
      if (!result?.id) {
        throw new Error('Announcement was not created. Check that database migrations are up to date.');
      }
      setTitle('');
      setBody('');
      setAttachments([]);
      setAudience('customers');
      setStaffTargetMode('all');
      setStaffProfileIds([]);
      setShowConfirm(false);
      setSendSuccess(formatAnnouncementSendSuccess(result));
    } catch (err) {
      setShowConfirm(false);
      setError(err instanceof Error ? err.message : 'Failed to send announcement.');
    }
  };

  const chipStyle = (active: boolean) => ({
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: active ? styles.tokens.goldStrong : styles.card.borderColor,
    backgroundColor: active ? `${styles.tokens.goldStrong}22` : styles.card.backgroundColor,
  });

  if (!enabledForRole) {
    return (
      <StaffScreenLayout title="Announcements">
        <Text style={styles.textSecondary}>This feature is not available for your role.</Text>
      </StaffScreenLayout>
    );
  }

  return (
    <StaffScreenLayout
      title="Announcements"
      subtitle="Send promotions and salon updates"
    >
      {error ? (
        <View style={[styles.card, { borderColor: '#7f1d1d', marginBottom: 12 }]}>
          <Text style={{ color: '#fca5a5' }}>{error}</Text>
        </View>
      ) : null}
      <View style={[styles.card, { marginBottom: 16, padding: 16 }]}>
        <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600', marginBottom: 12 }]}>Compose</Text>

        <Text style={[styles.textSecondary, { marginBottom: 4 }]}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          placeholder="Summer Special — 20% Off"
          placeholderTextColor={styles.textSecondary.color}
          style={[styles.input, { marginBottom: 12 }]}
        />

        <Text style={[styles.textSecondary, { marginBottom: 4 }]}>Message</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          maxLength={500}
          multiline
          numberOfLines={4}
          placeholder="Share your promotion or salon update..."
          placeholderTextColor={styles.textSecondary.color}
          style={[styles.input, { minHeight: 100, textAlignVertical: 'top', marginBottom: 4 }]}
        />
        <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 12 }]}>{body.length}/500</Text>

        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={styles.textSecondary}>Attachments</Text>
            <Text style={[styles.textSecondary, { fontSize: 12 }]}>
              {attachments.length}/{MAX_ANNOUNCEMENT_ATTACHMENTS}
            </Text>
          </View>
          <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 8 }]}>
            Take a photo, pick from library, or attach a TXT/PDF file.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <Pressable
              onPress={() => addAttachment(takeAnnouncementPhoto)}
              disabled={!canAddMoreAttachments(attachments.length) || isUploadingAttachment}
              style={[chipStyle(false), (!canAddMoreAttachments(attachments.length) || isUploadingAttachment) && { opacity: 0.5 }]}
            >
              <Text style={styles.textPrimary}>Camera</Text>
            </Pressable>
            <Pressable
              onPress={() => addAttachment(pickAnnouncementPhotoFromLibrary)}
              disabled={!canAddMoreAttachments(attachments.length) || isUploadingAttachment}
              style={[chipStyle(false), (!canAddMoreAttachments(attachments.length) || isUploadingAttachment) && { opacity: 0.5 }]}
            >
              <Text style={styles.textPrimary}>Photos</Text>
            </Pressable>
            <Pressable
              onPress={() => addAttachment(pickAnnouncementDocument)}
              disabled={!canAddMoreAttachments(attachments.length) || isUploadingAttachment}
              style={[chipStyle(false), (!canAddMoreAttachments(attachments.length) || isUploadingAttachment) && { opacity: 0.5 }]}
            >
              <Text style={styles.textPrimary}>File</Text>
            </Pressable>
          </View>
          {isUploadingAttachment ? (
            <ActivityIndicator color={styles.textGold.color} style={{ marginBottom: 8 }} />
          ) : null}
          {attachments.map((attachment) => (
            <View
              key={attachment.url}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: styles.card.borderColor,
              }}
            >
              {isAnnouncementImageMime(attachment.mime_type) ? (
                <Image
                  source={{ uri: attachment.url }}
                  style={{ width: 44, height: 44, borderRadius: 8 }}
                />
              ) : (
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={[styles.textSecondary, { fontSize: 11, fontWeight: '600' }]}>
                    {getAnnouncementDocumentLabel(attachment.mime_type)}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.textPrimary} numberOfLines={1}>{attachment.file_name}</Text>
                <Text style={[styles.textSecondary, { fontSize: 11 }]}>
                  {formatAttachmentSize(attachment.size_bytes)}
                </Text>
              </View>
              <Pressable onPress={() => removeAttachment(attachment.url)}>
                <Text style={{ color: '#fca5a5', fontSize: 12 }}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <Text style={[styles.textSecondary, { marginBottom: 8 }]}>Audience</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {AUDIENCE_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => setAudience(option.id)}
              style={chipStyle(audience === option.id)}
            >
              <Text style={audience === option.id ? styles.textGold : styles.textPrimary}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {showStaffTargeting ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.textSecondary, { marginBottom: 8 }]}>Staff targeting</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {STAFF_MODE_OPTIONS.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => handleStaffModeChange(option.id)}
                  style={chipStyle(staffTargetMode === option.id)}
                >
                  <Text style={staffTargetMode === option.id ? styles.textGold : styles.textPrimary}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {staffTargetMode !== 'all' ? (
              <>
                <TextInput
                  value={staffSearch}
                  onChangeText={setStaffSearch}
                  placeholder="Search staff..."
                  placeholderTextColor={styles.textSecondary.color}
                  style={[styles.input, { marginBottom: 8 }]}
                />
                {staffLoading ? (
                  <ActivityIndicator color={styles.textGold.color} />
                ) : (
                  <View style={{ maxHeight: 180 }}>
                    {filteredStaff.map((member) => {
                      const checked = staffProfileIds.includes(member.id);
                      const rowChecked = staffTargetMode === 'exclude' ? !checked : checked;
                      return (
                        <Pressable
                          key={member.id}
                          onPress={() => handleStaffToggle(member.id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 8,
                            borderBottomWidth: 1,
                            borderBottomColor: styles.card.borderColor,
                          }}
                        >
                          <Text style={{ width: 24 }}>{rowChecked ? '☑' : '☐'}</Text>
                          <Text style={[styles.textPrimary, { flex: 1 }]}>
                            {member.full_name || 'Unnamed'}
                          </Text>
                          <Text style={styles.textSecondary}>{formatStaffRoleLabel(member.role)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {staffValidationError ? (
                  <Text style={{ color: '#fca5a5', marginTop: 8 }}>{staffValidationError}</Text>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        <Text style={[styles.textSecondary, { marginBottom: recipientValidationError ? 6 : 12 }]}>
          {estimateLoading
            ? 'Calculating recipients...'
            : `Will reach ${formatRecipientPreview(audience, displayEstimate)}`}
        </Text>
        {recipientValidationError ? (
          <Text style={{ color: '#fca5a5', marginBottom: 12 }}>{recipientValidationError}</Text>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={() => setShowConfirm(true)}
            disabled={!canSend}
            style={[styles.buttonPrimary, !canSend && { opacity: 0.5 }]}
          >
            <Text style={styles.buttonPrimaryText}>
              {isSending || isDelivering ? 'Sending...' : 'Send announcement'}
            </Text>
          </Pressable>
          {sendSuccess ? (
            <Text style={{ color: '#86efac', fontSize: 13, flexShrink: 1 }}>{sendSuccess}</Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.card, { padding: 16 }]}>
        <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600', marginBottom: 12 }]}>
          Past announcements
        </Text>
        {isLoadingHistory && announcements.length === 0 ? (
          <ActivityIndicator color={styles.textGold.color} />
        ) : announcements.length === 0 ? (
          <Text style={styles.textSecondary}>No announcements sent yet.</Text>
        ) : (
          announcements.map((row) => (
            <View
              key={String(row.id)}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: styles.card.borderColor,
              }}
            >
              <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{String(row.title)}</Text>
              <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
                {new Date(String(row.created_at)).toLocaleString()}
                {' · '}
                {String(row.created_by_name)}
                {' · '}
                {audienceLabel(String(row.audience))}
                {(row.audience === 'staff' || row.audience === 'both') && (
                  <> · {formatStaffTargetingSummary(String(row.staff_target_mode), Number(row.staff_profile_count))}</>
                )}
              </Text>
              {row.body ? (
                <Text style={[styles.textPrimary, { marginTop: 6 }]}>{String(row.body)}</Text>
              ) : null}
              {Array.isArray(row.attachments) && row.attachments.length > 0 ? (
                <AnnouncementAttachmentsList
                  attachments={row.attachments as AnnouncementAttachment[]}
                  compact
                />
              ) : null}
              <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
                {String(row.recipient_count)} recipients · {String(row.status)}
              </Text>
            </View>
          ))
        )}
        {hasMore ? (
          <Pressable onPress={loadMore} disabled={isLoadingHistory} style={{ marginTop: 12 }}>
            <Text style={styles.textGold}>{isLoadingHistory ? 'Loading...' : 'Load more'}</Text>
          </Pressable>
        ) : null}
      </View>

      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={[styles.card, { margin: 0, padding: 16 }]}>
            <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600', marginBottom: 8 }]}>
              Send announcement?
            </Text>
            <Text style={[styles.textSecondary, { marginBottom: 16 }]}>
              Send to {formatRecipientPreview(audience, displayEstimate)}? This cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Pressable onPress={() => setShowConfirm(false)} disabled={isSending}>
                <Text style={styles.textSecondary}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSend} disabled={isSending} style={styles.buttonPrimary}>
                <Text style={styles.buttonPrimaryText}>
                  {isSending ? 'Sending...' : 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </StaffScreenLayout>
  );
}
