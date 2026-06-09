import { useState } from 'react';
import { featureFlags } from '../constants/featureFlags.js';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences.js';

/**
 * @param {Object} props
 * @param {string | undefined | null} props.userPhone
 * @param {string | undefined | null} props.role
 * @param {'dark' | 'light'} [props.theme='dark']
 */
export default function NotificationPreferencesPanel({ userPhone, role, theme = 'dark' }) {
  const { enabled, available, loading, saving, error, groups, toggleType, toggleGroup } =
    useNotificationPreferences(userPhone, role);
  const [expandedGroups, setExpandedGroups] = useState(/** @type {Record<string, boolean>} */ ({}));

  if (!enabled) return null;

  const cardClass =
    theme === 'dark'
      ? 'rounded-xl border border-white/10 bg-white/[0.03]'
      : 'rounded-xl border border-gold/15 bg-gold/[0.04]';

  const itemClass =
    theme === 'dark'
      ? 'flex items-start justify-between gap-4 rounded-lg border border-white/5 bg-black/20 p-3'
      : 'flex items-start justify-between gap-4 rounded-lg border border-gold/10 bg-white/60 p-3';

  const toggleExpanded = (groupId) => {
    setExpandedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  };

  return (
    <div className="rounded-2xl border border-card bg-card p-6 mb-6">
      <h3 className="font-heading text-lg text-primary mb-1">Notification Preferences</h3>
      <p className="text-secondary text-sm mb-4">
        Expand each category and choose which alerts you receive. Muted types will not appear in
        your bell or push notifications.
      </p>

      {!available ? (
        <p className="text-muted text-xs">
          Run sql/040_notification_preferences.sql in Supabase to enable notification preferences.
        </p>
      ) : loading ? (
        <p className="text-gold text-sm animate-pulse">Loading preferences...</p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isExpanded = Boolean(expandedGroups[group.id]);
            const summaryLabel =
              group.enabledCount === group.totalCount
                ? 'All active'
                : group.enabledCount === 0
                  ? 'All muted'
                  : `${group.enabledCount} of ${group.totalCount} active`;

            return (
              <div key={group.id} className={cardClass}>
                <button
                  type="button"
                  onClick={() => toggleExpanded(group.id)}
                  className="w-full flex items-start justify-between gap-4 p-4 text-left"
                  aria-expanded={isExpanded}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-secondary text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        aria-hidden
                      >
                        ▶
                      </span>
                      <span className="text-primary font-medium text-sm">{group.label}</span>
                    </div>
                    <div className="text-secondary text-xs mt-1 ml-5">{group.description}</div>
                    <div className="text-muted text-[11px] mt-1 ml-5">{summaryLabel}</div>
                  </div>
                </button>

                {isExpanded ? (
                  <div className="px-4 pb-4 space-y-2 border-t border-white/5">
                    <div className="flex items-center justify-end gap-3 pt-3 pb-1">
                      <button
                        type="button"
                        disabled={saving || group.allEnabled}
                        onClick={() => toggleGroup(group.id, true)}
                        className="text-xs text-gold hover:text-gold/80 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Enable all
                      </button>
                      <button
                        type="button"
                        disabled={saving || group.noneEnabled}
                        onClick={() => toggleGroup(group.id, false)}
                        className="text-xs text-secondary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Mute all
                      </button>
                    </div>

                    {group.types.map((typeItem) => (
                      <label key={typeItem.id} className={`${itemClass} cursor-pointer`}>
                        <div className="min-w-0">
                          <div className="text-primary font-medium text-sm">{typeItem.label}</div>
                          {typeItem.description ? (
                            <div className="text-secondary text-xs mt-1">{typeItem.description}</div>
                          ) : null}
                        </div>
                        <input
                          type="checkbox"
                          checked={typeItem.enabled}
                          disabled={saving}
                          onChange={(e) => toggleType(typeItem.id, e.target.checked)}
                          className="mt-1 w-5 h-5 shrink-0 accent-[#C5A059]"
                        />
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {error ? <p className="text-red-400 text-xs mt-3">{error}</p> : null}

      {!featureFlags.global.pushNotifications ? (
        <p className="text-muted text-xs mt-4">
          Mobile push delivery requires Phase 2 setup (see docs/PUSH_AND_MESSAGING_SETUP.md).
        </p>
      ) : null}
    </div>
  );
}
