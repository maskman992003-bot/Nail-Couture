import AppModal, { modalBtnPrimary } from './AppModal.jsx';
import LocationMapEmbed from './LocationMapEmbed.jsx';
import { LANDING_CONTACT } from '../themes/landingContent.js';

export default function LocationMapModal({ open, onClose }) {
  const addressLine = `${LANDING_CONTACT.address[0]}, ${LANDING_CONTACT.address[1]}`;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Visit Our Salon"
      subtitle={addressLine}
      maxWidth="max-w-2xl"
      centered
      panelClassName="mx-auto"
      footer={
        <a
          href={LANDING_CONTACT.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={modalBtnPrimary}
        >
          Open in Google Maps
        </a>
      }
    >
      <div className="h-[min(42dvh,240px)] min-h-[180px] sm:h-[min(48dvh,320px)] md:h-[min(52dvh,380px)] overflow-hidden rounded-xl border border-light">
        <LocationMapEmbed className="h-full w-full" />
      </div>
    </AppModal>
  );
}
