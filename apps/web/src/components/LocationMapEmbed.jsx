import { LANDING_CONTACT } from '../themes/landingContent.js';

export default function LocationMapEmbed({ className = '' }) {
  return (
    <iframe
      src={LANDING_CONTACT.mapsEmbedUrl}
      width="100%"
      height="100%"
      style={{ border: 0 }}
      allowFullScreen=""
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      title="Nail Couture Location"
      className={className}
    />
  );
}
