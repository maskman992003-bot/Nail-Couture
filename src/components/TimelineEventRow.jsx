import clsx from 'clsx';

export const TIMELINE_ICONS = {
  visit: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  payment: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  waiver: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  note: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  loyalty: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  photo: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  service_change: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
};

export function formatTimelineDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatTimelineEventDisplay(event, profile, { customerDetail = false } = {}) {
  if (customerDetail) {
    switch (event.type) {
      case 'visit':
        return {
          title: event.title || 'Visit',
          subtitle: [event.subtitle, event.status].filter(Boolean).join(' · ') || null,
          body: null,
        };
      case 'payment':
        return {
          title: 'Payment',
          subtitle: event.subtitle || null,
          body: event.title && event.title !== 'Payment' ? event.title : null,
        };
      case 'loyalty':
        return {
          title: 'Loyalty',
          subtitle: event.subtitle || null,
          body: event.title || null,
        };
      default:
        return { title: event.title, subtitle: event.subtitle, body: event.body };
    }
  }

  const customer = event.customer || profile;
  if (!customer) {
    return { title: event.title, subtitle: event.subtitle, body: event.body };
  }

  const contact = [customer.phone, customer.email].filter(Boolean).join(' · ');
  const customerName = customer.full_name || 'Customer';

  if (event.type === 'visit' || event.type === 'payment') {
    return {
      title: customerName,
      subtitle: [contact, event.subtitle].filter(Boolean).join(' · ') || null,
      body: null,
    };
  }

  const detail = [event.title, event.subtitle, event.body].filter(Boolean).join(' · ');

  return {
    title: customerName,
    subtitle: contact || null,
    body: detail || null,
  };
}

export default function TimelineEventRow({
  event,
  profile,
  lazyImages = false,
  customerDetail = false,
  className,
}) {
  const display = formatTimelineEventDisplay(event, profile, { customerDetail });

  return (
    <div className={clsx('flex gap-3 p-3 bg-secondary rounded-lg border border-light', className)}>
      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TIMELINE_ICONS[event.type] || TIMELINE_ICONS.visit} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2">
          <div className="text-primary font-medium">{display.title}</div>
          {event.amount != null && (
            <div className="text-gold text-sm">${Number(event.amount).toFixed(2)}</div>
          )}
        </div>
        {display.subtitle && <div className="text-secondary text-sm">{display.subtitle}</div>}
        {display.body && <div className="text-primary/80 text-sm mt-1">{display.body}</div>}
        {event.status && (
          <span className="inline-block mt-1 text-xs uppercase tracking-wider text-secondary">{event.status}</span>
        )}
        {event.type === 'waiver' && event.meta?.signature_image && (
          <img
            src={event.meta.signature_image}
            alt="Signature"
            loading={lazyImages ? 'lazy' : undefined}
            className="mt-2 h-16 object-contain bg-white rounded border"
          />
        )}
        {event.type === 'photo' && event.meta?.photo_url && (
          <img
            src={event.meta.photo_url}
            alt=""
            loading={lazyImages ? 'lazy' : undefined}
            className="mt-2 h-24 object-cover rounded border border-light"
          />
        )}
        <div className="text-secondary text-xs mt-1">{formatTimelineDate(event.date)}</div>
      </div>
    </div>
  );
}
