import { useState, useEffect } from 'react';
import { getServices } from '@nail-couture/shared/services/services';
import {
  parseAppointmentLineItems,
  calculateLineItemTotal,
  buildServiceUpdatePayload,
} from '@nail-couture/shared/utils/appointmentServices';
import AppModal, { modalBtnPrimary, modalBtnSecondary } from '../AppModal';

export default function TechnicianServiceEditor({
  open,
  onClose,
  appointment,
  onSave,
  saving = false,
}) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMain, setSelectedMain] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [error, setError] = useState('');

  const { mainServices, addOnServices } = parseAppointmentLineItems(appointment, services);
  const total = calculateLineItemTotal(selectedMain, selectedAddons, addOnServices);

  useEffect(() => {
    if (!open) return;
    setError('');
    setLoading(true);
    getServices()
      .then((data) => {
        setServices(data);
        const parsed = parseAppointmentLineItems(appointment, data);
        setSelectedMain(parsed.selectedMain);
        setSelectedAddons(parsed.selectedAddons);
      })
      .catch(() => setError('Failed to load services'))
      .finally(() => setLoading(false));
  }, [open, appointment]);

  const toggleMain = (service) => {
    setSelectedMain((prev) =>
      prev.some((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );
  };

  const toggleAddon = (name) => {
    setSelectedAddons((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSave = async () => {
    if (selectedMain.length === 0) {
      setError('Select at least one service');
      return;
    }
    setError('');
    const payload = buildServiceUpdatePayload(selectedMain, selectedAddons, addOnServices);
    const result = await onSave(appointment, payload);
    if (result?.success !== false) onClose();
    else setError(result.error || 'Failed to update services');
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Update services"
      subtitle={appointment.customer?.full_name ? `For ${appointment.customer.full_name}` : undefined}
      scrollBody
      maxWidth="max-w-lg"
      zIndex="z-[200]"
      footer={
        <>
          <button type="button" onClick={onClose} className={modalBtnSecondary} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || selectedMain.length === 0}
            className={modalBtnPrimary}
          >
            {saving ? 'Saving…' : 'Save services'}
          </button>
        </>
      }
    >
      {loading ? (
        <p className="text-secondary text-sm animate-pulse">Loading menu…</p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-secondary text-xs mb-2">
              Add or remove services while the client is in chair. Total updates for checkout.
            </p>
            <label className="text-secondary text-xs uppercase tracking-wide">Services</label>
            <div className="space-y-2 max-h-48 overflow-y-auto mt-1">
              {mainServices.map((s) => {
                const isSelected = selectedMain.some((sv) => sv.id === s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 p-2 bg-secondary border border-light rounded-lg cursor-pointer hover:border-theme"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleMain(s)}
                      className="accent-gold"
                    />
                    <span className="text-primary text-sm flex-1">{s.name}</span>
                    <span className="text-green-400 text-sm">${s.price}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {addOnServices.length > 0 && (
            <div>
              <label className="text-secondary text-xs uppercase tracking-wide">Add-ons</label>
              <div className="space-y-2 max-h-40 overflow-y-auto mt-1">
                {addOnServices.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 p-2 bg-secondary border border-light rounded-lg cursor-pointer hover:border-theme"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAddons.includes(s.name)}
                      onChange={() => toggleAddon(s.name)}
                      className="accent-gold"
                    />
                    <span className="text-primary text-sm flex-1">{s.name}</span>
                    <span className="text-green-400 text-sm">+${s.price}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedMain.length > 0 && (
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-4">
              <div className="space-y-1 text-sm">
                {selectedMain.map((s) => (
                  <div key={s.id} className="flex justify-between">
                    <span className="text-secondary">{s.name}</span>
                    <span className="text-primary">${Number(s.price).toFixed(2)}</span>
                  </div>
                ))}
                {selectedAddons.map((name) => {
                  const svc = addOnServices.find((s) => s.name === name);
                  return svc ? (
                    <div key={name} className="flex justify-between">
                      <span className="text-secondary">{svc.name}</span>
                      <span className="text-primary">+${Number(svc.price).toFixed(2)}</span>
                    </div>
                  ) : null;
                })}
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gold/20">
                <span className="text-secondary">Estimated total</span>
                <span className="font-heading text-xl text-gold-strong">${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}
    </AppModal>
  );
}
