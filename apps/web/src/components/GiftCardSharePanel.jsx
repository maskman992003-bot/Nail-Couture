import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import clsx from 'clsx';
import { buildGiftCardClaimUrl } from '@nail-couture/shared/utils/giftCards';
import { formatPhone } from '@nail-couture/shared/utils/roleLabels';
import { copyTextToClipboard } from '@nail-couture/shared/utils/customerStats';

export default function GiftCardSharePanel({
  claimToken,
  amount,
  recipientName,
  pendingRecipientPhone,
  isDark = false,
  compact = false,
}) {
  const barcodeRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const claimUrl = buildGiftCardClaimUrl(window.location.origin, claimToken);

  useEffect(() => {
    if (!barcodeRef.current || !claimUrl) return;
    try {
      JsBarcode(barcodeRef.current, claimUrl, {
        format: 'CODE128',
        width: 1.5,
        height: compact ? 48 : 64,
        displayValue: false,
        margin: 8,
        lineColor: isDark ? '#C5A059' : '#2d2d2d',
      });
    } catch {
      // Barcode render is best-effort
    }
  }, [claimUrl, compact, isDark]);

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(claimUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!claimToken) return null;

  const cardClass = clsx(
    'border rounded-xl',
    compact ? 'p-4' : 'p-6',
    isDark ? 'bg-offwhite/5 border-gold/20' : 'bg-charcoal/5 border-gold/30',
  );
  const mutedClass = isDark ? 'text-offwhite/60' : 'text-charcoal/60';
  const recipientPhone = formatPhone(pendingRecipientPhone);
  const recipientLabel = recipientName?.trim() || recipientPhone;

  return (
    <div className={cardClass}>
      <h3 className="font-heading text-gold text-lg mb-1">Share with your friend</h3>
      <p className={clsx('text-sm mb-4', mutedClass)}>
        Send this link to {recipientLabel}. They must register with phone{' '}
        <span className="text-gold font-medium">{recipientPhone}</span> to claim
        {amount != null ? ` this $${Number(amount).toFixed(0)} gift card` : ''}.
      </p>

      <div className="flex flex-col items-center gap-4">
        <QRCodeSVG value={claimUrl} size={compact ? 140 : 168} fgColor="#C5A059" bgColor="transparent" />
        <svg ref={barcodeRef} className="max-w-full" aria-hidden />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="w-full py-2.5 rounded-lg bg-gold text-charcoal text-sm font-medium hover:bg-gold/90 transition-colors"
        >
          {copied ? 'Link copied!' : 'Copy claim link'}
        </button>
      </div>
    </div>
  );
}
