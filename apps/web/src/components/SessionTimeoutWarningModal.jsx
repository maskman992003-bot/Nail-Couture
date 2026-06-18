import AppModal from './AppModal.jsx';

function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function SessionTimeoutWarningModal({ open, remainingSeconds }) {
  return (
    <AppModal
      open={open}
      centered
      title="Session Expiring Soon"
      subtitle="Your session is about to expire due to inactivity. Tap or click anywhere to stay signed in."
      maxWidth="max-w-md"
      zIndex="z-[300]"
      footer={(
        <div className="w-full text-center">
          <p className="text-gold font-heading text-3xl tabular-nums">
            {formatCountdown(remainingSeconds)}
          </p>
          <p className="text-secondary text-sm mt-2">
            You will be logged out when the timer reaches zero.
          </p>
        </div>
      )}
    />
  );
}
