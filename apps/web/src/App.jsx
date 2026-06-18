import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { featureFlags } from './constants/featureFlags'
import { useAppTheme } from './hooks/useAppTheme.js'
import { isClassicLanding } from './themes/themeUtils.js'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomeLanding from './components/marketing/HomeLanding'
import ClassicHomePage from './components/marketing/ClassicHomePage'
import AboutContact from './components/AboutContact'
import PageHelmet from './components/PageHelmet'
import { APP_PAGE_SEO } from './constants/pageSeo'
import { usePublicHomePromotions } from './hooks/usePublicHomePromotions'
import PromoSlideIn from './components/marketing/PromoSlideIn'
import PromoDetailModal from './components/marketing/PromoDetailModal'
import './index.css'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { themeConfig, isDark } = useAppTheme()
  const [currentPage, setCurrentPage] = useState('home')
  const classicHome = isClassicLanding(themeConfig)

  useEffect(() => {
    const path = location.pathname.replace('/', '')
    if (path === 'about') {
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

  const {
    enabled: promosEnabled,
    currentSlideInPromo,
    detailPromo,
    copyCode,
    advanceSlideInQueue,
    openSlideInDetail,
    closeSlideInDetail,
    toast: promoToast,
    error: promoError,
  } = usePublicHomePromotions({
    scrollToBooking,
  })

  const isMarketingHome = currentPage === 'home' && !classicHome
  const showChrome = !isMarketingHome
  const watermarkUrl = themeConfig.branding?.watermarkUrl ?? '/NC.jfif.png'

  return (
    <>
      <PageHelmet title={pageSeo.title} description={pageSeo.description} path={pageSeo.path} />
    <div className="min-h-screen flex flex-col relative transition-colors duration-300">
      {showChrome && classicHome && (
        <img
          src={watermarkUrl}
          alt=""
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] opacity-10 pointer-events-none z-50"
          style={{ maxWidth: '600px' }}
        />
      )}
      {showChrome && <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />}

      <main className="flex-1 relative z-10">
        {currentPage === 'home' && (
          classicHome ? (
            <ClassicHomePage
              onScrollToBooking={scrollToBooking}
              onScrollToLookbook={scrollToLookbook}
            />
          ) : (
            <HomeLanding />
          )
        )}
        {currentPage === 'about' && <AboutContact />}
      </main>

      {showChrome && <Footer />}

      {promosEnabled && currentSlideInPromo && !detailPromo ? (
        <PromoSlideIn
          promo={currentSlideInPromo}
          visible
          detailOpen={false}
          onOpenDetail={openSlideInDetail}
          onAutoHide={advanceSlideInQueue}
        />
      ) : null}
      {promosEnabled ? (
        <PromoDetailModal
          promo={detailPromo}
          onClose={closeSlideInDetail}
          onCopy={copyCode}
        />
      ) : null}

      {promoError && import.meta.env.DEV ? (
        <div
          role="status"
          className="fixed bottom-36 right-6 z-[70] max-w-sm rounded-xl bg-red-950 border border-red-400/40 px-4 py-2 text-sm text-red-200"
        >
          Promo load error: {promoError}
        </div>
      ) : null}
      {promoToast ? (
        <div
          role="status"
          className="fixed bottom-24 right-6 z-[70] rounded-xl border px-4 py-2 text-sm shadow-lg"
          style={
            classicHome || isDark
              ? { borderColor: 'rgba(197, 160, 89, 0.3)', backgroundColor: '#121212', color: '#C5A059' }
              : { borderColor: 'rgba(184, 142, 76, 0.3)', backgroundColor: '#FFFFFF', color: '#B88E4C' }
          }
        >
          {promoToast}
        </div>
      ) : null}
    </div>
    </>
  )
}

export default App
