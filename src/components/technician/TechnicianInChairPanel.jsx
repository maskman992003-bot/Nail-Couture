import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import ThemeSelect from '../ThemeSelect';
import { getCustomerDetailPath } from '../../utils/routes';
import { formatElapsedMinutes } from '../../utils/technicianQueue';
import { parseProfilePreferences, labelForOption, NAIL_SHAPES, NAIL_LENGTHS, NAIL_FINISHES } from '../../utils/profilePreferences';
import { fetchStaffNotes, addStaffNote } from '../../utils/staffCustomerNotes';
import { uploadVisitPhoto } from '../../utils/staffCustomerTimeline';
import { canUploadVisitPhotos } from '../../utils/staffCustomerAccess';
import { supabase } from '../../lib/supabase';
import { getAppointmentServiceLabels } from '../../utils/appointmentServices';
import WaiverModal from '../WaiverModal';
import TechnicianServiceEditor from './TechnicianServiceEditor';
import TechnicianServiceChecklist from './TechnicianServiceChecklist';

export default function TechnicianInChairPanel({
  appointment,
  actionId,
  onComplete,
  onUpdateServices,
  onToggleChecklistItem,
  userRole,
}) {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [notesAvailable, setNotesAvailable] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [waiverSigned, setWaiverSigned] = useState(null);
  const [elapsed, setElapsed] = useState(formatElapsedMinutes(appointment.start_time));
  const [briefOpen, setBriefOpen] = useState(false);
  const [photoType, setPhotoType] = useState('after');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState('');
  const [showWaiver, setShowWaiver] = useState(false);
  const [waiverSaving, setWaiverSaving] = useState(false);
  const [showServiceEditor, setShowServiceEditor] = useState(false);
  const photoInputRef = useRef(null);

  const serviceLabels = getAppointmentServiceLabels(appointment);
  const isUpdating = actionId === appointment.id;

  const customer = appointment.customer || {};
  const prefs = parseProfilePreferences(customer.preferences);
  const duration = appointment.services?.duration_minutes;
  const elapsedMins = appointment.start_time
    ? (Date.now() - new Date(appointment.start_time)) / 60000
    : 0;
  const isOverdue = duration && elapsedMins > duration;

  useEffect(() => {
    if (!appointment.customer_id) return;
    fetchStaffNotes(appointment.customer_id, 3).then(({ rows, available }) => {
      setNotes(rows);
      setNotesAvailable(available);
    }).catch(() => setNotesAvailable(false));

    supabase
      .from('customer_waivers')
      .select('id')
      .eq('profile_id', appointment.customer_id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setWaiverSigned(!!data))
      .catch(() => setWaiverSigned(null));
  }, [appointment.customer_id]);

  useEffect(() => {
    const tick = setInterval(() => {
      setElapsed(formatElapsedMinutes(appointment.start_time));
    }, 10000);
    return () => clearInterval(tick);
  }, [appointment.start_time]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !appointment.customer_id) return;
    setNoteSaving(true);
    const result = await addStaffNote(appointment.customer_id, newNote, user, {
      appointmentId: appointment.id,
    });
    if (result.success) {
      setNotes((prev) => [result.note, ...prev].slice(0, 3));
      setNewNote('');
    }
    setNoteSaving(false);
  };

  const handleSaveWaiver = async (waiverData) => {
    if (!appointment.customer_id) return;
    setWaiverSaving(true);
    try {
      const { error } = await supabase.from('customer_waivers').insert([{
        profile_id: appointment.customer_id,
        customer_phone: customer.phone || null,
        customer_name: customer.full_name || 'Customer',
        agreed_to_terms: true,
        signature_image: waiverData.signature_image,
      }]);
      if (error) throw error;
      setWaiverSigned(true);
      setShowWaiver(false);
    } catch {
      setPhotoMsg('Failed to save waiver');
    } finally {
      setWaiverSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !canUploadVisitPhotos(user?.role)) return;
    setPhotoUploading(true);
    setPhotoMsg('');
    const result = await uploadVisitPhoto(
      appointment.customer_id,
      appointment.id,
      file,
      photoType,
      user?.id
    );
    setPhotoUploading(false);
    e.target.value = '';
    setPhotoMsg(result.success ? 'Photo uploaded' : (result.error || 'Upload failed'));
  };

  const prefItems = [
    prefs.nail_shape && labelForOption(NAIL_SHAPES, prefs.nail_shape),
    prefs.nail_length && labelForOption(NAIL_LENGTHS, prefs.nail_length),
    prefs.nail_finish && labelForOption(NAIL_FINISHES, prefs.nail_finish),
  ].filter(Boolean);

  const clientBrief = (
    <>
      {customer.refreshment_pref && (
        <p className="text-secondary text-sm mt-2">
          Refreshment: <span className="text-gold-strong">{customer.refreshment_pref}</span>
        </p>
      )}

      {prefItems.length > 0 && (
        <p className="text-secondary text-sm mt-1">
          Prefs: {prefItems.join(' · ')}
        </p>
      )}

      {prefs.allergies && (
        <p className="text-red-400 text-sm mt-1 font-medium">
          Allergies: {prefs.allergies}
        </p>
      )}

      {waiverSigned !== null && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <p className={clsx('text-xs', waiverSigned ? 'text-green-400' : 'text-yellow-400')}>
            Waiver: {waiverSigned ? 'Signed' : 'Not on file'}
          </p>
          {!waiverSigned && (
            <button
              type="button"
              onClick={() => setShowWaiver(true)}
              disabled={waiverSaving}
              className="text-xs px-2 py-1 bg-yellow-400/15 text-yellow-400 border border-yellow-400/30 rounded hover:bg-yellow-400/25 disabled:opacity-50"
            >
              Collect waiver
            </button>
          )}
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-secondary text-xs uppercase tracking-wide mb-2">Quick Notes</h3>
        {notesAvailable && notes.length > 0 && (
          <ul className="space-y-1 mb-3 max-h-24 overflow-y-auto">
            {notes.map((n) => (
              <li key={n.id} className="text-xs text-secondary bg-secondary rounded p-2">
                {n.note}
              </li>
            ))}
          </ul>
        )}
        {notesAvailable && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note…"
              className="flex-1 text-sm px-3 py-2 bg-input border border-input rounded-lg text-primary placeholder-text-muted"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            />
            <button
              type="button"
              onClick={handleAddNote}
              disabled={noteSaving || !newNote.trim()}
              className="px-3 py-2 text-sm bg-secondary border border-light rounded-lg text-primary hover:border-theme disabled:opacity-50"
            >
              {noteSaving ? '…' : 'Add'}
            </button>
          </div>
        )}
      </div>

      {canUploadVisitPhotos(user?.role) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ThemeSelect
            value={photoType}
            onChange={setPhotoType}
            options={[
              { value: 'before', label: 'Before' },
              { value: 'after', label: 'After' },
            ]}
            className="w-auto min-w-[7.5rem]"
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={photoUploading}
            className="px-3 py-1.5 text-xs bg-secondary border border-light rounded-lg text-primary hover:border-theme disabled:opacity-50"
          >
            {photoUploading ? 'Uploading…' : 'Upload photo'}
          </button>
          {photoMsg && (
            <span className={clsx('text-xs', photoMsg.includes('fail') ? 'text-red-400' : 'text-green-400')}>
              {photoMsg}
            </span>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="bg-gradient-to-r from-gold/15 to-transparent border-2 border-theme rounded-xl p-5 sm:p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-xl text-primary">In Chair</h2>
            <div className="flex items-center gap-2">
              {elapsed && (
                <span className={clsx(
                  'text-xs px-2 py-1 rounded border',
                  isOverdue
                    ? 'bg-red-400/15 text-red-400 border-red-400/30'
                    : 'bg-green-400/15 text-green-400 border-green-400/30'
                )}>
                  {elapsed}{duration ? ` / ${duration}m` : ''}
                </span>
              )}
              <span className="px-2 py-1 text-xs bg-green-400/15 text-green-400 border border-green-400/30 rounded">
                Serving
              </span>
            </div>
          </div>

          <Link
            to={getCustomerDetailPath(userRole, appointment.customer_id)}
            className="font-heading text-2xl text-primary hover:text-gold-strong transition-colors"
          >
            {customer.full_name || 'Customer'}
          </Link>
          <div className="mt-2">
            <div className="flex flex-wrap items-center gap-2">
              {serviceLabels.map((label) => (
                <span
                  key={label}
                  className="px-2 py-1 text-xs bg-secondary border border-light rounded-lg text-primary"
                >
                  {label}
                </span>
              ))}
              {duration && (
                <span className="text-secondary text-xs">~{duration} min</span>
              )}
            </div>
            {appointment.final_price != null && (
              <p className="text-gold-strong text-sm mt-1.5">
                Est. ${Number(appointment.final_price).toFixed(2)}
              </p>
            )}
            {onUpdateServices && (
              <button
                type="button"
                onClick={() => setShowServiceEditor(true)}
                disabled={isUpdating}
                className="mt-2 text-xs px-3 py-1.5 min-h-[36px] bg-gold/15 text-gold-strong border border-gold/30 rounded-lg hover:bg-gold/25 disabled:opacity-50"
              >
                Change services
              </button>
            )}
          </div>

          {customer.nail_goal && (
            <p className="text-gold-strong/80 text-sm mt-2">Goal: {customer.nail_goal}</p>
          )}

          <Link
            to={getCustomerDetailPath(userRole, appointment.customer_id)}
            className="inline-block text-xs text-gold-strong hover:underline mt-2"
          >
            Full client profile →
          </Link>

          {onToggleChecklistItem && (
            <TechnicianServiceChecklist
              appointment={appointment}
              onToggleItem={(itemId, completed) => onToggleChecklistItem(appointment, itemId, completed)}
              saving={isUpdating}
            />
          )}

        </div>

        {/* Desktop: client brief column */}
        <div className="hidden lg:block lg:w-80 shrink-0">
          <h3 className="text-secondary text-xs uppercase tracking-wide mb-2">Client Brief</h3>
          {clientBrief}
        </div>

        {/* Mobile: collapsible client brief */}
        <div className="lg:hidden w-full">
          <button
            type="button"
            onClick={() => setBriefOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-secondary rounded-lg text-sm text-primary"
          >
            <span className="font-medium">Client brief</span>
            <span className="text-secondary">{briefOpen ? '▲' : '▼'}</span>
          </button>
          {briefOpen && <div className="mt-3 px-1">{clientBrief}</div>}
        </div>
      </div>

      <div className="sticky bottom-20 z-10 mt-6 pt-2 lg:static lg:bottom-auto lg:pt-0">
        <button
          type="button"
          onClick={() => onComplete(appointment)}
          disabled={actionId === appointment.id}
          className={clsx(
            'w-full py-4 min-h-[52px] font-heading text-lg lg:text-xl rounded-xl transition-colors shadow-lg lg:shadow-none',
            actionId === appointment.id
              ? 'bg-gold/50 text-charcoal cursor-wait'
              : 'bg-gold text-charcoal hover:bg-gold/90'
          )}
        >
          {actionId === appointment.id ? 'Sending…' : 'Send to Checkout ✓'}
        </button>
      </div>

      {showWaiver && (
        <WaiverModal
          customerName={customer.full_name || 'Customer'}
          customerPhone={customer.phone || ''}
          onConfirm={handleSaveWaiver}
          onCancel={() => setShowWaiver(false)}
        />
      )}

      {onUpdateServices && (
        <TechnicianServiceEditor
          open={showServiceEditor}
          onClose={() => setShowServiceEditor(false)}
          appointment={appointment}
          onSave={onUpdateServices}
          saving={isUpdating}
        />
      )}
    </div>
  );
}
