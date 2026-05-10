import { useState } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Services from './components/Services'
import BookingWizard from './components/BookingWizard'
import Lookbook from './components/Lookbook'
import AboutContact from './components/AboutContact'
import './index.css'

function App() {
  const [currentPage, setCurrentPage] = useState('home')

  const scrollToBooking = () => {
    setCurrentPage('home')
    setTimeout(() => {
      const element = document.getElementById('book')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
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

  return (
    <div className="min-h-screen bg-offwhite flex flex-col">
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      
      <main className="flex-1 -mt-16 relative z-10">
        {currentPage === 'home' && (
          <>
            <Lookbook />
            
            <section className="min-h-[70vh] sm:min-h-[80vh] bg-charcoal flex items-center justify-center relative overflow-hidden px-4 sm:px-6">
              <div className="absolute inset-0 bg-gradient-to-b from-charcoal via-charcoal/95 to-charcoal" />
              <div className="text-center z-10 max-w-3xl mx-auto">
                <h1 className="font-heading text-offwhite text-3xl sm:text-4xl md:text-5xl lg:text-7xl mb-4 sm:mb-6 tracking-wide">
                  Couture Nails. Expertly Tailored.
                </h1>
                <p className="text-offwhite/70 text-base sm:text-lg md:text-xl max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed">
                  Discover the precision of the Russian Manicure technique. Medical-grade sterilization, 
                  non-toxic products, and artisans trained in the finest traditions of nail couture.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={scrollToLookbook}
                    className="px-6 sm:px-8 py-3 border-2 border-gold text-gold hover:bg-gold hover:text-charcoal transition-all tracking-wider text-sm sm:text-base"
                  >
                    EXPLORE THE LOOKBOOK
                  </button>
                  <button 
                    onClick={scrollToBooking}
                    className="px-6 sm:px-8 py-3 bg-gold text-charcoal hover:bg-gold/90 transition-all tracking-wider text-sm sm:text-base"
                  >
                    REQUEST APPOINTMENT
                  </button>
                </div>
              </div>
            </section>
            
            <Services />
            
            <BookingWizard />
          </>
        )}

        {currentPage === 'about' && <AboutContact />}
      </main>
      
      <Footer onNavigate={setCurrentPage} />
    </div>
  )
}

export default App
