import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import PromotionsAdminPanel from './marketing/PromotionsAdminPanel';
import AnnouncementAttachmentsList from '@nail-couture/shared/components/AnnouncementAttachmentsList.jsx';
import { useAnnouncements } from '@nail-couture/shared/hooks/useAnnouncements.js';
import {
  formatAnnouncementSendSuccess,
  formatRecipientPreview,
  formatStaffRoleLabel,
  formatStaffTargetingSummary,
  isAnnouncementStaffCandidate,
  resolveAnnouncementEstimate,
} from '@nail-couture/shared/utils/announcements.js';
import {
  formatAttachmentSize,
  getAnnouncementDocumentLabel,
  isAnnouncementImageMime,
  isValidAnnouncementDocumentFile,
  MAX_ANNOUNCEMENT_ATTACHMENTS,
  serializeAnnouncementAttachments,
  uploadAnnouncementAttachment,
} from '@nail-couture/shared/utils/announcementAttachments.js';
import { getSupabaseErrorMessage } from '@nail-couture/shared/utils/supabaseErrors.js';
import { getHomePath } from '@nail-couture/shared/utils/routes.js';
import { featureFlags } from '@nail-couture/shared/constants/featureFlags.js';
import { paginateRows, ANNOUNCEMENTS_PAGE_SIZE } from '@nail-couture/shared/utils/pagination.js';
import WebCameraCapture from './WebCameraCapture.jsx';
import ListPagination from './ListPagination.jsx';
import useRegisterPullToRefresh from '../hooks/useRegisterPullToRefresh';
import { clickFileInput, openWebCameraPicker } from '../utils/mobileFilePickers.js';

const AUDIENCE_OPTIONS = [
  { id: 'customers', label: 'Customers' },
  { id: 'staff', label: 'Staff' },
  { id: 'both', label: 'Both' },
];

const STAFF_MODE_OPTIONS = [
  { id: 'all', label: 'All staff' },
  { id: 'exclude', label: 'Exclude specific staff' },
  { id: 'only', label: 'Only selected staff' },
];

const MANAGEMENT_ROLES = new Set(['super_admin', 'owner', 'partner']);

const ANNOUNCEMENT_TABS = [
  { id: 'broadcasts', label: 'Broadcasts' },
  { id: 'home-offers', label: 'Promotions' },
];

function audienceLabel(audience) {
  if (audience === 'customers') return 'Customers';
  if (audience === 'staff') return 'Staff';
  return 'Customers & staff';
}

function statusClass(status) {
  switch (status) {
    case 'completed': return 'bg-gold/15 text-gold-strong border-theme';
    case 'processing': return 'bg-gold/10 text-secondary border-theme';
    case 'failed': return 'bg-red-500/10 text-red-300 border-red-400/30';
    default: return 'bg-secondary text-muted border-card';
  }
}

export default function Announcements() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { theme } = useTheme();
  const activeTab = searchParams.get('tab') === 'home-offers' ? 'home-offers' : 'broadcasts';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('customers');
  const [staffTargetMode, setStaffTargetMode] = useState('all');
  const [staffProfileIds, setStaffProfileIds] = useState([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const photoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraFallbackInputRef = useRef(null);

  const {
    enabled,
    staffCandidates,
    staffLoading,
    estimate,
    estimateLoading,
    estimateRecipients,
    announcements,
    isLoadingHistory,
    isSending,
    isDelivering,
    sendAnnouncement,
    error,
    setError,
    refreshHistory,
  } = useAnnouncements(user?.phone, user?.role);

  useRegisterPullToRefresh(refreshHistory);

  const chipClass = (active) => clsx(
    'px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
    active
      ? 'bg-gold/10 border-theme text-gold-strong'
      : 'border-card text-secondary hover:border-theme hover:text-primary',
  );

  const showStaffTargeting = audience === 'staff' || audience === 'both';

  const targetableStaff = useMemo(
    () => staffCandidates.filter(isAnnouncementStaffCandidate),
    [staffCandidates],
  );

  const filteredStaff = useMemo(() => {
    const term = staffSearch.trim().toLowerCase();
    if (!term) return targetableStaff;
    return targetableStaff.filter((member) => {
      const name = (member.full_name || '').toLowerCase();
      const role = (member.role || '').toLowerCase();
      return name.includes(term) || role.includes(term);
    });
  }, [targetableStaff, staffSearch]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!MANAGEMENT_ROLES.has(user.role)) {
      navigate(getHomePath(user.role));
      return;
    }
    if (user.role !== 'super_admin' && !featureFlags.staff.announcements) {
      navigate(getHomePath(user.role));
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!enabled) return;
    const ids = showStaffTargeting && staffTargetMode !== 'all' ? staffProfileIds : [];
    estimateRecipients(audience, staffTargetMode, ids);
  }, [enabled, audience, staffTargetMode, staffProfileIds, showStaffTargeting, estimateRecipients]);

  const displayEstimate = useMemo(() => resolveAnnouncementEstimate(
    audience,
    estimate,
    showStaffTargeting ? staffTargetMode : 'all',
    targetableStaff.length,
  ), [audience, estimate, showStaffTargeting, staffTargetMode, targetableStaff.length]);

  const staffValidationError = useMemo(() => {
    if (!showStaffTargeting || staffTargetMode !== 'only') return '';
    if (staffProfileIds.length === 0) return 'Select at least one staff member.';
    return '';
  }, [showStaffTargeting, staffTargetMode, staffProfileIds]);

  const recipientValidationError = useMemo(() => {
    if (estimateLoading) return '';
    if (audience === 'staff' && displayEstimate.staffCount === 0) {
      return 'No staff recipients match the selected targeting.';
    }
    if (displayEstimate.total === 0) return 'No recipients match this announcement.';
    return '';
  }, [audience, displayEstimate, estimateLoading]);

  const canSend = Boolean(
    title.trim()
    && (body.trim() || attachments.length > 0)
    && !staffValidationError
    && !recipientValidationError
    && !isSending
    && !isDelivering
    && !isUploadingAttachment,
  );

  const historyPagination = useMemo(
    () => paginateRows(announcements, historyPage, ANNOUNCEMENTS_PAGE_SIZE),
    [announcements, historyPage],
  );

  useEffect(() => {
    setHistoryPage(1);
  }, [announcements.length]);

  const uploadFiles = async (files) => {
    if (!files.length || !user?.id) return;

    const remaining = MAX_ANNOUNCEMENT_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      setError(`You can attach up to ${MAX_ANNOUNCEMENT_ATTACHMENTS} files.`);
      return;
    }

    setIsUploadingAttachment(true);
    setError('');
    try {
      const uploaded = [];
      for (const file of files.slice(0, remaining)) {
        uploaded.push(await uploadAnnouncementAttachment(user.id, file));
      }
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(getSupabaseErrorMessage(err, 'Failed to upload attachment.'));
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleAddFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    await uploadFiles(files);
  };

  const handleAddDocumentFiles = async (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    const files = picked.filter(isValidAnnouncementDocumentFile);
    const skipped = picked.length - files.length;

    if (picked.length > 0 && files.length === 0) {
      setError('File attachments must be PDF or TXT. Use Photos for images.');
      return;
    }
    await uploadFiles(files);
    if (skipped > 0) {
      setError(`${skipped} file${skipped === 1 ? '' : 's'} skipped. Use Photos for images; File is for PDF or TXT only.`);
    }
  };

  const attachmentDisabled = attachments.length >= MAX_ANNOUNCEMENT_ATTACHMENTS || isUploadingAttachment;

  const openCamera = () => {
    if (attachmentDisabled) return;
    openWebCameraPicker({
      nativeCameraInputRef: cameraFallbackInputRef,
      onDesktopCamera: () => setShowCamera(true),
      onNativeCapture: handleCameraCapture,
    });
  };

  const handleCameraCapture = async (file) => {
    await uploadFiles([file]);
  };

  const attachBtnClass = clsx(
    'rounded-xl border border-card px-4 py-2 text-sm text-secondary transition-colors',
    'hover:border-theme hover:text-gold-strong',
    attachmentDisabled && 'opacity-50 cursor-not-allowed',
  );

  const removeAttachment = (url) => {
    setAttachments((prev) => prev.filter((item) => item.url !== url));
  };

  const handleStaffToggle = (memberId) => {
    setStaffProfileIds((prev) => (
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    ));
  };

  const handleStaffModeChange = (mode) => {
    setStaffTargetMode(mode);
    setStaffProfileIds([]);
    setStaffSearch('');
  };

  const handleSend = async () => {
    if (!canSend) return;
    setError('');
    setSendSuccess('');
    try {
      const result = await sendAnnouncement({
        title: title.trim(),
        body: body.trim(),
        audience,
        staffTargetMode: showStaffTargeting ? staffTargetMode : 'all',
        staffProfileIds: showStaffTargeting && staffTargetMode !== 'all' ? staffProfileIds : [],
        attachments: serializeAnnouncementAttachments(attachments),
      });
      if (!result?.id) {
        throw new Error('Announcement was not created. Check that database migrations are up to date.');
      }
      setTitle('');
      setBody('');
      setAttachments([]);
      setAudience('customers');
      setStaffTargetMode('all');
      setStaffProfileIds([]);
      setShowConfirm(false);
      setSendSuccess(formatAnnouncementSendSuccess(result));
    } catch (err) {
      setShowConfirm(false);
      setError(err instanceof Error ? err.message : 'Failed to send announcement.');
    }
  };

  if (!user || !enabled) {
    return (
      <div className="min-h-screen w-full transition-all duration-300 pl-sidebar bg-primary text-primary">
        <main className="p-4 md:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto text-muted">Loading…</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full transition-all duration-300 pl-sidebar bg-primary text-primary">
      <div className="p-4 md:p-6 lg:p-8 mobile-page">
        <div className={clsx('mx-auto', activeTab === 'home-offers' ? 'max-w-6xl' : 'max-w-3xl')}>
          <header className="mb-8">
            <h1 className="font-heading text-3xl text-gold mb-2">Announcements</h1>
            <p className="text-secondary text-sm mb-5">
              {activeTab === 'home-offers'
                ? 'Manage home-screen offers and promo codes without redeploying the app.'
                : 'Send promotions and salon updates to customers, staff, or both.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {ANNOUNCEMENT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSearchParams(tab.id === 'broadcasts' ? {} : { tab: tab.id })}
                  className={chipClass(activeTab === tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </header>

        {activeTab === 'home-offers' ? (
          <PromotionsAdminPanel userPhone={user?.phone} userRole={user?.role} />
        ) : (
          <>
        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}
        <section className="rounded-xl border border-card bg-secondary p-5 mb-8">
          <h2 className="font-heading text-lg text-gold-strong mb-4">Compose</h2>

          <label className="block text-sm text-secondary mb-1">Title</label>
          <input
            type="text"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-input bg-input px-3 py-2 mb-4 text-primary placeholder-text-muted"
            placeholder="Summer Special — 20% Off"
          />

          <label className="block text-sm text-secondary mb-1">Message</label>
          <textarea
            maxLength={500}
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-lg border border-input bg-input px-3 py-2 mb-4 resize-y text-primary placeholder-text-muted"
            placeholder="Share your promotion or salon update..."
          />
          <p className="text-xs text-muted mb-4">
            {body.length}/500 characters
          </p>

          <div className="mb-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="block text-sm text-secondary">Attachments</label>
              <span className="text-xs text-muted">
                {attachments.length}/{MAX_ANNOUNCEMENT_ATTACHMENTS}
              </span>
            </div>
            <p className="text-xs text-muted mb-3">
              Take a photo, pick from library, or attach a TXT/PDF file. Optional if you include a message.
            </p>
            <input
              ref={photoInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAddFiles}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,text/plain,.txt"
              className="hidden"
              onChange={handleAddDocumentFiles}
            />
            <input
              ref={cameraFallbackInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleAddFiles}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={attachmentDisabled}
                onClick={openCamera}
                className={attachBtnClass}
              >
                Camera
              </button>
              <button
                type="button"
                disabled={attachmentDisabled}
                onClick={() => clickFileInput(photoInputRef)}
                className={attachBtnClass}
              >
                Photos
              </button>
              <button
                type="button"
                disabled={attachmentDisabled}
                onClick={() => clickFileInput(fileInputRef)}
                className={attachBtnClass}
              >
                File
              </button>
              {isUploadingAttachment ? (
                <span className="text-xs self-center text-muted">
                  Uploading…
                </span>
              ) : null}
            </div>
            {attachments.length > 0 ? (
              <div className="mt-3 space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.url}
                    className="flex items-center gap-3 rounded-lg border border-card bg-primary/30 p-3"
                  >
                    {isAnnouncementImageMime(attachment.mime_type) ? (
                      <img
                        src={attachment.url}
                        alt={attachment.file_name}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <span
                        className="w-12 h-12 rounded flex items-center justify-center text-xs font-semibold flex-shrink-0 bg-gold/10 text-gold-strong"
                        aria-hidden
                      >
                        {getAnnouncementDocumentLabel(attachment.mime_type)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate text-primary">{attachment.file_name}</p>
                      <p className="text-xs text-muted">
                        {formatAttachmentSize(attachment.size_bytes)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.url)}
                      className="text-sm px-2 text-muted hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <p className="text-sm text-secondary mb-2">Audience</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {AUDIENCE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setAudience(option.id)}
                className={chipClass(audience === option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {showStaffTargeting && (
            <div className="rounded-xl border border-card bg-primary/20 p-4 mb-4">
              <p className="text-sm font-medium text-gold-strong mb-3">Staff targeting</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {STAFF_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleStaffModeChange(option.id)}
                    className={chipClass(staffTargetMode === option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {staffTargetMode !== 'all' && (
                <>
                  <input
                    type="search"
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Search by name or role..."
                    className="w-full rounded-lg border border-input bg-input px-3 py-2 mb-3 text-sm text-primary placeholder-text-muted"
                  />
                  {staffLoading ? (
                    <p className="text-sm text-muted">Loading staff...</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-card">
                      {filteredStaff.map((member) => {
                        const checked = staffProfileIds.includes(member.id);
                        const isExcludeMode = staffTargetMode === 'exclude';
                        const rowChecked = isExcludeMode ? !checked : checked;
                        return (
                          <label
                            key={member.id}
                            className="flex items-center gap-3 px-3 py-2 text-sm border-b border-light last:border-b-0 cursor-pointer hover:bg-gold/5 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={rowChecked}
                              onChange={() => handleStaffToggle(member.id)}
                              className="accent-gold"
                            />
                            <span className="flex-1 text-primary">{member.full_name || 'Unnamed'}</span>
                            <span className="text-muted">
                              {formatStaffRoleLabel(member.role)}
                            </span>
                          </label>
                        );
                      })}
                      {filteredStaff.length === 0 && (
                        <p className="px-3 py-4 text-sm text-muted">No staff match your search.</p>
                      )}
                    </div>
                  )}
                  {staffTargetMode === 'exclude' && (
                    <p className="text-xs text-muted mt-2">
                      Uncheck staff to exclude them from this announcement.
                    </p>
                  )}
                </>
              )}
              {staffValidationError && (
                <p className="text-sm text-red-300 mt-2">{staffValidationError}</p>
              )}
            </div>
          )}

          <p className="text-sm text-secondary mb-4">
            {estimateLoading ? 'Calculating recipients...' : (
              <>Will reach {formatRecipientPreview(audience, displayEstimate)}</>
            )}
          </p>
          {recipientValidationError ? (
            <p className="text-sm text-red-300 mb-4">{recipientValidationError}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!canSend}
              onClick={() => setShowConfirm(true)}
              className={clsx(
                'rounded-xl px-5 py-2.5 text-sm font-medium transition-colors',
                canSend
                  ? 'bg-gold text-charcoal hover:bg-gold/90'
                  : 'bg-gold/20 text-muted cursor-not-allowed',
              )}
            >
              {isSending || isDelivering ? 'Sending...' : 'Send announcement'}
            </button>
            {sendSuccess ? (
              <p className="text-sm text-gold-strong">{sendSuccess}</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-card bg-secondary p-5">
          <h2 className="font-heading text-lg text-gold-strong mb-4">Past announcements</h2>
          {isLoadingHistory && announcements.length === 0 ? (
            <p className="text-sm text-muted">Loading history...</p>
          ) : announcements.length === 0 ? (
            <div className="rounded-xl border border-card bg-primary/20 p-12 text-center">
              <p className="text-secondary text-sm">No announcements sent yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyPagination.pageRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-card bg-primary/20 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-heading text-primary">{row.title}</p>
                      <p className="text-xs mt-1 text-muted">
                        {new Date(row.created_at).toLocaleString()}
                        {' · '}
                        {row.created_by_name}
                        {' · '}
                        {audienceLabel(row.audience)}
                        {(row.audience === 'staff' || row.audience === 'both') && (
                          <> · {formatStaffTargetingSummary(row.staff_target_mode, row.staff_profile_count)}</>
                        )}
                      </p>
                    </div>
                    <span className={clsx('text-xs px-2 py-1 rounded border capitalize', statusClass(row.status))}>
                      {row.status}
                    </span>
                  </div>
                  {row.body ? (
                    <p className="text-sm text-secondary">{row.body}</p>
                  ) : null}
                  {row.attachments?.length > 0 ? (
                    <AnnouncementAttachmentsList attachments={row.attachments} compact className="mt-3" />
                  ) : null}
                  <p className="text-xs mt-2 text-muted">
                    {row.recipient_count} recipient{row.recipient_count === 1 ? '' : 's'}
                    {row.error_message ? ` · ${row.error_message}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
          <ListPagination pagination={historyPagination} onPageChange={setHistoryPage} className="mt-4" />
        </section>
          </>
        )}
        </div>
      </div>

      <WebCameraCapture
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
        theme={theme}
      />

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-card bg-modal p-6">
            <h3 className="font-heading text-lg text-gold-strong mb-2">Send announcement?</h3>
            <p className="text-sm text-secondary mb-6">
              Send to {formatRecipientPreview(audience, displayEstimate)}? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isSending}
                className="px-4 py-2 rounded-xl text-sm border border-card text-secondary hover:border-theme transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gold text-charcoal hover:bg-gold/90 disabled:opacity-50 transition-colors"
              >
                {isSending ? 'Sending...' : 'Confirm send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
