import { Link } from 'react-router-dom'
import { useAppTheme } from '../hooks/useAppTheme.js'
import BrandLogo from './BrandLogo.jsx'
import { SocialIcon } from './SocialIcons.jsx'
import { LANDING_CONTACT, LANDING_SOCIAL_LINKS } from '../themes/landingContent.js'

export default function Footer() {
  const { themeConfig } = useAppTheme()
  const linkClass = 'block hover:text-gold-strong transition-colors text-sm text-secondary'

  return (
    <footer className="border-t border-theme mt-auto bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
        <div>
          <div
            className="mb-4 flex w-fit items-center justify-center rounded-full p-1"
            style={{ boxShadow: `0 0 0 1px ${themeConfig.borderColor}` }}
          >
            <BrandLogo />
          </div>
          <p className="text-sm leading-relaxed text-secondary">
            {LANDING_CONTACT.address[0]}<br />
            {LANDING_CONTACT.address[1]}<br />
            <span className="text-gold-strong">{LANDING_CONTACT.phone}</span>
          </p>
        </div>
        
        <div>
          <h4 className="text-gold-strong text-sm tracking-wider mb-4">OUR GUARANTEE</h4>
          <p className="text-sm leading-relaxed text-secondary">
            Medical-grade sterilization, non-toxic products, and impeccable service. 
            Your safety and satisfaction are our couture commitment.
          </p>
        </div>
        
        <div>
          <h4 className="text-gold-strong text-sm tracking-wider mb-4">CONNECT</h4>
          <div className="space-y-3">
            {LANDING_SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 ${linkClass}`}
              >
                <SocialIcon label={link.label} className="w-5 h-5" />
                {link.shortLabel}
              </a>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="text-gold-strong text-sm tracking-wider mb-4">QUICK LINKS</h4>
          <div className="space-y-3">
            <Link to="/" className={linkClass}>Home</Link>
            <Link to="/about" className={linkClass}>About</Link>
            <Link to="/services" className={linkClass}>Services</Link>
          </div>
        </div>
      </div>
      
      <div className="border-t border-theme py-6 text-center text-sm text-muted">
        <p>&copy; {new Date().getFullYear()} Nail Couture. All rights reserved.</p>
      </div>
    </footer>
  )
}
