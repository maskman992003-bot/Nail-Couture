import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { getCustomerDetailPath } from '../../utils/routes';
import { formatElapsedMinutes } from '../../utils/technicianQueue';
import { parseProfilePreferences, labelForOption, NAIL_SHAPES, NAIL_LENGTHS, NAIL_FINISHES } from '../../utils/profilePreferences';
import { fetchStaffNotes, addStaffNote } from '../../utils/staffCustomerNotes';
import { supabase } from '../../lib/supabase';

export default function TechnicianInChairPanel({
  appointment,
  actionId,
  onComplete,
  userRole,
}) {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [notesAvailable, setNotesAvailable] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [waiverSigned, setWaiverSigned] = useState(null);
  const [elapsed, setElapsed] = useState(formatElapsedMinutes(appointment.start_time));

  const customer = appointment.customer || {};
  const prefs = parseProfilePreferences(customer.preferences);
  const duration = appointment.services?.duration_minutes;
  const isOverdue = duration && appointment.start_time
    && (Date.now() - new Date(appointment.start_time)) / 60000 > duration;

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
    }, 30000);
    return () => clearInterval(tick);
  }, [appointment.start_time]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !appointment.customer_id) return;
    setNoteSaving(true);
    const result = await addStaffNote(appointment.customer_id, newNote, user);
    if (result.success) {
      setNotes((prev) => [result.note, ...prev].slice(0, 3));
      setNewNote('');
    }
    setNoteSaving(false);
  };

  const prefItems = [
    prefs.nail_shape && labelForOption(NAIL_SHAPES, prefs.nail_shape),
    prefs.nail_length && labelForOption(NAIL_LENGTHS, prefs.nail_length),
    prefs.nail_finish && labelForOption(NAIL_FINISHES, prefs.nail_finish),
  ].filter(Boolean);

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
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-green-100 text-green-800 border-green-300'
                )}>
                  {elapsed}{duration ? ` / ${duration}m` : ''}
                </span>
              )}
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 border border-green-300 rounded">
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
          <p className="text-secondary mt-1">
            {appointment.add_ons || appointment.services?.name || 'Service'}
            {duration ? ` (~${duration} min)` : ''}
          </p>

          {customer.nail_goal && (
            <p className="text-gold-strong/80 text-sm mt-2">Goal: {customer.nail_goal}</p>
          )}

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
            <p className={clsx('text-xs mt-2', waiverSigned ? 'text-green-400' : 'text-yellow-400')}>
              Waiver: {waiverSigned ? 'Signed' : 'Not on file'}
            </p>
          )}
        </div>

        <div className="lg:w-72 shrink-0">
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
      </div>

      <button
        type="button"
        onClick={() => onComplete(appointment)}
        disabled={actionId === appointment.id}
        className={clsx(
          'mt-6 w-full py-4 font-heading text-xl rounded-xl transition-colors',
          actionId === appointment.id
            ? 'bg-gold/50 text-charcoal cursor-wait'
            : 'bg-gold text-charcoal hover:bg-gold/90'
        )}
      >
        {actionId === appointment.id ? 'Completing…' : 'Complete Service ✓'}
      </button>
    </div>
  );
}
