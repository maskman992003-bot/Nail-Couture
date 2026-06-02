import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCoverflow } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-coverflow'

const galleryData = [
  { id: 1, category: 'Bridal', title: 'Pearl Rose Manicure', description: 'Delicate pink ombre with pearl accents, perfect for your special day.', service: 'Gel-X Extensions with Custom Art', price: '$150', image: '/lookbook/nail1.jpg' },
  { id: 2, category: 'Minimalist', title: 'Modern French', description: 'Clean lines and negative space design for the sophisticated minimalist.', service: 'Russian Manicure', price: '$80', image: '/lookbook/nail2.jpg' },
  { id: 3, category: 'Extravagant', title: 'Crystal Embellishment', description: 'Hand-placed crystals with gradient ombre for maximum impact.', service: 'Gel-X with Full Crystal Set', price: '$200', image: '/lookbook/nail3.jpg' },
  { id: 4, category: 'Bridal', title: 'Heart Pink Tips', description: 'Sweet heart-designed nails with pink and white accents.', service: 'Gel-X Extensions', price: '$120', image: '/lookbook/nail4.jpg' },
  { id: 5, category: 'Minimalist', title: 'Blue Ombre Elegance', description: 'Soft blue ombre gel manicure with elegant simplicity.', service: 'Signature Russian Manicure', price: '$80', image: '/lookbook/nail5.jpg' },
  { id: 6, category: 'Extravagant', title: 'Navy Gold Art', description: 'Ornate navy and gold nail art with glossy finishes.', service: 'Gel-X with Chrome Finish', price: '$140', image: '/lookbook/nail6.jpg' },
  { id: 7, category: 'Bridal', title: 'Pearl Luminance', description: 'Iridescent pearls with soft pink base for bridal beauty.', service: 'Gel-X with Pearl Add-on', price: '$135', image: '/lookbook/nail7.jpg' },
  { id: 8, category: 'Minimalist', title: 'Nude Elegance', description: 'Sophisticated nude tones with subtle shimmer finish.', service: 'Russian Manicure', price: '$85', image: '/lookbook/nail8.jpg' },
  { id: 9, category: 'Extravagant', title: '3D Flower Art', description: 'Sculpted 3D roses with Swarovski crystal centers.', service: 'Full Nail Art Set', price: '$250', image: '/lookbook/nail9.jpg' },
  { id: 10, category: 'Bridal', title: 'Rose Gold Glam', description: 'Elegant rose gold polish with delicate floral nail art.', service: 'Gel-X Extensions', price: '$145', image: '/lookbook/nail10.jpg' },
  { id: 11, category: 'Minimalist', title: 'Pastel Ombre', description: 'Subtle pastel gradient for everyday elegance.', service: 'Russian Manicure', price: '$75', image: '/lookbook/nail11.jpg' },
  { id: 12, category: 'Extravagant', title: 'Diamond Dust', description: 'Full coverage sparkle with crushed diamond effect.', service: 'Gel-X with Chrome Finish', price: '$180', image: '/lookbook/nail12.jpg' },
]

const categories = ['All', 'Bridal', 'Minimalist', 'Extravagant']

function Lightbox({ item, onClose }) {
  const scrollToBooking = () => {
    onClose()
    setTimeout(() => {
      const el = document.getElementById('book')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 300)
  }

  if (!item) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <button onClick={onClose} className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center text-offwhite/60 hover:text-offwhite transition-colors z-10">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="w-full max-w-6xl flex flex-col max-h-[min(90dvh,calc(100dvh-2rem))] bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-h-[90vh]">
        <div className="flex items-center justify-center bg-charcoal/50 p-4">
          <img src={item.image} alt={item.title} className="max-w-full max-h-[70vh] object-contain" />
        </div>
        <div className="flex flex-col justify-center text-offwhite p-4">
          <span className="text-gold text-sm tracking-widest uppercase mb-3">{item.category}</span>
          <h3 className="font-heading text-3xl md:text-4xl mb-4">{item.title}</h3>
          <p className="text-offwhite/70 leading-relaxed mb-6">{item.description}</p>
          <div className="py-6 border-y border-offwhite/10 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-offwhite/50">Recommended Service</span>
              <span className="text-offwhite">{item.service}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-offwhite/50">Starting Price</span>
              <span className="text-gold font-heading text-2xl">{item.price}</span>
            </div>
          </div>
          <button onClick={scrollToBooking} className="px-8 py-4 bg-gold text-charcoal hover:bg-gold/90 transition-all tracking-widest self-start">
            BOOK THIS LOOK
          </button>
        </div>
      </div>
    </div>
  </div>
    </div>
  )
}

export default function Lookbook() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedItem, setSelectedItem] = useState(null)

  const filteredItems = activeCategory === 'All'
    ? galleryData
    : galleryData.filter((item) => item.category === activeCategory)

  return (
    <section id="gallery" className="py-24 px-6 bg-offwhite">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-heading text-charcoal text-4xl md:text-5xl mb-4">Couture Lookbook</h2>
          <p className="text-charcoal/60">Inspiration for your next appointment</p>
        </div>

        <div className="flex justify-center gap-4 mb-12 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-full text-sm tracking-wider transition-all duration-200 ease-out ${
                activeCategory === category
                  ? 'bg-charcoal text-offwhite shadow-[0_0_20px_rgba(0,0,0,0.08)]'
                  : 'border border-charcoal/20 text-charcoal/60 hover:border-gold hover:text-gold hover:-translate-y-0.5 hover:scale-[1.02]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="relative">
          <Swiper
            effect="coverflow"
            grabCursor={true}
            centeredSlides={true}
            slidesPerView="auto"
            loop={true}
            coverflowEffect={{
              rotate: 15,
              stretch: 0,
              depth: 100,
              modifier: 1,
              slideShadows: false,
            }}
            className="!pb-12"
          >
            {filteredItems.map((item) => (
              <SwiperSlide key={`lookbook-slide-${item.id}`} className="!w-[300px] md:!w-[380px] !h-[450px]">
                {({ isActive }) => (
                  <div
                    className="relative w-full h-full overflow-hidden cursor-pointer group"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="relative w-full h-full overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover select-none pointer-events-none"
                        draggable={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/20 to-transparent" />
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${item.id}-${isActive}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-transparent p-6 z-10"
                      >
                        <span className="text-gold text-xs tracking-widest uppercase">{item.category}</span>
                        <h4 className="text-offwhite font-heading text-xl mt-1">{item.title}</h4>
                        <p className="text-offwhite/60 text-sm mt-2 line-clamp-2">{item.description}</p>
                        <div className="mt-3 flex items-center gap-3">
                          <span className="text-gold font-heading text-lg">{item.price}</span>
                          <span className="text-offwhite/40 text-xs">{item.service}</span>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-gold/20 backdrop-blur-sm flex items-center justify-center">
                        <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      {selectedItem && (
        <Lightbox item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </section>
  )
}
