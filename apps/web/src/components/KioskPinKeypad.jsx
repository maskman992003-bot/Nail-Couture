import { useState } from 'react';

const PIN_KEYPAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['del', '0', 'clear'],
];

function formatPinDisplay(pin) {
  if (pin.length === 0) return 'Enter PIN';
  return '•'.repeat(pin.length);
}

export default function KioskPinKeypad({
  title,
  subtitle = 'Enter your 4-digit PIN',
  onVerify,
  onSuccess,
  onCancel,
}) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const verifyPin = async (pin) => {
    setPinLoading(true);
    setPinError('');

    try {
      const success = await onVerify(pin);
      if (success) {
        onSuccess();
      } else {
        setPinError('Incorrect PIN. Please try again.');
        setPinInput('');
      }
    } catch {
      setPinError('Verification failed. Please try again.');
      setPinInput('');
    } finally {
      setPinLoading(false);
    }
  };

  const handlePinKeyPress = async (key) => {
    if (pinLoading) return;

    if (key === 'del') {
      setPinInput((prev) => prev.slice(0, -1));
      setPinError('');
      return;
    }

    if (key === 'clear') {
      setPinInput('');
      setPinError('');
      return;
    }

    if (key && pinInput.length < 4) {
      const newPin = pinInput + key;
      setPinInput(newPin);
      setPinError('');

      if (newPin.length === 4) {
        await verifyPin(newPin);
      }
    }
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col animate-fade-in">
      <div className="p-6 flex items-center justify-between">
        <div />
        <button
          type="button"
          onClick={onCancel}
          className="text-xs uppercase tracking-[0.2em] text-secondary hover:text-gold transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="font-heading text-3xl text-gold mb-2 tracking-wide">{title}</h1>
        <p className="text-secondary mb-8">{subtitle}</p>

        <div className="w-full max-w-sm mb-8">
          <div className={`text-center text-3xl font-heading py-4 transition-all ${
            pinInput.length > 0 ? 'text-primary' : 'text-muted'
          }`}>
            {formatPinDisplay(pinInput)}
          </div>
          <div className="h-1 bg-secondary mx-auto w-48 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold transition-all duration-300"
              style={{ width: `${(pinInput.length / 4) * 100}%` }}
            />
          </div>
        </div>

        <div className="w-full max-w-xs">
          {PIN_KEYPAD_KEYS.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-3 mb-3">
              {row.map((key, keyIndex) => (
                <button
                  key={keyIndex}
                  type="button"
                  onClick={() => handlePinKeyPress(key)}
                  disabled={pinLoading || (key === '' && keyIndex !== 1)}
                  className={`
                    w-20 h-20 rounded-full text-2xl font-heading transition-all
                    ${key === 'del'
                      ? 'bg-input text-primary hover:bg-card'
                      : key === 'clear'
                        ? 'bg-input text-primary hover:bg-card text-xs tracking-[0.24em] uppercase'
                        : key === ''
                          ? 'bg-transparent cursor-default'
                          : pinInput.length >= 4
                            ? 'bg-secondary text-muted cursor-not-allowed'
                            : 'bg-input text-primary hover:bg-gold/20 hover:text-gold'
                    }
                  `}
                >
                  {key === 'del' ? (
                    <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 4l18 16" />
                    </svg>
                  ) : key === 'clear' ? 'CLEAR' : key}
                </button>
              ))}
            </div>
          ))}
        </div>

        {pinError && (
          <div className="mt-4 text-red-400 text-center max-w-xs">{pinError}</div>
        )}

        {pinLoading && (
          <div className="mt-4 text-secondary text-sm uppercase tracking-[0.2em] animate-pulse">
            Verifying...
          </div>
        )}
      </div>
    </div>
  );
}
