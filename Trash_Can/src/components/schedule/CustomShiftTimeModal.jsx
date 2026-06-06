import { useState, useEffect } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';

export default function CustomShiftTimeModal({ open, title, startTime, endTime, onSave, onClose, saveLabel = 'Save' }) {
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);
  const panelRef = useFocusTrap(open, onClose);

  useEffect(() => {
    if (open) {
      setStart(startTime);
      setEnd(endTime);
    }
  }, [open, startTime, endTime]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-shift-modal-title"
        className="w-full max-w-sm bg-card rounded-t-2xl sm:rounded-xl border border-gold/30 overflow-hidden mx-0 sm:mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-light">
          <h3 id="custom-shift-modal-title" className="font-heading text-gold">{title || 'Custom shift times'}</h3>
          <button type="button" onClick={onClose} className="text-secondary hover:text-primary text-xl leading-none" aria-label="Close">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-secondary">From</span>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full mt-1.5 text-sm bg-input border border-gold/30 rounded-lg px-3 py-2.5 text-gold focus:border-gold focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-secondary">To</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full mt-1.5 text-sm bg-input border border-gold/30 rounded-lg px-3 py-2.5 text-gold focus:border-gold focus:outline-none"
            />
          </label>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-light text-secondary hover:text-primary text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(start, end)}
            className="flex-1 py-2.5 rounded-lg bg-gold text-charcoal text-sm font-medium hover:bg-gold/90 transition-colors"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
