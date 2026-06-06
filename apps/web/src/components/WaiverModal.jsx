import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export default function WaiverModal({ customerName, customerPhone, onConfirm, onCancel }) {
  const signaturePadRef = useRef(null);
  const [agreed, setAgreed] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const clearSignature = () => {
    signaturePadRef.current.clear();
    setHasSignature(false);
  };

  const handleEnd = () => {
    setHasSignature(!signaturePadRef.current.isEmpty());
  };

  const handleConfirm = () => {
    const signatureData = signaturePadRef.current.toDataURL();
    onConfirm({ agreed_to_terms: true, signature_image: signatureData });
  };

  const canConfirm = agreed && hasSignature;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[95vh] bg-primary rounded-2xl border border-theme flex flex-col overflow-hidden shadow-2xl animate-fade-in">
        <div className="p-4 sm:p-6 border-b border-card flex-shrink-0">
          <h2 className="font-heading text-2xl text-gold mb-1">NAIL COUTURE</h2>
          <p className="text-secondary text-sm">Terms & Conditions and Customer Waiver</p>
          <p className="text-secondary text-xs mt-1">Effective Date: June 1, 2026</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="space-y-3 text-sm text-secondary">
            <div>
              <p className="text-gold font-heading mb-1">1. Welcome & Agreement</p>
              <p>Welcome to Nail Couture (“we,” “us,” or “our”), located in Uptown New Orleans, Louisiana. By checking in, booking an appointment, or receiving any service at Nail Couture, you (“Customer,” “you,” or “your”) agree to the following Terms & Conditions and Waiver.</p>
            </div>

            <div>
              <p className="text-gold font-heading mb-1">2. Services Provided</p>
              <p>We offer professional nail care services including, but not limited to:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Manicures & Pedicures</li>
                <li>Gel polish, dip powder, acrylic, and gel-x extensions</li>
                <li>Nail art and custom designs</li>
                <li>Spa treatments and add-ons</li>
              </ul>
              <p className="mt-1">All services are performed by licensed nail technicians using professional-grade products.</p>
            </div>

            <div>
              <p className="text-gold font-heading mb-1">3. Health & Safety Disclosure</p>
              <p>You agree to disclose all relevant health information before your service, including but not limited to:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Pregnancy or breastfeeding</li>
                <li>Diabetes or circulatory conditions</li>
                <li>Skin conditions, infections, or open wounds</li>
                <li>Allergies (especially to acrylic, gel, adhesives, or fragrances)</li>
                <li>Recent surgery, injury, or medical treatments affecting hands or feet</li>
                <li>Any contagious conditions</li>
              </ul>
              <p className="mt-1">Failure to disclose this information may result in refusal of service and release of Nail Couture from any liability.</p>
            </div>

            <div>
              <p className="text-gold font-heading mb-1">4. Liability Waiver & Release</p>
              <p>You acknowledge and agree that:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Nail services involve the use of sharp tools, chemicals, and heat, which carry inherent risks including but not limited to cuts, infections, allergic reactions, skin irritation, and nail damage.</li>
                <li>Nail Couture and its employees shall not be liable for any injury, illness, allergic reaction, infection, or damage to nails, skin, or personal property arising from services received, except in cases of gross negligence or willful misconduct.</li>
                <li>You voluntarily assume all risks associated with the services.</li>
                <li>You release, waive, and forever discharge Nail Couture, its owners, employees, and agents from any and all claims, demands, or causes of action arising from your visit or services received.</li>
              </ul>
              <p className="mt-1">This waiver applies to you, your heirs, executors, and assigns.</p>
            </div>

            <div>
              <p className="text-gold font-heading mb-1">5. Cancellation & No-Show Policy</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Appointments must be canceled at least 24 hours in advance.</li>
                <li>Late cancellations (less than 24 hours) or no-shows will be charged 50% of the service total.</li>
                <li>We reserve the right to refuse future bookings to clients with repeated no-shows.</li>
              </ul>
            </div>

            <div>
              <p className="text-gold font-heading mb-1">6. Payment & Pricing</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Payment is due at the time of service.</li>
                <li>We accept cash, major credit/debit cards, and digital payments.</li>
                <li>Prices are subject to change. Current pricing is available at check-in or on our website.</li>
                <li>A 20% gratuity is appreciated but not required.</li>
              </ul>
            </div>

            <div>
              <p className="text-gold font-heading mb-1">7. Photography & Social Media</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>We may take photos or videos of your nails for our portfolio, website, or social media.</li>
                <li>By receiving services, you grant Nail Couture permission to use these images unless you opt out at check-in.</li>
                <li>You may not photograph or record other clients or staff without permission.</li>
              </ul>
            </div>

            <div>
              <p className="text-gold font-heading mb-1">8. Privacy</p>
              <p>We respect your privacy. Personal information collected is used only for appointment management, service records, and marketing (with your consent). We do not sell your information.</p>
            </div>

            <div>
              <p className="text-gold font-heading mb-1">9. Governing Law</p>
              <p>These Terms & Conditions shall be governed by and construed in accordance with the laws of the State of Louisiana. Any disputes shall be resolved in the courts of Orleans Parish, Louisiana.</p>
            </div>

            <div>
              <p className="text-gold font-heading mb-1">10. Acknowledgment & Signature</p>
              <p>By signing below (or checking in digitally), you confirm that:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>You have read, understood, and agree to all terms above.</li>
                <li>You have disclosed all relevant health information.</li>
                <li>You voluntarily accept the risks and release Nail Couture from liability.</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-card">
            <div className="flex items-start gap-3 mb-4">
              <input
                type="checkbox"
                id="agreement"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-light bg-transparent text-gold focus:ring-gold"
              />
              <label htmlFor="agreement" className="text-sm text-secondary">
                I have read, understood, and voluntarily agree to all terms and conditions, health disclosures, and liability waiver.
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-secondary text-sm font-medium">Please sign below:</p>
              <div className="border-2 border-light rounded-xl bg-secondary overflow-hidden">
                <SignatureCanvas
                  ref={signaturePadRef}
                  onEnd={handleEnd}
                  canvasProps={{
                    className: 'w-full h-40 sm:h-48 touch-none',
                    style: {
                      touchAction: 'none',
                      cursor: 'crosshair',
                      background: 'transparent'
                    }
                  }}
                  backgroundColor="transparent"
                  penColor="#C5A059"
                />
              </div>
              <button
                type="button"
                onClick={clearSignature}
                className="text-gold-strong/80 hover:text-gold-strong text-sm font-medium transition-colors"
              >
                Clear Signature
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-card flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-5 py-3 rounded-full border border-light text-secondary text-sm font-heading uppercase tracking-[0.24em] hover:border-theme hover:text-gold-strong transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 px-5 py-3 rounded-full bg-gold text-charcoal text-sm font-heading uppercase tracking-[0.24em] hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Check-In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
