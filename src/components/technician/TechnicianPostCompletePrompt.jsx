import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { getCustomerDetailPath } from '../../utils/routes';
import { addStaffNote } from '../../utils/staffCustomerNotes';
import { uploadVisitPhoto } from '../../utils/staffCustomerTimeline';
import { canUploadVisitPhotos } from '../../utils/staffCustomerAccess';

export default function TechnicianPostCompletePrompt({ data, onDismiss, userRole }) {
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [photoType, setPhotoType] = useState('after');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [message, setMessage] = useState('');
  const photoInputRef = useRef(null);

  if (!data) return null;

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setNoteSaving(true);
    setMessage('');
    const result = await addStaffNote(data.customerId, note, user);
    setNoteSaving(false);
    if (result.success) {
      setNote('');
      setMessage('Note saved');
    } else {
      setMessage(result.error || 'Failed to save note');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !canUploadVisitPhotos(user?.role)) return;
    setPhotoUploading(true);
    setMessage('');
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
    } else {
      setMessage(result.error || 'Upload failed');
    }
  };

  return (
    <div className="bg-card border-2 border-gold/40 rounded-xl p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-heading text-lg text-gold-strong">Service complete</h3>
          <p className="text-secondary text-sm mt-1">
            {data.customerName} — add a visit note or photo? (optional)
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-secondary hover:text-primary text-xl leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Quick visit note…"
            className="flex-1 text-sm px-3 py-2 bg-input border border-input rounded-lg text-primary placeholder-text-muted"
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
          />
          <button
            type="button"
            onClick={handleAddNote}
            disabled={noteSaving || !note.trim()}
            className="px-4 py-2 text-sm bg-gold text-charcoal rounded-lg font-medium disabled:opacity-50"
          >
            {noteSaving ? '…' : 'Save note'}
          </button>
        </div>

        {canUploadVisitPhotos(user?.role) && (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={photoType}
              onChange={(e) => setPhotoType(e.target.value)}
              className="px-3 py-2 text-sm bg-input border border-input rounded-lg text-primary"
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
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="px-4 py-2 text-sm bg-secondary border border-light rounded-lg text-primary hover:border-theme disabled:opacity-50"
            >
              {photoUploading ? 'Uploading…' : 'Upload photo'}
            </button>
          </div>
        )}

        {message && (
          <p className={clsx('text-sm', message.includes('fail') || message.includes('Failed') ? 'text-red-400' : 'text-green-400')}>
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            to={getCustomerDetailPath(userRole, data.customerId)}
            className="text-sm text-gold-strong hover:underline"
          >
            Open full client profile →
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="text-sm text-secondary hover:text-primary ml-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
