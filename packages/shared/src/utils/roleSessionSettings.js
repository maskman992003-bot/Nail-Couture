import { supabase } from '../lib/supabase.js';
import { CHECK_IN_ROLE } from './routes.js';
import {
  CUSTOMER_DEFAULT_IDLE_SECONDS,
  DEFAULT_WARNING_SECONDS,
  SESSION_MIN_SECONDS,
  STAFF_DEFAULT_IDLE_SECONDS,
} from '../constants/sessionTimeout.js';

/** @typedef {{ idle_timeout_seconds: number, warning_duration_seconds: number }} RoleSessionSettings */

/** @typedef {{ role: string, idle_timeout_seconds: number, warning_duration_seconds: number, updated_at?: string }} RoleSessionSettingsRow */

export const DEFAULT_SESSION_SETTINGS = {
  customer: {
    idle_timeout_seconds: CUSTOMER_DEFAULT_IDLE_SECONDS,
    warning_duration_seconds: DEFAULT_WARNING_SECONDS,
  },
  staff: {
    idle_timeout_seconds: STAFF_DEFAULT_IDLE_SECONDS,
    warning_duration_seconds: DEFAULT_WARNING_SECONDS,
  },
};

export function isStaffRoleForTimeout(role) {
  return role && role !== 'customer' && role !== CHECK_IN_ROLE;
}

export function getDefaultSessionSettingsForRole(role) {
  if (role === 'customer') {
    return { ...DEFAULT_SESSION_SETTINGS.customer };
  }
  return { ...DEFAULT_SESSION_SETTINGS.staff };
}

/**
 * @param {unknown} data
 * @param {string} [role]
 * @returns {RoleSessionSettings}
 */
export function normalizeSessionSettings(data, role) {
  const fallback = getDefaultSessionSettingsForRole(role);
  const idle = Number(data?.idle_timeout_seconds);
  const warning = Number(data?.warning_duration_seconds);

  if (
    Number.isFinite(idle)
    && Number.isFinite(warning)
    && idle >= SESSION_MIN_SECONDS
    && warning >= SESSION_MIN_SECONDS
    && warning < idle
  ) {
    return {
      idle_timeout_seconds: Math.floor(idle),
      warning_duration_seconds: Math.floor(warning),
    };
  }

  return fallback;
}

/**
 * @param {string} role
 * @returns {Promise<RoleSessionSettings>}
 */
export async function fetchRoleSessionSettings(role) {
  if (!role) {
    return getDefaultSessionSettingsForRole(role);
  }

  try {
    const { data, error } = await supabase.rpc('get_role_session_settings', {
      p_role: role,
    });

    if (error) {
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        console.warn('[SessionTimeout] get_role_session_settings unavailable:', error.message);
      }
      return getDefaultSessionSettingsForRole(role);
    }

    return normalizeSessionSettings(data, role);
  } catch (err) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.warn('[SessionTimeout] Failed to fetch role session settings:', err);
    }
    return getDefaultSessionSettingsForRole(role);
  }
}

/**
 * @returns {Promise<RoleSessionSettingsRow[]>}
 */
export async function fetchAllRoleSessionSettings() {
  try {
    const { data, error } = await supabase.rpc('get_all_role_session_settings');

    if (error) {
      return [];
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((row) => ({
      role: row.role,
      ...normalizeSessionSettings(row, row.role),
      updated_at: row.updated_at,
    }));
  } catch {
    return [];
  }
}

/**
 * @param {string} callerPhone
 * @param {string} role
 * @param {number} idleSeconds
 * @param {number} warningSeconds
 */
export async function persistRoleSessionSettings(callerPhone, role, idleSeconds, warningSeconds) {
  if (!callerPhone) {
    return { success: false, error: 'missing_caller_phone' };
  }

  const idle = Math.floor(Number(idleSeconds));
  const warning = Math.floor(Number(warningSeconds));

  if (!Number.isFinite(idle) || !Number.isFinite(warning)) {
    return { success: false, error: 'invalid_values' };
  }

  if (idle < SESSION_MIN_SECONDS || warning < SESSION_MIN_SECONDS) {
    return { success: false, error: 'minimum_60_seconds' };
  }

  if (warning >= idle) {
    return { success: false, error: 'warning_must_be_less_than_idle' };
  }

  try {
    const { data, error } = await supabase.rpc('set_role_session_settings', {
      caller_phone: callerPhone,
      p_role: role,
      p_idle: idle,
      p_warning: warning,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return data ?? { success: false, error: 'empty_response' };
  } catch (err) {
    return { success: false, error: err?.message || 'persist_failed' };
  }
}

/**
 * @param {string} role
 * @param {(settings: RoleSessionSettings) => void} onSettingsChange
 * @returns {() => void}
 */
export function subscribeToRoleSessionSettingsChanges(role, onSettingsChange) {
  const channel = supabase
    .channel(`role-session-settings-${role}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'role_session_settings',
        filter: `role=eq.${role}`,
      },
      (payload) => {
        const row = payload.new ?? payload.old;
        if (row) {
          onSettingsChange(normalizeSessionSettings(row, role));
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function secondsToMinutes(seconds) {
  return Math.floor(Number(seconds) / 60);
}

export function minutesToSeconds(minutes) {
  return Math.floor(Number(minutes) * 60);
}

export function validateSessionSettingsInput(idleMinutes, warningMinutes) {
  const idleSeconds = minutesToSeconds(idleMinutes);
  const warningSeconds = minutesToSeconds(warningMinutes);

  if (!Number.isFinite(idleMinutes) || !Number.isFinite(warningMinutes)) {
    return { valid: false, error: 'Enter valid numbers for idle and warning duration.' };
  }

  if (idleMinutes < 1 || warningMinutes < 1) {
    return { valid: false, error: 'Idle time and warning duration must be at least 1 minute.' };
  }

  if (warningSeconds >= idleSeconds) {
    return { valid: false, error: 'Warning duration must be less than idle time.' };
  }

  return {
    valid: true,
    idleSeconds,
    warningSeconds,
  };
}
