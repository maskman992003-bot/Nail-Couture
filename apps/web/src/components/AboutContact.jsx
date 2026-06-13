import { useTheme } from '../contexts/ThemeContext'
import CustomerTestimonials from './marketing/CustomerTestimonials'

export default function AboutContact() {
  const sectionTitle = 'Get in Touch'
  const sectionDescription = 'We’re here to help. Reach out now to discuss availability and styling requests.'
  const { theme } = useTheme()

  return (
    <div className="flex-1">
      <section className={`py-16 sm:py-24 px-4 sm:px-6 ${theme === 'dark' ? 'bg-charcoal' : 'bg-cream'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`font-heading text-3xl sm:text-4xl md:text-5xl mb-6 ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>The Story of Nail Couture</h2>
          <p className={`text-lg leading-relaxed mb-8 ${theme === 'dark' ? 'text-offwhite/70' : 'text-charcoal/70'}`}>
            Born from a passion for precision and an unwavering commitment to excellence, Nail Couture 
            was founded on the principle that every client deserves an exceptional experience. Our artisans 
            undergo rigorous training in the Russian Manicure technique, mastering the art of cuticle 
            work and nail shaping that has been refined over decades in Eastern Europe.
          </p>
          <p className={`text-lg leading-relaxed ${theme === 'dark' ? 'text-offwhite/70' : 'text-charcoal/70'}`}>
            We believe in more than just beautiful nails. We believe in an elevated standard of hygiene, 
            using medical-grade sterilization equipment and exclusively non-toxic, vegan products. 
            Each visit to Nail Couture is a sanctuary moment—an escape from the ordinary, 
            crafted for the discerning individual.
          </p>
        </div>
      </section>

      <CustomerTestimonials showCta={false} className={theme === 'dark' ? 'bg-offwhite/[0.02]' : 'bg-white'} />

       <section id="contact" className={`py-16 sm:py-24 px-4 sm:px-6 ${theme === 'dark' ? 'bg-offwhite' : 'bg-cream'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h3 className={`font-heading text-2xl sm:text-3xl mb-4 ${theme === 'dark' ? 'text-charcoal' : 'text-charcoal'}`}>Visit Our Studio</h3>
            <div className="mx-auto mb-4 h-0.5 w-20 rounded-full bg-gold/70" />
            <p className="text-charcoal/60">By appointment only for your comfort and privacy</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <div className="h-full rounded-3xl bg-white border border-charcoal/10 p-6 sm:p-8 shadow-2xl shadow-black/5">
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-gold/20 bg-gold/5 px-4 py-2 text-sm uppercase tracking-[0.28em] text-gold font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-gold shadow-lg shadow-gold/30" />
                Contact Information
              </div>
              
              <div className="space-y-6">
                <div>
                  <div className="text-sm text-charcoal/50 tracking-wider uppercase mb-2">Address</div>
                  <p className="text-charcoal">5300 Tchoupitoulas St #32-34<br />New Orleans, LA 70115</p>
                </div>
                
                <div>
                  <div className="text-sm text-charcoal/50 tracking-wider uppercase mb-2">Phone</div>
                  <a href="tel:+15044817879" className="text-gold hover:text-gold/80 transition-colors">
                    504-481-7879
                  </a>
                </div>
                
                <div>
                  <div className="text-sm text-charcoal/50 tracking-wider uppercase mb-2">WhatsApp</div>
                  <a 
                    href="https://wa.me/15044817879" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gold hover:text-gold/80 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.296-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Chat with Us
                  </a>
                </div>
                
                <div>
                  <div className="text-sm text-charcoal/50 tracking-wider uppercase mb-2">Instagram</div>
                  <a 
                    href="https://www.instagram.com/nailcouturenola?igsh=MWRsYzR5c3dnaGVpbw%3D%3D&utm_source=qr" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gold hover:text-gold/80 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    @nailcouture
                  </a>
                </div>

                <div>
                  <div className="text-sm text-charcoal/50 tracking-wider uppercase mb-2">Facebook</div>
                  <a 
                    href="https://www.facebook.com/profile.php?id=61584007934987"
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gold hover:text-gold/80 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </a>
                </div>

                <div>
                  <div className="text-sm text-charcoal/50 tracking-wider uppercase mb-2">Hours</div>
                  <div className="text-charcoal text-sm">
                    <p>Tuesday - Saturday: 9:00 AM - 7:00 PM</p>
                    <p>Sunday & Monday: Closed</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-full flex flex-col gap-4">
              <div className="flex items-center justify-between rounded-full border border-charcoal/10 bg-white/90 px-4 py-2 text-sm uppercase tracking-[0.30em] text-charcoal/90 shadow-sm shadow-black/5 flex-shrink-0">
                <span>Map</span>
                <span className="text-gold font-semibold">New Orleans</span>
              </div>
              <div className="flex-1 min-h-[300px] overflow-hidden rounded-3xl bg-charcoal/5 border border-charcoal/10 shadow-2xl shadow-black/10">
                <iframe
                  src="https://www.google.com/maps?q=5300+Tchoupitoulas+St+%2332-34+New+Orleans+LA+70115&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Nail Couture Location"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
