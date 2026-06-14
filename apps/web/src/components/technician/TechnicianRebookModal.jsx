import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AppModal, {
  modalBtnPrimary,
  modalBtnSecondary,
  modalInputClass,
  modalLabelClass,
  modalSelectClass,
} from '../AppModal';

export default function TechnicianRebookModal({ open, onClose, customerId, customerName, serviceId, onSuccess }) {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(serviceId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 14);
    setDate(tomorrow.toISOString().slice(0, 10));
    setTime('10:00');
    setSelectedServiceId(serviceId || '');

    supabase
      .from('services')
      .select('id, name, price')
      .eq('is_addon', false)
      .eq('is_coming_soon', false)
      .order('name')
      .then(({ data }) => setServices(data || []));
  }, [open, serviceId]);

  const handleBook = async () => {
    if (!date || !time || !customerId) {
      setError('Date and time are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
      const { error: rpcError } = await supabase.rpc('create_followup_appointment', {
        caller_phone: user?.phone,
        p_customer_id: customerId,
        p_service_id: selectedServiceId ? Number(selectedServiceId) : null,
        p_technician_id: user?.id || null,
        p_scheduled_at: scheduledAt,
        p_notes: 'Booked by technician at chair',
      });
      if (rpcError) throw rpcError;
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to book follow-up');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Book next visit"
      subtitle={customerName ? `For ${customerName}` : undefined}
      maxWidth="max-w-md"
      zIndex="z-[210]"
      footer={
        <>
          <button type="button" onClick={onClose} className={modalBtnSecondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleBook}
            disabled={saving || !date || !time}
            className={modalBtnPrimary}
          >
            {saving ? 'Booking…' : 'Book appointment'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={modalLabelClass}>Service</label>
          <select
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className={modalSelectClass}
          >
            <option value="">Same as last visit / TBD</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — ${s.price}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={modalLabelClass}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className={modalInputClass}
            />
          </div>
          <div>
            <label className={modalLabelClass}>Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={modalInputClass}
            />
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <p className="text-secondary text-xs">
          Creates a confirmed booking. Reception can adjust details if needed.
        </p>
      </div>
    </AppModal>
  );
}
