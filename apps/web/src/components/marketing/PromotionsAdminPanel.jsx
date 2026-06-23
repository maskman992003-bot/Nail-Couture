import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import PromoSlideIn from './PromoSlideIn';
import PromoDetailModal from './PromoDetailModal';
import { usePromotionsAdmin } from '@nail-couture/shared/hooks/usePromotions.js';
import {
  formatPromotionAudience,
  formatPromotionKind,
  formatPromotionSurfaces,
  formatPromotionValidity,
  canHaveActivePromotion,
  getActivePromotionLimitMessage,
} from '@nail-couture/shared/utils/promotions.js';
import ListPagination from '../ListPagination.jsx';

const KIND_OPTIONS = [
  { id: 'first_visit', label: 'First visit' },
  { id: 'seasonal', label: 'Seasonal' },
  { id: 'general', label: 'General' },
];

const AUDIENCE_OPTIONS = [
  { id: 'all', label: 'Everyone' },
  { id: 'customers', label: 'Customers' },
  { id: 'first_visit_only', label: 'First visit only' },
];

const SURFACE_OPTIONS = [
  { id: 'public_home', label: 'Public home' },
  { id: 'customer_home', label: 'Customer home' },
];

const LIST_PAGE_SIZE = 5;

function defaultDatetimeLocal(daysFromNow = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createEmptyForm() {
  return {
    id: null,
    slug: '',
    kind: 'seasonal',
    title: '',
    subtitle: '',
    body: '',
    promo_code: '',
    discount_label: '',
    cta_label: 'Copy code',
    cta_action: 'copy_code',
    cta_url: '',
    display_surfaces: ['public_home'],
    audience: 'all',
    starts_at: defaultDatetimeLocal(0),
    ends_at: defaultDatetimeLocal(30),
    is_active: true,
    sort_order: 0,
    show_slide_in: false,
    show_shimmer_cta: true,
    slide_in_auto_hide_seconds: '',
    suppress_after_dismiss: false,
    suppress_after_copy: false,
  };
}

const EMPTY_FORM = createEmptyForm();

function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocal(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function PromotionsAdminPanel({ userPhone, userRole }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [previewDetailOpen, setPreviewDetailOpen] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [listPage, setListPage] = useState(1);

  const {
    promotions,
    loading,
    saving,
    error,
    setError,
    save,
    setActive,
    remove,
  } = usePromotionsAdmin(userPhone, userRole);

  const previewPromos = useMemo(() => ([{
    id: form.id || 'preview',
    title: form.title || 'Promotion title',
    subtitle: form.subtitle || null,
    body: form.body || 'Promotion details appear here.',
    discount_label: form.discount_label || '',
    promo_code: form.promo_code || 'CODE',
    cta_label: form.cta_label || 'Copy code',
    show_shimmer_cta: Boolean(form.show_shimmer_cta),
    slide_in_auto_hide_seconds: form.slide_in_auto_hide_seconds
      ? Number(form.slide_in_auto_hide_seconds)
      : null,
  }]), [form]);

  const filteredPromotions = useMemo(() => {
    const term = listSearch.trim().toLowerCase();
    if (!term) return promotions;

    return promotions.filter((promo) => {
      const haystack = [promo.title, promo.slug, promo.promo_code]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [promotions, listSearch]);

  const totalListPages = Math.max(1, Math.ceil(filteredPromotions.length / LIST_PAGE_SIZE));

  useEffect(() => {
    setListPage((page) => Math.min(page, totalListPages));
  }, [totalListPages]);

  const paginatedPromotions = useMemo(() => {
    const start = (listPage - 1) * LIST_PAGE_SIZE;
    return filteredPromotions.slice(start, start + LIST_PAGE_SIZE);
  }, [filteredPromotions, listPage]);

  const inputClass = clsx(
    'w-full rounded-xl border px-4 py-2.5 text-sm bg-input border-card text-primary',
  );

  const chipClass = (active) => clsx(
    'px-3 py-1.5 rounded-xl text-sm border transition-colors',
    active ? 'bg-gold/10 border-theme text-gold-strong' : 'border-card text-secondary hover:border-theme',
  );

  const loadPromotion = (promo) => {
    setForm({
      id: promo.id,
      slug: promo.slug || '',
      kind: promo.kind || 'general',
      title: promo.title || '',
      subtitle: promo.subtitle || '',
      body: promo.body || '',
      promo_code: promo.promo_code || '',
      discount_label: promo.discount_label || '',
      cta_label: promo.cta_label || 'Copy code',
      cta_action: promo.cta_action || 'copy_code',
      cta_url: promo.cta_url || '',
      display_surfaces: promo.display_surfaces || ['public_home'],
      audience: promo.audience || 'all',
      starts_at: toDatetimeLocal(promo.starts_at),
      ends_at: toDatetimeLocal(promo.ends_at),
      is_active: promo.is_active !== false,
      sort_order: promo.sort_order ?? 0,
      show_slide_in: Boolean(promo.show_slide_in),
      show_shimmer_cta: Boolean(promo.show_shimmer_cta),
      slide_in_auto_hide_seconds: promo.slide_in_auto_hide_seconds
        ? String(promo.slide_in_auto_hide_seconds)
        : '',
      suppress_after_dismiss: Boolean(promo.suppress_after_dismiss),
      suppress_after_copy: Boolean(promo.suppress_after_copy),
    });
    setSaveFeedback(null);
    setError('');
  };

  const toggleSurface = (surfaceId) => {
    setForm((prev) => {
      const surfaces = new Set(prev.display_surfaces || []);
      if (surfaces.has(surfaceId)) surfaces.delete(surfaceId);
      else surfaces.add(surfaceId);
      return { ...prev, display_surfaces: [...surfaces] };
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaveFeedback(null);
    setError('');

    if (!form.slug.trim() || !form.title.trim()) {
      setSaveFeedback({ type: 'error', text: 'Slug and title are required.' });
      return;
    }
    if (!form.display_surfaces?.length) {
      setSaveFeedback({ type: 'error', text: 'Select at least one display surface.' });
      return;
    }
    if (!form.starts_at.trim()) {
      setSaveFeedback({ type: 'error', text: 'Start date and time are required.' });
      return;
    }
    if (!form.ends_at.trim()) {
      setSaveFeedback({ type: 'error', text: 'End date and time are required.' });
      return;
    }

    const startsAt = fromDatetimeLocal(form.starts_at);
    const endsAt = fromDatetimeLocal(form.ends_at);
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setSaveFeedback({ type: 'error', text: 'End date must be after the start date.' });
      return;
    }

    if (form.is_active && !canHaveActivePromotion(
      promotions,
      { audience: form.audience, starts_at: startsAt, ends_at: endsAt },
      form.id,
    )) {
      setSaveFeedback({ type: 'error', text: getActivePromotionLimitMessage(form.audience) });
      return;
    }

    const saved = await save({
      ...form,
      slide_in_auto_hide_seconds: form.slide_in_auto_hide_seconds
        ? Number(form.slide_in_auto_hide_seconds)
        : null,
      starts_at: startsAt,
      ends_at: endsAt,
    });

    if (saved) {
      setSaveFeedback({ type: 'success', text: 'Promotion saved.' });
      loadPromotion(saved);
    }
  };

  const handleNew = () => {
    setForm(createEmptyForm());
    setSaveFeedback(null);
    setError('');
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete?.id) return;
    const deleted = await remove(pendingDelete.id);
    if (deleted) {
      setSaveFeedback({ type: 'success', text: `Deleted "${pendingDelete.title}".` });
      if (form.id === pendingDelete.id) {
        handleNew();
      }
    }
    setPendingDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-card p-6 bg-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-xl text-gold">{form.id ? 'Edit promotion' : 'New promotion'}</h2>
            <button type="button" onClick={handleNew} className="text-sm text-secondary hover:text-gold">New</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-secondary">Slug</span>
              <input className={inputClass} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="summer-2026" />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-secondary">Promo code</span>
              <input className={inputClass} value={form.promo_code} onChange={(e) => setForm({ ...form, promo_code: e.target.value.toUpperCase() })} />
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-xs uppercase tracking-wider text-secondary">Title</span>
            <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>

          <label className="space-y-1 block">
            <span className="text-xs uppercase tracking-wider text-secondary">Subtitle</span>
            <input className={inputClass} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          </label>

          <label className="space-y-1 block">
            <span className="text-xs uppercase tracking-wider text-secondary">Body</span>
            <textarea className={clsx(inputClass, 'min-h-[96px]')} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </label>

          <label className="space-y-1 block">
            <span className="text-xs uppercase tracking-wider text-secondary">Discount label</span>
            <input className={inputClass} value={form.discount_label} onChange={(e) => setForm({ ...form, discount_label: e.target.value })} placeholder="15% off your first visit" />
          </label>

          <div>
            <span className="text-xs uppercase tracking-wider text-secondary">Category</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {KIND_OPTIONS.map((option) => (
                <button key={option.id} type="button" className={chipClass(form.kind === option.id)} onClick={() => setForm({ ...form, kind: option.id })}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider text-secondary">Audience</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {AUDIENCE_OPTIONS.map((option) => (
                <button key={option.id} type="button" className={chipClass(form.audience === option.id)} onClick={() => setForm({ ...form, audience: option.id })}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider text-secondary">Display surfaces</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {SURFACE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={chipClass(form.display_surfaces?.includes(option.id))}
                  onClick={() => toggleSurface(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-secondary">Starts</span>
              <input type="datetime-local" required className={inputClass} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-secondary">Ends</span>
              <input type="datetime-local" required className={inputClass} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-xs uppercase tracking-wider text-secondary">Auto-hide compact chip (seconds)</span>
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.slide_in_auto_hide_seconds}
              onChange={(e) => setForm({ ...form, slide_in_auto_hide_seconds: e.target.value })}
              placeholder="0 = until user closes it"
            />
          </label>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.show_shimmer_cta} onChange={(e) => setForm({ ...form, show_shimmer_cta: e.target.checked })} />
              Shimmer card
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-charcoal hover:bg-gold/90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save promotion'}
            </button>
            {saveFeedback ? (
              <span className={clsx('text-sm', saveFeedback.type === 'success' ? 'text-gold' : 'text-red-300')}>
                {saveFeedback.text}
              </span>
            ) : null}
            {!saveFeedback && error ? (
              <span className="text-sm text-red-300">{error}</span>
            ) : null}
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-2xl border border-card p-4 bg-card">
            <h2 className="font-heading text-lg text-gold mb-4">Preview</h2>
            <p className="text-xs text-secondary mb-4">Compact slide-in chip (tap to preview full offer)</p>
            <div className="relative flex min-h-[120px] sm:min-h-[140px] items-center justify-center rounded-xl bg-charcoal/40 overflow-hidden p-4">
              <PromoSlideIn
                promo={previewPromos[0]}
                visible
                preview
                detailOpen={previewDetailOpen}
                onOpenDetail={() => setPreviewDetailOpen(true)}
                onAutoHide={() => {}}
              />
            </div>
            {previewDetailOpen ? (
              <PromoDetailModal
                promo={previewPromos[0]}
                preview
                onClose={() => setPreviewDetailOpen(false)}
              />
            ) : null}
          </div>

          <div className="rounded-2xl border border-card p-4 bg-card">
            <h2 className="font-heading text-lg text-gold mb-4">All promotions</h2>

            <label className="space-y-1 block mb-4">
              <span className="text-xs uppercase tracking-wider text-secondary">Search</span>
              <input
                type="search"
                value={listSearch}
                onChange={(e) => {
                  setListSearch(e.target.value);
                  setListPage(1);
                }}
                placeholder="Title, slug, or promo code"
                className={inputClass}
              />
            </label>

            {loading ? <div className="text-secondary animate-pulse">Loading…</div> : null}
            {!loading && filteredPromotions.length === 0 ? (
              <p className="text-sm text-secondary">No promotions match your current filters.</p>
            ) : null}
            <div className="space-y-3">
              {paginatedPromotions.map((promo) => {
                const activationBlocked = !promo.is_active
                  && !canHaveActivePromotion(promotions, promo, promo.id);

                return (
                <div key={promo.id} className="rounded-xl border border-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-gold">{promo.title}</span>
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full border', promo.is_active ? 'border-gold/30 text-gold' : 'border-card text-secondary')}>
                        {promo.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-secondary mt-1">
                      {formatPromotionKind(promo.kind)} · {formatPromotionAudience(promo.audience)} · {formatPromotionSurfaces(promo.display_surfaces)}
                    </p>
                    <p className="text-xs text-gold mt-1">{formatPromotionValidity(promo.starts_at, promo.ends_at)}</p>
                    <p className="text-xs text-secondary font-mono">{promo.promo_code}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => loadPromotion(promo)} className="px-3 py-1.5 rounded-lg border border-card text-sm hover:border-gold/40">Edit</button>
                    <button
                      type="button"
                      onClick={() => {
                        setSaveFeedback(null);
                        setActive(promo.id, !promo.is_active);
                      }}
                      disabled={saving || activationBlocked}
                      title={activationBlocked ? getActivePromotionLimitMessage(promo.audience) : undefined}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg border border-card text-sm hover:border-gold/40',
                        activationBlocked && 'opacity-50 cursor-not-allowed hover:border-card',
                      )}
                    >
                      {promo.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(promo)}
                      className="px-3 py-1.5 rounded-lg border border-red-400/30 text-sm text-red-300 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
            {!loading && filteredPromotions.length > LIST_PAGE_SIZE ? (
              <ListPagination
                pagination={{ currentPage: listPage, totalPages: totalListPages }}
                onPageChange={setListPage}
                className="mt-3"
              />
            ) : null}
          </div>
        </div>
      </div>

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-card bg-modal p-6">
            <h3 className="font-heading text-lg text-gold-strong mb-2">Delete promotion?</h3>
            <p className="text-sm text-secondary mb-2">
              Remove <span className="text-primary font-medium">{pendingDelete.title}</span> permanently?
            </p>
            <p className="text-sm text-secondary mb-6">
              Code <span className="font-mono text-gold">{pendingDelete.promo_code}</span> will stop appearing on home screens. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm border border-card text-secondary hover:border-theme transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Deleting…' : 'Delete promotion'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
