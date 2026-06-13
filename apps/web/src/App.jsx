import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { featureFlags } from './constants/featureFlags'
import { useTheme } from './contexts/ThemeContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Services from './components/Services'
import BookingWizard from './components/BookingWizard'
import Lookbook from './components/Lookbook'
import AboutContact from './components/AboutContact'
import CheckIn from './components/CheckIn'
import PageHelmet from './components/PageHelmet'
import { APP_PAGE_SEO } from './constants/pageSeo'
import './index.css'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [currentPage, setCurrentPage] = useState('home')

  useEffect(() => {
    const path = location.pathname.replace('/', '')
    if (path === 'check-in') {
      setCurrentPage('check-in')
    } else if (path === 'about') {
      setCurrentPage('about')
    } else {
      setCurrentPage('home')
    }
  }, [location])

  const bookingEnabled = featureFlags.customer.onlineBooking || featureFlags.customer.onlineCalendarBooking;

  const scrollToBooking = () => {
    if (bookingEnabled) {
      setCurrentPage('home')
      setTimeout(() => {
        const element = document.getElementById('book')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
      return
    }

    navigate('/about')
    setCurrentPage('about')
    setTimeout(() => {
      const element = document.getElementById('contact')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }, 200)
  }

  const scrollToLookbook = () => {
    setCurrentPage('home')
    setTimeout(() => {
      const element = document.getElementById('gallery')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  const pageSeo = APP_PAGE_SEO[location.pathname] ?? APP_PAGE_SEO['/']

  return (
    <>
      <PageHelmet title={pageSeo.title} description={pageSeo.description} path={pageSeo.path} />
    <div className="min-h-screen flex flex-col relative">
      <img 
        src="/NC.jfif.png" 
        alt="" 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] opacity-10 pointer-events-none z-50"
        style={{ maxWidth: '600px' }}
      />
      {currentPage !== 'check-in' && <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />}
      
      <main className="flex-1 relative z-10">
        {currentPage === 'home' && (
          <>
            <section className={`min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center relative overflow-hidden px-4 sm:px-6 ${theme === 'dark' ? 'bg-charcoal' : 'bg-cream'}`}>
              <div className={`absolute inset-0 bg-gradient-to-b ${theme === 'dark' ? 'from-charcoal via-charcoal/95 to-charcoal' : 'from-cream via-cream/95 to-cream'}`} />
              <div className="text-center z-10 max-w-4xl mx-auto">
                <div className={`inline-flex items-center justify-center gap-2 mb-8 rounded-full border border-gold/20 px-4 py-2 text-[11px] uppercase tracking-[0.32em] text-gold font-semibold ${theme === 'dark' ? 'bg-white/5' : 'bg-gold/5'}`}>
                  <span className="h-2.5 w-2.5 rounded-full bg-gold shadow-lg shadow-gold/30" />
                  FLAWLESS MEDICAL-GRADE STERILIZATION
                </div>
                <h1 className={`font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-5 sm:mb-7 tracking-wide ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>
                  Luxury Press-On Nails
                  <span className="block text-gold mt-3">Custom Nail Art, Expertly Tailored.</span>
                </h1>
                <p className={`text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${theme === 'dark' ? 'text-offwhite/70' : 'text-charcoal/70'}`}>
                  Discover custom nail art and luxury press-on nails crafted with Russian manicure precision.
                  Medical-grade sterilization, non-toxic products, and artisans trained in the finest traditions of nail couture.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <button
                    onClick={scrollToLookbook}
                    className={`group flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] transition duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] animate-fade-in ${theme === 'dark' ? 'border-white/10 bg-white/5 text-offwhite hover:border-gold hover:bg-gold/10 hover:text-gold' : 'border-charcoal/20 bg-charcoal/5 text-charcoal hover:border-gold hover:bg-gold/10 hover:text-gold'}`}
                  >
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-gold transition duration-200 ease-out group-hover:-translate-y-1 ${theme === 'dark' ? 'border-white/10 bg-white/5 group-hover:border-gold group-hover:bg-gold/10' : 'border-charcoal/20 bg-charcoal/5 group-hover:border-gold group-hover:bg-gold/10'}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M6 4h12v16H6z" />
                        <path d="M6 8h12" />
                        <path d="M9 12h6" />
                      </svg>
                    </span>
                    LOOKBOOK
                  </button>

                  <button
                    onClick={() => navigate('/check-in')}
                    className="group relative flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-charcoal transition duration-200 ease-out hover:bg-gold/90 hover:-translate-y-0.5 hover:scale-[1.02] shadow-[0_0_40px_rgba(197,160,89,0.18)] animate-fade-in"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-charcoal text-gold shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition duration-200 ease-out group-hover:-translate-y-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </span>
                    CHECK IN
                  </button>

                  <button
                    onClick={scrollToBooking}
                    className={`group flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] transition duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] animate-fade-in ${theme === 'dark' ? 'border-white/10 bg-white/5 text-offwhite hover:border-gold hover:bg-gold/10 hover:text-gold' : 'border-charcoal/20 bg-charcoal/5 text-charcoal hover:border-gold hover:bg-gold/10 hover:text-gold'}`}
                  >
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-gold transition duration-200 ease-out group-hover:-translate-y-1 ${theme === 'dark' ? 'border-white/10 bg-white/5 group-hover:border-gold group-hover:bg-gold/10' : 'border-charcoal/20 bg-charcoal/5 group-hover:border-gold group-hover:bg-gold/10'}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <circle cx="12" cy="12" r="8" />
                        <path d="M12 8v4l3 2" />
                      </svg>
                    </span>
                    SALON INFO
                  </button>
                </div>
              </div>
            </section>
            <Lookbook />
            <Services />
            {bookingEnabled && <BookingWizard />}
          </>
        )}

        {currentPage === 'about' && <AboutContact />}
        {currentPage === 'check-in' && <CheckIn onNavigate={setCurrentPage} />}
      </main>
      
      {currentPage !== 'check-in' && <Footer onNavigate={setCurrentPage} />}
    </div>
    </>
  )
}

export default App
