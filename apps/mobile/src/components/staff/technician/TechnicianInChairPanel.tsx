import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import {
  parseProfilePreferences,
  labelForOption,
  NAIL_SHAPES,
  NAIL_LENGTHS,
  NAIL_FINISHES,
} from '@nail-couture/shared/utils/profilePreferences.js';
import { formatElapsedMinutes } from '@nail-couture/shared/utils/technicianQueue.js';
import { fetchStaffNotes, addStaffNote } from '@nail-couture/shared/utils/staffCustomerNotes.js';
import { canUploadVisitPhotos } from '@nail-couture/shared/utils/staffCustomerAccess.js';
import { getAppointmentServiceLabels } from '@nail-couture/shared/utils/appointmentServices.js';
import { useAuth } from '../../../contexts/AuthContext';
import { WaiverModal } from '../../kiosk/WaiverModal';
import { ScrollSelect } from '../../forms/ScrollSelect';
import {
  pickVisitPhotoFromLibrary,
  takeVisitPhotoFromCamera,
  uploadVisitPhotoFromAsset,
} from '../../../utils/visitPhotoUpload';
import { Icon } from '../../icons/Icon';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import { TechnicianServiceEditor } from './TechnicianServiceEditor';
import { TechnicianServiceChecklist } from './TechnicianServiceChecklist';
import type { TechnicianAppointment, ServiceUpdatePayload } from './types';

type StaffNote = {
  id: string;
  note?: string;
};

type TechnicianInChairPanelProps = {
  appointment: TechnicianAppointment;
  actionId: string | null;
  onComplete: (appt: TechnicianAppointment) => void;
  onUpdateServices?: (
    appt: TechnicianAppointment,
    payload: ServiceUpdatePayload,
  ) => Promise<{ success?: boolean; error?: string }>;
  onToggleChecklistItem?: (
    appt: TechnicianAppointment,
    itemId: string,
    completed: boolean,
  ) => Promise<{ success?: boolean; error?: string }>;
};

export function TechnicianInChairPanel({
  appointment,
  actionId,
  onComplete,
  onUpdateServices,
  onToggleChecklistItem,
}: TechnicianInChairPanelProps) {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const [notes, setNotes] = useState<StaffNote[]>([]);
  const [notesAvailable, setNotesAvailable] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [waiverSigned, setWaiverSigned] = useState<boolean | null>(null);
  const [elapsed, setElapsed] = useState(formatElapsedMinutes(appointment.start_time));
  const [briefOpen, setBriefOpen] = useState(false);
  const [showWaiver, setShowWaiver] = useState(false);
  const [waiverSaving, setWaiverSaving] = useState(false);
  const [showServiceEditor, setShowServiceEditor] = useState(false);
  const [photoType, setPhotoType] = useState('after');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState('');

  const serviceLabels = getAppointmentServiceLabels(appointment);
  const isUpdating = actionId === appointment.id;
  const customer = appointment.customer || {};
  const prefs = parseProfilePreferences(customer.preferences);
  const duration = appointment.services?.duration_minutes;
  const elapsedMins = appointment.start_time
    ? (Date.now() - new Date(appointment.start_time).getTime()) / 60000
    : 0;
  const isOverdue = duration && elapsedMins > duration;

  useEffect(() => {
    if (!appointment.customer_id) return;
    fetchStaffNotes(appointment.customer_id, 3)
      .then(({ rows, available }) => {
        setNotes(rows);
        setNotesAvailable(available);
      })
      .catch(() => setNotesAvailable(false));

    getSupabase()
      .from('customer_waivers')
      .select('id')
      .eq('profile_id', appointment.customer_id)
      .limit(1)
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => setWaiverSigned(!!data))
      .catch(() => setWaiverSigned(null));
  }, [appointment.customer_id]);

  useEffect(() => {
    const tick = setInterval(() => {
      setElapsed(formatElapsedMinutes(appointment.start_time));
    }, 10000);
    return () => clearInterval(tick);
  }, [appointment.start_time]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !appointment.customer_id || !user) return;
    setNoteSaving(true);
    const result = await addStaffNote(appointment.customer_id, newNote, user, {
      appointmentId: appointment.id,
    });
    if (result.success && result.note) {
      setNotes((prev) => [result.note as StaffNote, ...prev].slice(0, 3));
      setNewNote('');
    }
    setNoteSaving(false);
  };

  const handleSaveWaiver = async (waiverData: { agreed_to_terms: boolean; signature_image: string }) => {
    if (!appointment.customer_id) return;
    setWaiverSaving(true);
    try {
      const { error } = await getSupabase()
        .from('customer_waivers')
        .insert([
          {
            profile_id: appointment.customer_id,
            customer_phone: customer.phone || null,
            customer_name: customer.full_name || 'Customer',
            agreed_to_terms: true,
            signature_image: waiverData.signature_image,
          },
        ]);
      if (error) throw error;
      setWaiverSigned(true);
      setShowWaiver(false);
    } catch {
      // waiver save failed silently
    } finally {
      setWaiverSaving(false);
    }
  };

  const handlePhotoUpload = async (source: 'library' | 'camera') => {
    if (!canUploadVisitPhotos(user?.role) || !appointment.customer_id) return;

    const picker = source === 'camera' ? takeVisitPhotoFromCamera : pickVisitPhotoFromLibrary;
    const picked = await picker();
    if (picked.canceled) return;

    setPhotoUploading(true);
    setPhotoMsg('');
    const result = await uploadVisitPhotoFromAsset(
      appointment.customer_id,
      appointment.id,
      picked.asset,
      photoType,
      user?.id,
    );
    setPhotoUploading(false);
    if (!result.success) {
      const message = result.error || 'Upload failed';
      setPhotoMsg(message);
      Alert.alert('Upload failed', message);
      return;
    }
    setPhotoMsg('Photo uploaded');
  };

  const prefItems = [
    prefs.nail_shape && labelForOption(NAIL_SHAPES, prefs.nail_shape),
    prefs.nail_length && labelForOption(NAIL_LENGTHS, prefs.nail_length),
    prefs.nail_finish && labelForOption(NAIL_FINISHES, prefs.nail_finish),
  ].filter(Boolean) as string[];

  const clientBrief = (
    <View style={{ gap: 8 }}>
      {customer.refreshment_pref ? (
        <Text style={styles.textSecondary}>
          Refreshment: <Text style={styles.textGold}>{customer.refreshment_pref}</Text>
        </Text>
      ) : null}
      {prefItems.length > 0 ? (
        <Text style={styles.textSecondary}>Prefs: {prefItems.join(' · ')}</Text>
      ) : null}
      {prefs.allergies ? (
        <Text style={{ color: '#f87171', fontWeight: '600' }}>Allergies: {prefs.allergies}</Text>
      ) : null}
      {waiverSigned !== null ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, color: waiverSigned ? '#4ade80' : '#fbbf24' }}>
            Waiver: {waiverSigned ? 'Signed' : 'Not on file'}
          </Text>
          {!waiverSigned ? (
            <Pressable
              onPress={() => setShowWaiver(true)}
              disabled={waiverSaving}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: '#fbbf2422',
                borderWidth: 1,
                borderColor: '#fbbf2444',
                opacity: waiverSaving ? 0.5 : 1,
              }}
            >
              <Text style={{ color: '#fbbf24', fontSize: 12 }}>Collect waiver</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={{ marginTop: 8 }}>
        <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 8 }]}>
          QUICK NOTES
        </Text>
        {notesAvailable && notes.length > 0 ? (
          <View style={{ gap: 6, marginBottom: 8 }}>
            {notes.map((n) => (
              <View
                key={n.id}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: styles.tokens.inputBg,
                }}
              >
                <Text style={[styles.textSecondary, { fontSize: 12 }]}>{n.note}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {notesAvailable ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={newNote}
              onChangeText={setNewNote}
              placeholder="Add a note…"
              placeholderTextColor={styles.tokens.textMuted}
              style={[styles.input, { flex: 1 }]}
              onSubmitEditing={handleAddNote}
            />
            <Pressable
              onPress={handleAddNote}
              disabled={noteSaving || !newNote.trim()}
              style={{
                paddingHorizontal: 16,
                justifyContent: 'center',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: styles.tokens.borderLight,
                opacity: noteSaving || !newNote.trim() ? 0.5 : 1,
              }}
            >
              <Text style={styles.textPrimary}>{noteSaving ? '…' : 'Add'}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {canUploadVisitPhotos(user?.role) ? (
        <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <View style={{ minWidth: 120, flex: 1 }}>
            <ScrollSelect
              value={photoType}
              onChange={setPhotoType}
              options={[
                { value: 'before', label: 'Before' },
                { value: 'after', label: 'After' },
              ]}
              placeholder="Photo type"
            />
          </View>
          <Pressable
            onPress={() => handlePhotoUpload('camera')}
            disabled={photoUploading}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: styles.tokens.borderLight,
              opacity: photoUploading ? 0.5 : 1,
            }}
          >
            <Text style={[styles.textPrimary, { fontSize: 12 }]}>
              {photoUploading ? 'Uploading…' : 'Camera'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handlePhotoUpload('library')}
            disabled={photoUploading}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: styles.tokens.borderLight,
              opacity: photoUploading ? 0.5 : 1,
            }}
          >
            <Text style={[styles.textPrimary, { fontSize: 12 }]}>
              {photoUploading ? 'Uploading…' : 'Photos'}
            </Text>
          </Pressable>
          {photoMsg ? (
            <Text
              style={{
                fontSize: 12,
                color: photoMsg.toLowerCase().includes('fail') ? '#f87171' : '#4ade80',
              }}
            >
              {photoMsg}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <View
      style={[
        styles.card,
        {
          padding: 16,
          marginBottom: 16,
          borderWidth: 2,
          borderColor: `${styles.tokens.goldStrong}66`,
        },
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Text style={[styles.textPrimary, { fontSize: 20, fontWeight: '600' }]}>In Chair</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {elapsed ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                borderWidth: 1,
                backgroundColor: isOverdue ? '#f8717122' : '#4ade8022',
                borderColor: isOverdue ? '#f8717144' : '#4ade8044',
              }}
            >
              <Text style={{ fontSize: 11, color: isOverdue ? '#f87171' : '#4ade80' }}>
                {elapsed}
                {duration ? ` / ${duration}m` : ''}
              </Text>
            </View>
          ) : null}
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: '#4ade8022',
              borderWidth: 1,
              borderColor: '#4ade8044',
            }}
          >
            <Text style={{ fontSize: 11, color: '#4ade80' }}>Serving</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.textPrimary, { fontSize: 24, fontWeight: '600' }]}>
        {customer.full_name || 'Customer'}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {serviceLabels.map((label: string) => (
          <View
            key={label}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: styles.tokens.inputBg,
              borderWidth: 1,
              borderColor: styles.tokens.borderLight,
            }}
          >
            <Text style={[styles.textPrimary, { fontSize: 12 }]}>{label}</Text>
          </View>
        ))}
        {duration ? (
          <Text style={[styles.textSecondary, { fontSize: 12, alignSelf: 'center' }]}>
            ~{duration} min
          </Text>
        ) : null}
      </View>

      {appointment.final_price != null ? (
        <Text style={[styles.textGold, { fontSize: 14, marginTop: 8 }]}>
          Est. ${Number(appointment.final_price).toFixed(2)}
        </Text>
      ) : null}

      {onUpdateServices ? (
        <Pressable
          onPress={() => setShowServiceEditor(true)}
          disabled={isUpdating}
          style={{
            alignSelf: 'flex-start',
            marginTop: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: `${styles.tokens.goldStrong}22`,
            borderWidth: 1,
            borderColor: `${styles.tokens.goldStrong}44`,
            opacity: isUpdating ? 0.5 : 1,
          }}
        >
          <Text style={styles.textGold}>Change services</Text>
        </Pressable>
      ) : null}

      {customer.nail_goal ? (
        <Text style={[styles.textGold, { fontSize: 14, marginTop: 8, opacity: 0.85 }]}>
          Goal: {customer.nail_goal}
        </Text>
      ) : null}

      {onToggleChecklistItem ? (
        <TechnicianServiceChecklist
          appointment={appointment}
          onToggleItem={(itemId, completed) => onToggleChecklistItem(appointment, itemId, completed)}
          saving={isUpdating}
        />
      ) : null}

      <Pressable
        onPress={() => setBriefOpen((open) => !open)}
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 12,
          backgroundColor: styles.tokens.inputBg,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={[styles.textPrimary, { fontWeight: '600' }]}>Client brief</Text>
        <Icon
          name={briefOpen ? 'chevronUp' : 'chevronDown'}
          size={16}
          color={styles.tokens.textSecondary}
        />
      </Pressable>
      {briefOpen ? <View style={{ marginTop: 12 }}>{clientBrief}</View> : null}

      <Pressable
        onPress={() => onComplete(appointment)}
        disabled={actionId === appointment.id}
        style={{
          marginTop: 20,
          paddingVertical: 16,
          borderRadius: 16,
          backgroundColor:
            actionId === appointment.id ? `${styles.tokens.goldStrong}88` : styles.tokens.goldStrong,
          alignItems: 'center',
          opacity: actionId === appointment.id ? 0.7 : 1,
        }}
      >
        <Text style={{ color: '#121212', fontSize: 18, fontWeight: '600' }}>
          {actionId === appointment.id ? 'Sending…' : 'Send to Checkout ✓'}
        </Text>
      </Pressable>

      <WaiverModal
        visible={showWaiver}
        customerName={customer.full_name || 'Customer'}
        customerPhone={customer.phone || ''}
        onConfirm={handleSaveWaiver}
        onCancel={() => setShowWaiver(false)}
      />

      {onUpdateServices ? (
        <TechnicianServiceEditor
          open={showServiceEditor}
          onClose={() => setShowServiceEditor(false)}
          appointment={appointment}
          onSave={onUpdateServices}
          saving={isUpdating}
        />
      ) : null}
    </View>
  );
}
