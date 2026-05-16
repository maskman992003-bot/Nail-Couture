import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Services from './components/Services'
import BookingWizard from './components/BookingWizard'
import Lookbook from './components/Lookbook'
import AboutContact from './components/AboutContact'
import CheckIn from './components/CheckIn'
import BannerCarousel from './components/BannerCarousel'
import './index.css'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState('home')

  console.log('[App] rendering, path:', location.pathname, 'currentPage:', currentPage)

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

  const navigateTo = (page) => {
    if (page === 'check-in') {
      navigate('/check-in')
    } else {
      navigate('/')
      setCurrentPage(page)
    }
  }

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
    <div className={`min-h-screen flex flex-col relative ${currentPage === 'check-in' ? 'bg-charcoal' : 'bg-offwhite'}`}>
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
            <Lookbook />
            
            <section className="min-h-[70vh] sm:min-h-[80vh] bg-charcoal flex items-center justify-center relative overflow-hidden px-4 sm:px-6">
              <BannerCarousel />
            </section>
            
            <Services />
            
            <BookingWizard />
          </>
        )}

        {currentPage === 'about' && <AboutContact />}
        {currentPage === 'check-in' && <CheckIn onNavigate={setCurrentPage} />}
      </main>
      
      {currentPage !== 'check-in' && <Footer onNavigate={setCurrentPage} />}
    </div>
  )
}

export default App
