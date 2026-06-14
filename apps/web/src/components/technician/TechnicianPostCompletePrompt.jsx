import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { modalSelectClass } from '../AppModal';
import { getCustomerDetailPath } from '@nail-couture/shared/utils/routes';
import { addStaffNote } from '@nail-couture/shared/utils/staffCustomerNotes';
import { uploadVisitPhoto } from '@nail-couture/shared/utils/staffCustomerTimeline';
import { canUploadVisitPhotos } from '@nail-couture/shared/utils/staffCustomerAccess';
import { clickFileInput, openWebCameraPicker } from '../../utils/mobileFilePickers.js';
import TechnicianRebookModal from './TechnicianRebookModal';

export default function TechnicianPostCompletePrompt({ data, onDismiss, userRole }) {
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [photoType, setPhotoType] = useState('after');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [showRebook, setShowRebook] = useState(false);
  const photoInputRef = useRef(null);
  const cameraCaptureInputRef = useRef(null);

  if (!data) return null;

  const saveNote = async () => {
    if (!note.trim()) return true;
    if (!data.customerId) {
      setMessage('Cannot save note — missing client ID. Open the client profile to add a note.');
      setMessageIsError(true);
      return false;
    }
    setNoteSaving(true);
    setMessage('');
    setMessageIsError(false);
    const result = await addStaffNote(data.customerId, note, user, {
      appointmentId: data.appointmentId,
    });
    setNoteSaving(false);
    if (result.success) {
      setNote('');
      setMessage('Note saved to internal staff notes');
      setMessageIsError(false);
      return true;
    }
    setMessage(result.error || 'Failed to save note');
    setMessageIsError(true);
    return false;
  };

  const handleAddNote = async () => {
    await saveNote();
  };

  const handleDone = async () => {
    if (note.trim()) {
      const saved = await saveNote();
      if (!saved) return;
    }
    onDismiss();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !canUploadVisitPhotos(user?.role)) return;
    setPhotoUploading(true);
    setMessage('');
    setMessageIsError(false);
    const result = await uploadVisitPhoto(
      data.customerId,
      data.appointmentId,
      file,
      photoType,
      user?.id
    );
    setPhotoUploading(false);
    e.target.value = '';
    if (result.success) {
      setMessage(`${photoType === 'before' ? 'Before' : 'After'} photo uploaded`);
      setMessageIsError(false);
    } else {
      setMessage(result.error || 'Upload failed');
      setMessageIsError(true);
    }
  };

  const openCamera = () => {
    if (photoUploading) return;
    openWebCameraPicker({
      nativeCameraInputRef: cameraCaptureInputRef,
    });
  };

  return (
    <div className="bg-card border-2 border-gold/40 rounded-xl p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-heading text-lg text-gold-strong">Sent to checkout</h3>
          <p className="text-secondary text-sm mt-1">
            {data.customerName} — cashier will settle payment. Add a visit note or photo? (optional)
          </p>
        </div>
        <button
          type="button"
          onClick={handleDone}
          className="text-secondary hover:text-primary text-xl leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Quick visit note (saved to internal staff notes)…"
            rows={2}
            className="flex-1 text-sm px-3 py-2 bg-input border border-input rounded-lg text-primary placeholder-text-muted resize-none"
          />
          <button
            type="button"
            onClick={handleAddNote}
            disabled={noteSaving || !note.trim()}
            className="px-4 py-2 text-sm bg-gold text-charcoal rounded-lg font-medium disabled:opacity-50 sm:self-start"
          >
            {noteSaving ? 'Saving…' : 'Save note'}
          </button>
        </div>

        {canUploadVisitPhotos(user?.role) && (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={photoType}
              onChange={(e) => setPhotoType(e.target.value)}
              className={clsx('text-sm', modalSelectClass)}
            >
              <option value="before">Before</option>
              <option value="after">After</option>
            </select>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <input
              ref={cameraCaptureInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <button
              type="button"
              onClick={openCamera}
              disabled={photoUploading}
              className="px-4 py-2 text-sm bg-secondary border border-light rounded-lg text-primary hover:border-theme disabled:opacity-50"
            >
              {photoUploading ? 'Uploading…' : 'Camera'}
            </button>
            <button
              type="button"
              onClick={() => clickFileInput(photoInputRef)}
              disabled={photoUploading}
              className="px-4 py-2 text-sm bg-secondary border border-light rounded-lg text-primary hover:border-theme disabled:opacity-50"
            >
              {photoUploading ? 'Uploading…' : 'Photos'}
            </button>
          </div>
        )}

        {message && (
          <p className={clsx('text-sm', messageIsError ? 'text-red-400' : 'text-green-400')}>
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-1 items-center">
          <button
            type="button"
            onClick={() => setShowRebook(true)}
            className="px-4 py-2 text-sm bg-gold/15 text-gold-strong border border-gold/30 rounded-lg hover:bg-gold/25"
          >
            Book next visit
          </button>
          {data.customerId && (
            <Link
              to={getCustomerDetailPath(userRole, data.customerId)}
              className="text-sm text-gold-strong hover:underline"
            >
              Open full client profile →
            </Link>
          )}
          <button
            type="button"
            onClick={handleDone}
            disabled={noteSaving}
            className="text-sm text-secondary hover:text-primary ml-auto disabled:opacity-50"
          >
            {note.trim() ? 'Save & done' : 'Done'}
          </button>
        </div>
      </div>

      <TechnicianRebookModal
        open={showRebook}
        onClose={() => setShowRebook(false)}
        customerId={data.customerId}
        customerName={data.customerName}
        serviceId={data.serviceId}
        onSuccess={() => {
          setMessage('Follow-up appointment booked');
          setMessageIsError(false);
        }}
      />
    </div>
  );
}
