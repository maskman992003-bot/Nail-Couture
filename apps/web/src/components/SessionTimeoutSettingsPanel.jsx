import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  CONFIGURABLE_ROLES,
  ROLE_COLORS,
  ROLE_LABELS,
} from '@nail-couture/shared/constants/sessionTimeout.js';
import {
  fetchAllRoleSessionSettings,
  persistRoleSessionSettings,
  secondsToMinutes,
  validateSessionSettingsInput,
} from '@nail-couture/shared/utils/roleSessionSettings.js';
import { modalInputClass } from './AppModal.jsx';

function buildFormState(rows) {
  const next = {};
  for (const role of CONFIGURABLE_ROLES) {
    const row = rows.find((item) => item.role === role);
    next[role] = {
      idleMinutes: row ? secondsToMinutes(row.idle_timeout_seconds) : 15,
      warningMinutes: row ? secondsToMinutes(row.warning_duration_seconds) : 1,
    };
  }
  return next;
}

function getRowError(idleMinutes, warningMinutes) {
  const result = validateSessionSettingsInput(idleMinutes, warningMinutes);
  return result.valid ? '' : result.error;
}

function tabChipClass(active) {
  return clsx(
    'px-3 py-2 rounded-xl text-sm font-medium border transition-colors',
    active
      ? 'bg-gold/10 border-theme text-gold-strong'
      : 'border-card text-secondary hover:border-theme hover:text-primary',
  );
}

export default function SessionTimeoutSettingsPanel({ callerPhone }) {
  const [activeTab, setActiveTab] = useState(CONFIGURABLE_ROLES[0]);
  const [formState, setFormState] = useState(() => buildFormState([]));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const rows = await fetchAllRoleSessionSettings();
      if (!cancelled) {
        setFormState(buildFormState(rows));
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const rowErrors = useMemo(() => {
    const errors = {};
    for (const role of CONFIGURABLE_ROLES) {
      const { idleMinutes, warningMinutes } = formState[role] ?? { idleMinutes: 0, warningMinutes: 0 };
      errors[role] = getRowError(idleMinutes, warningMinutes);
    }
    return errors;
  }, [formState]);

  const hasValidationErrors = useMemo(
    () => CONFIGURABLE_ROLES.some((role) => Boolean(rowErrors[role])),
    [rowErrors],
  );

  const handleFieldChange = (role, field, value) => {
    setMessage({ type: '', text: '' });
    setFormState((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [field]: value === '' ? '' : Number(value),
      },
    }));
  };

  const handleSave = async () => {
    if (!callerPhone || hasValidationErrors) return;

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      for (const role of CONFIGURABLE_ROLES) {
        const { idleMinutes, warningMinutes } = formState[role];
        const validation = validateSessionSettingsInput(idleMinutes, warningMinutes);
        if (!validation.valid) {
          setMessage({ type: 'error', text: validation.error });
          setActiveTab(role);
          return;
        }

        const result = await persistRoleSessionSettings(
          callerPhone,
          role,
          validation.idleSeconds,
          validation.warningSeconds,
        );

        if (!result?.success) {
          const errorText = result?.error === 'forbidden'
            ? 'Only super admins can change session timeout settings.'
            : result?.error === 'warning_must_be_less_than_idle'
              ? `Warning duration must be less than idle time for ${ROLE_LABELS[role]}.`
              : result?.error === 'minimum_60_seconds'
                ? 'Idle time and warning duration must be at least 1 minute.'
                : result?.error || `Failed to save settings for ${ROLE_LABELS[role]}.`;
          setMessage({ type: 'error', text: errorText });
          setActiveTab(role);
          return;
        }
      }

      setMessage({ type: 'success', text: 'Session timeout settings saved successfully.' });
      const rows = await fetchAllRoleSessionSettings();
      setFormState(buildFormState(rows));
    } finally {
      setSaving(false);
    }
  };

  const { idleMinutes, warningMinutes } = formState[activeTab] ?? { idleMinutes: '', warningMinutes: '' };
  const activeError = rowErrors[activeTab];

  return (
    <div className="rounded-2xl border border-card bg-card p-6 mb-6">
      <div className="mb-5">
        <h3 className="font-heading text-xl text-gold">Session Timeout Settings</h3>
        <p className="text-secondary text-sm mt-1">
          Configure idle timeout and warning duration for each user role. Users are logged out after
          inactivity unless they interact during the warning period.
        </p>
        <p className="text-muted text-xs mt-2">
          Check-In kiosk sessions are not subject to idle timeout enforcement.
        </p>
        {message.text ? (
          <p
            className={clsx(
              'text-sm mt-2 rounded-lg border px-3 py-2',
              message.type === 'success'
                ? 'text-green-300 border-green-500/30 bg-green-500/10'
                : 'text-red-400 border-red-500/30 bg-red-500/10',
            )}
          >
            {message.text}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="text-secondary text-sm animate-pulse">Loading session timeout settings…</p>
      ) : (
        <div className="space-y-4">
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="User roles"
          >
            {CONFIGURABLE_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                role="tab"
                id={`session-timeout-tab-${role}`}
                aria-selected={activeTab === role}
                onClick={() => setActiveTab(role)}
                className={clsx(tabChipClass(activeTab === role), 'relative')}
              >
                {ROLE_LABELS[role] || role}
                {rowErrors[role] ? (
                  <span
                    className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-400"
                    aria-hidden
                  />
                ) : null}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            aria-labelledby={`session-timeout-tab-${activeTab}`}
            className="rounded-xl border border-light bg-secondary p-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <span
                className={clsx(
                  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-heading uppercase tracking-wider',
                  ROLE_COLORS[activeTab] || 'bg-secondary text-primary border-light',
                )}
              >
                {ROLE_LABELS[activeTab] || activeTab}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-secondary text-xs uppercase tracking-wider block mb-2">
                  Idle Time (minutes)
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={idleMinutes}
                  onChange={(e) => handleFieldChange(activeTab, 'idleMinutes', e.target.value)}
                  className={modalInputClass}
                  disabled={saving}
                />
              </label>
              <label className="block">
                <span className="text-secondary text-xs uppercase tracking-wider block mb-2">
                  Warning Duration (minutes)
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={warningMinutes}
                  onChange={(e) => handleFieldChange(activeTab, 'warningMinutes', e.target.value)}
                  className={modalInputClass}
                  disabled={saving}
                />
              </label>
            </div>

            {activeError ? (
              <p className="text-red-400 text-xs mt-2">{activeError}</p>
            ) : (
              <p className="text-muted text-xs mt-2">
                Warning appears {warningMinutes || 0} min before logout at {idleMinutes || 0} min idle.
              </p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || hasValidationErrors || !callerPhone}
              className="shrink-0 flex items-center gap-2 bg-gold text-charcoal px-5 py-2.5 rounded-lg hover:bg-gold/90 transition-colors text-sm font-heading disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Session Timeouts'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
