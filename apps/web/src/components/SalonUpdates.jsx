import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAnnouncementInbox } from '@nail-couture/shared/hooks/useAnnouncementInbox.js';
import { formatAnnouncementDate } from '@nail-couture/shared/utils/announcementInbox.js';
import Sidebar from './Sidebar';
import AnnouncementAttachmentsList from '@nail-couture/shared/components/AnnouncementAttachmentsList.jsx';
import clsx from 'clsx';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'saved', label: 'Saved' },
  { id: 'archived', label: 'Archived' },
];

export default function SalonUpdates() {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState(null);
  const isCustomer = user?.role === 'customer';

  const {
    filter,
    items,
    loading,
    error,
    hasMore,
    changeFilter,
    loadMore,
    toggleSaved,
    toggleArchived,
    markNotificationRead,
  } = useAnnouncementInbox(user?.phone);

  const handleExpand = (item) => {
    const id = item.announcement_id;
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next && !item.is_read && item.notification_id) {
      markNotificationRead(item.notification_id);
    }
  };

  const formatMeta = (item) => {
    const date = formatAnnouncementDate(item.received_at);
    return isCustomer ? date : `${item.created_by_name} · ${date}`;
  };

  return (
    <div className="min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 bg-primary text-primary">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="max-w-3xl mx-auto">
          <header className="mb-8">
            <h1 className="font-heading text-3xl text-gold mb-2">Salon Updates</h1>
            <p className="text-secondary text-sm">
              Announcements from the salon. Save important ones or archive what you have read.
            </p>
          </header>

          <div className="flex gap-2 mb-6 flex-wrap">
            {FILTERS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => changeFilter(tab.id)}
                className={clsx(
                  'px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
                  filter === tab.id
                    ? 'bg-gold/10 border-theme text-gold-strong'
                    : 'border-card text-secondary hover:border-theme hover:text-primary',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {loading && items.length === 0 ? (
            <div className="text-center py-16 text-muted">Loading announcements…</div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-card bg-secondary p-12 text-center">
              <p className="text-secondary text-sm">
                {filter === 'saved'
                  ? 'No saved announcements yet.'
                  : filter === 'archived'
                    ? 'No archived announcements.'
                    : 'No salon announcements yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const isExpanded = expandedId === item.announcement_id;
                return (
                  <article
                    key={item.inbox_id}
                    className={clsx(
                      'rounded-xl border p-5 transition-colors bg-secondary',
                      item.is_read ? 'border-card' : 'border-theme bg-gold/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleExpand(item)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {!item.is_read ? (
                            <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                          ) : null}
                          <h2 className="font-heading text-lg text-primary">
                            {item.title}
                          </h2>
                        </div>
                        <p className="text-xs text-muted">
                          {formatMeta(item)}
                        </p>
                        {!isExpanded && item.body ? (
                          <p className="text-sm mt-2 line-clamp-2 text-secondary">{item.body}</p>
                        ) : null}
                        {!isExpanded && item.attachments?.length > 0 ? (
                          <AnnouncementAttachmentsList
                            attachments={item.attachments}
                            compact
                            className="mt-3"
                          />
                        ) : null}
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleSaved(item.announcement_id, item.is_saved)}
                          title={item.is_saved ? 'Unsave' : 'Save'}
                          className={clsx(
                            'w-9 h-9 rounded-lg border flex items-center justify-center transition-colors',
                            item.is_saved
                              ? 'border-theme text-gold-strong bg-gold/10'
                              : 'border-card text-muted hover:text-gold-strong hover:border-theme',
                          )}
                        >
                          <svg className="w-4 h-4" fill={item.is_saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleArchived(item.announcement_id, item.is_archived)}
                          title={item.is_archived ? 'Restore' : 'Archive'}
                          className="w-9 h-9 rounded-lg border border-card text-muted hover:text-primary hover:border-theme flex items-center justify-center transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {isExpanded ? (
                      <>
                        {item.body ? (
                          <p className="text-sm mt-4 whitespace-pre-wrap text-secondary">{item.body}</p>
                        ) : null}
                        {item.attachments?.length > 0 ? (
                          <AnnouncementAttachmentsList
                            attachments={item.attachments}
                            className={item.body ? 'mt-4' : 'mt-2'}
                          />
                        ) : null}
                      </>
                    ) : null}
                  </article>
                );
              })}

              {hasMore ? (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full py-3 rounded-xl border border-theme text-gold-strong text-sm hover:bg-gold/10 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
