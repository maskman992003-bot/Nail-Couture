import { useState, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { buildAppointmentPriceDisplay } from '@nail-couture/shared/utils/appointmentHelpers';
import { resolveReceiptTotals } from '@nail-couture/shared/utils/customerStats';
import {
  loadVisitServiceSummary,
  sumLineItems,
} from '@nail-couture/shared/utils/appointmentServiceHistory';

function formatDiscountLabel({ discountType, loyaltyLabel }) {
  if (discountType === 'loyalty' || loyaltyLabel) {
    return loyaltyLabel ? `Loyalty — ${loyaltyLabel}` : 'Loyalty deduction';
  }
  if (discountType === 'percentage') return 'Discount (%)';
  if (discountType === 'coupon') return 'Coupon discount';
  return 'Discount';
}

export default function AppointmentPriceBreakdown({
  appointment,
  payment = null,
  loading = false,
  className,
}) {
  const [catalogSubtotal, setCatalogSubtotal] = useState(null);
  const [servicesLoading, setServicesLoading] = useState(false);

  useEffect(() => {
    if (!appointment?.id) {
      setCatalogSubtotal(null);
      setServicesLoading(false);
      return undefined;
    }

    let cancelled = false;
    setServicesLoading(true);

    loadVisitServiceSummary(appointment)
      .then((summary) => {
        if (cancelled) return;
        const items = summary?.finalWithPrices;
        if (!items) {
          setCatalogSubtotal(null);
          return;
        }
        const total = sumLineItems(items.mainItems) + sumLineItems(items.addonItems);
        setCatalogSubtotal(total > 0 ? total : null);
      })
      .catch(() => {
        if (!cancelled) setCatalogSubtotal(null);
      })
      .finally(() => {
        if (!cancelled) setServicesLoading(false);
      });

    return () => { cancelled = true; };
  }, [appointment?.id]);

  const display = useMemo(
    () => buildAppointmentPriceDisplay(appointment, payment, resolveReceiptTotals, catalogSubtotal),
    [appointment, payment, catalogSubtotal],
  );

  if (!appointment) return null;

  const {
    serviceSubtotal,
    tip,
    discount,
    discountType,
    loyaltyLabel,
    giftCardAmount,
    visitTotal,
    amountDue,
    hasPayment,
  } = display;

  const isLoading = loading || servicesLoading;
  const showDetails = serviceSubtotal > 0 || tip > 0 || discount > 0 || giftCardAmount > 0;

  return (
    <div className={clsx('rounded-3xl border border-gold/30 bg-gold/10 p-5 text-right mt-4', className)}>
      {isLoading ? (
        <div className="text-secondary text-sm animate-pulse">Loading payment details…</div>
      ) : (
        <div className="space-y-2 text-sm">
          {showDetails && (
            <>
              {serviceSubtotal > 0 && (
                <div className="flex justify-between items-center gap-4">
                  <span className="text-secondary">Services & add-ons</span>
                  <span className="text-primary">${serviceSubtotal.toFixed(2)}</span>
                </div>
              )}
              {tip > 0 && (
                <div className="flex justify-between items-center gap-4">
                  <span className="text-secondary">Tip</span>
                  <span className="text-primary">${tip.toFixed(2)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between items-center gap-4 text-green-500">
                  <span>{formatDiscountLabel({ discountType, loyaltyLabel })}</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              {giftCardAmount > 0 && (
                <div className="flex justify-between items-center gap-4 text-gold">
                  <span>Gift card</span>
                  <span>-${giftCardAmount.toFixed(2)}</span>
                </div>
              )}
              {(giftCardAmount > 0 || tip > 0 || discount > 0) && serviceSubtotal > 0 && (
                <div className="flex justify-between items-center gap-4 pt-2 border-t border-gold/20">
                  <span className="text-secondary">Visit total</span>
                  <span className="text-primary">${visitTotal.toFixed(2)}</span>
                </div>
              )}
            </>
          )}
          <div className={clsx(showDetails && 'pt-2 border-t border-gold/20')}>
            <div className="text-secondary text-xs uppercase tracking-[0.2em] mb-2">
              {giftCardAmount > 0 ? 'Amount Due' : hasPayment ? 'Total Paid' : 'Total Final Price'}
            </div>
            <div className="text-3xl font-heading text-gold-strong">${amountDue.toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
