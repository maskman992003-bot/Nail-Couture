import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import emblaCarouselReact from 'embla-carousel-react'
import nail1 from '../assets/nail1.jpg'
import nail2 from '../assets/nail2.jpg'
import nail3 from '../assets/nail3.jpg'
import nail4 from '../assets/nail4.jpg'
import nail5 from '../assets/nail5.jpg'
import nail6 from '../assets/nail6.jpg'
import nail7 from '../assets/nail7.jpg'
import nail8 from '../assets/nail8.jpg'
import nail9 from '../assets/nail9.jpg'
import nail10 from '../assets/nail10.jpg'
import nail11 from '../assets/nail11.jpg'
import nail12 from '../assets/nail12.jpg'

const PARALLAX_FACTOR = 1.2

const bannerImages = [
  nail1, nail2, nail3, nail4, nail5, nail6,
  nail7, nail8, nail9, nail10, nail11, nail12,
]

const bannerHeadlines = [
  { top: 'Couture Nails. Expertly Tailored.', sub: 'Medical-grade precision meets artisan craftsmanship.' },
  { top: 'Russian Manicure Masters', sub: 'Trained in the finest traditions of nail couture.' },
  { top: 'Your Nails, Elevated', sub: 'Non-toxic products. Flawless results.' },
  { top: 'Where Art Meets Beauty', sub: 'Every set is a masterpiece, handcrafted for you.' },
  { top: 'Uncompromising Sterilization', sub: 'Medical-grade protocols for your peace of mind.' },
  { top: 'Bespoke Nail Art', sub: 'Intricate designs tailored to your vision.' },
  { top: 'Gel-X Extensions', sub: 'Seamless, durable, and effortlessly elegant.' },
  { top: 'Bridal Couture Collection', sub: 'Pearl accents, soft ombre, timeless elegance.' },
  { top: 'Minimalist Perfection', sub: 'Clean lines, negative space, sophisticated beauty.' },
  { top: 'Crystal Embellishments', sub: 'Hand-placed Swarovski crystals for maximum impact.' },
  { top: 'Nude Elegance', sub: 'Sophisticated tones with a subtle shimmer finish.' },
  { top: 'The Ultimate Nail Experience', sub: 'Step into luxury. Step into Nail Couture.' },
]

export default function BannerCarousel() {
  const navigate = useNavigate()
  const [emblaRef, emblaApi] = emblaCarouselReact({ loop: true, skipSnaps: false })
  const parallaxNodesRef = useRef([])
  const rootRef = useRef(null)

  const applyParallax = useCallback((api) => {
    if (!api) return
    const engine = api.internalEngine()
    const scrollProgress = api.scrollProgress()
    const loop = engine.options.loop
    const slideCount = engine.slideRegistry.length

    parallaxNodesRef.current.forEach((node, index) => {
      if (!node) return

      const realIndex = loop
        ? engine.index.resolveSlideToPlug(index)
        : index

      const scrollTarget = engine.scrollTarget
      const slideProgress = scrollTarget.determineScrollTarget(realIndex).progress || 0
      const diff = scrollProgress - slideProgress
      const transformOffset = diff * PARALLAX_FACTOR * 100

      node.style.transform = `translateX(${transformOffset}%)`
    })
  }, [])

  useEffect(() => {
    if (!emblaApi) return

    const onScroll = () => applyParallax(emblaApi)
    const onReInit = () => applyParallax(emblaApi)

    emblaApi.on('scroll', onScroll)
    emblaApi.on('reInit', onReInit)
    applyParallax(emblaApi)

    return () => {
      emblaApi.off('scroll', onScroll)
      emblaApi.off('reInit', onReInit)
    }
  }, [emblaApi, applyParallax])

  const handleExplore = () => {
    const el = document.getElementById('gallery')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const handleBook = () => {
    const el = document.getElementById('book')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative bg-charcoal overflow-hidden" style={{ height: '85vh' }}>
      <div className="absolute inset-0 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {bannerImages.map((img, index) => {
            const headline = bannerHeadlines[index] || bannerHeadlines[0]
            return (
              <div
                key={index}
                className="flex-[0_0_100%] relative h-full overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/60 to-charcoal/40 z-10" />
                <img
                  ref={(el) => { parallaxNodesRef.current[index] = el }}
                  src={img}
                  alt={`Nail Couture slide ${index + 1}`}
                  className="absolute inset-0 w-[130%] h-full object-cover will-change-transform transition-transform duration-100 ease-out"
                  style={{ left: '-15%' }}
                />
                <div className="relative z-20 h-full flex flex-col items-center justify-center px-8">
                  <div className="text-center max-w-2xl" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    <h2 className="font-heading text-offwhite text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-4 sm:mb-6 tracking-wide whitespace-nowrap">
                      {headline.top}
                    </h2>
                    <p className="text-offwhite/70 text-base sm:text-lg md:text-xl max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed">
                      {headline.sub}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={handleExplore}
                        className="px-6 sm:px-8 py-3 border-2 border-gold text-gold hover:bg-gold hover:text-charcoal transition-all tracking-wider text-sm sm:text-base"
                      >
                        EXPLORE THE LOOKBOOK
                      </button>
                      <button
                        onClick={() => navigate('/check-in')}
                        className="px-6 sm:px-8 py-3 bg-gold text-charcoal hover:bg-gold/90 transition-all tracking-wider text-sm sm:text-base"
                      >
                        CHECK IN
                      </button>
                      <button
                        onClick={handleBook}
                        className="px-6 sm:px-8 py-3 border-2 border-offwhite/30 text-offwhite hover:border-offwhite hover:text-offwhite transition-all tracking-wider text-sm sm:text-base"
                      >
                        REQUEST APPOINTMENT
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        {bannerImages.map((_, i) => (
          <div key={i} className="embla-dot w-2 h-2 rounded-full bg-offwhite/30 transition-all duration-300" />
        ))}
      </div>
    </section>
  )
}